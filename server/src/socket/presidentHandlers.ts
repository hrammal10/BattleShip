import { Server, Socket } from "socket.io";
import { GameState, PresidentId } from "../game/types";
import { BOARD_SIZE, CELL } from "../game/constants";
import { findValidShipPlacement, processShot, checkAllShipsSunk } from "../game/gameLogic";
import { GameService } from "../services/GameService";
import { blockchain } from "../services/BlockchainService";
import { gameStore } from "../store/gameStore";
import { resolvePlayerNumber, rejectUnknownSocket, getOpponent } from "./utils";
import logger from "../utils/logger";

export function registerPresidentHandlers(io: Server, socket: Socket) {
    socket.on(
        "select-president",
        ({ gameId, presidentId }: { gameId: string; presidentId: PresidentId }) => {
            try {
                const game = gameStore.get(gameId);
                if (!game || game.state !== GameState.PRESIDENT_SELECT) {
                    socket.emit("error", { message: "Cannot select president now" });
                    return;
                }

                if (!Object.values(PresidentId).includes(presidentId)) {
                    socket.emit("error", { message: "Invalid president selection" });
                    return;
                }

                const playerNum = resolvePlayerNumber(game, socket.id);
                if (!playerNum) return rejectUnknownSocket(socket);

                const updated = GameService.selectPresident(gameId, playerNum, presidentId);
                if (!updated) {
                    socket.emit("error", { message: "Cannot select president now" });
                    return;
                }

                socket.emit("president-chosen", { presidentId });
                logger.info("President selected", { gameId, player: playerNum, presidentId });

                if (updated.player1?.president && updated.player2?.president) {
                    // Both presidents chosen — record on-chain
                    blockchain.presidentsSelected(
                        gameId,
                        updated.player1.president,
                        updated.player2.president,
                    );

                    // Tell each player which president the enemy picked
                    const p1SocketId = updated.player1.socketId;
                    const p2SocketId = updated.player2.socketId;
                    if (p1SocketId) {
                        io.to(p1SocketId).emit("enemy-president", {
                            presidentId: updated.player2.president,
                        });
                    }
                    if (p2SocketId) {
                        io.to(p2SocketId).emit("enemy-president", {
                            presidentId: updated.player1.president,
                        });
                    }

                    const setupGame = GameService.transitionToSetup(gameId);
                    if (setupGame) {
                        io.to(gameId).emit("setup-phase", { gameId });
                        logger.info("Both presidents selected, starting setup", { gameId });
                    }
                }
            } catch (error) {
                logger.error("Error selecting president", {
                    error: error instanceof Error ? error.message : error,
                });
                socket.emit("error", { message: "Failed to select president" });
            }
        },
    );

    socket.on(
        "use-ability",
        async ({
            gameId,
            row,
            col,
            direction,
        }: {
            gameId: string;
            row?: number;
            col?: number;
            direction?: "row" | "col";
        }) => {
            try {
                const game = gameStore.get(gameId);
                if (!game || game.state !== GameState.IN_PROGRESS) {
                    socket.emit("error", { message: "Game not in progress" });
                    return;
                }

                const playerNum = resolvePlayerNumber(game, socket.id);
                if (!playerNum) return rejectUnknownSocket(socket);

                const player = playerNum === 1 ? game.player1! : game.player2!;

                if (!player.president) {
                    socket.emit("error", { message: "No president selected" });
                    return;
                }
                if (player.president === PresidentId.JUGGERNAUT) {
                    if ((player.sweepCharges ?? 0) <= 0) {
                        socket.emit("error", { message: "No sweep charges available" });
                        return;
                    }
                } else if (player.abilityUsed) {
                    socket.emit("error", { message: "Ability already used" });
                    return;
                }
                if (player.president === PresidentId.SHIELD) {
                    socket.emit("error", { message: "This is a passive ability" });
                    return;
                }

                const targetBoard = playerNum === 1 ? game.board2 : game.board1;
                const targetPlayer = playerNum === 1 ? game.player2 : game.player1;
                if (!targetPlayer) {
                    socket.emit("error", { message: "Target player not found" });
                    return;
                }

                // ── Strategist ───────────────────────────────────────────────
                if (player.president === PresidentId.STRATEGIST) {
                    if (row === undefined || col === undefined) {
                        socket.emit("error", { message: "Row and col required for Strategist" });
                        return;
                    }
                    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
                        socket.emit("error", { message: "Target out of bounds" });
                        return;
                    }
                    const cells: { row: number; col: number; hasShip: boolean }[] = [];
                    for (let dr = -2; dr <= 2; dr++) {
                        for (let dc = -2; dc <= 2; dc++) {
                            const r = row + dr;
                            const c = col + dc;
                            if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
                                cells.push({
                                    row: r,
                                    col: c,
                                    hasShip: targetBoard[r][c] === CELL.SHIP,
                                });
                            }
                        }
                    }
                    player.abilityUsed = true;
                    player.turnsToSkip = 1;
                    const nextTurn = getOpponent(playerNum);
                    game.turn = nextTurn;
                    gameStore.set(gameId, game);
                    socket.emit("ability-result", {
                        type: "strategist",
                        cells,
                        nextTurn,
                        player: playerNum,
                    });
                    socket.to(gameId).emit("ability-result", {
                        type: "strategist",
                        cells: [],
                        nextTurn,
                        player: playerNum,
                    });
                    logger.info("Strategist ability used", { gameId, player: playerNum });

                    // ── Ghost ────────────────────────────────────────────────────
                } else if (player.president === PresidentId.GHOST) {
                    const myBoard = playerNum === 1 ? game.board1 : game.board2;
                    const myShips = player.ships;

                    const unhitShips = myShips.filter((ship) =>
                        ship.cells.every((c) => myBoard[c.row][c.col] === CELL.SHIP),
                    );
                    if (unhitShips.length === 0) {
                        socket.emit("error", { message: "No unhit ships to move" });
                        return;
                    }

                    const newBoard = myBoard.map((r) => [...r]);
                    const movedShips: {
                        shipId: string;
                        newCells: { row: number; col: number }[];
                    }[] = [];

                    for (const ship of unhitShips) {
                        for (const c of ship.cells) newBoard[c.row][c.col] = CELL.EMPTY;
                        const newCells = findValidShipPlacement(newBoard, ship.cells.length);
                        if (!newCells) continue;
                        for (const c of newCells) newBoard[c.row][c.col] = CELL.SHIP;
                        const idx = myShips.findIndex((s) => s.shipId === ship.shipId);
                        player.ships[idx].cells = newCells;
                        movedShips.push({ shipId: ship.shipId, newCells });
                    }

                    if (playerNum === 1) game.board1 = newBoard;
                    else game.board2 = newBoard;
                    player.abilityUsed = true;
                    player.turnsToSkip = 1;
                    const nextTurn = getOpponent(playerNum);
                    game.turn = nextTurn;
                    gameStore.set(gameId, game);

                    socket.emit("ability-result", { type: "ghost", movedShips, player: playerNum });
                    logger.info("Ghost ability used", {
                        gameId,
                        player: playerNum,
                        count: movedShips.length,
                    });

                    // ── Juggernaut ───────────────────────────────────────────────
                } else if (player.president === PresidentId.JUGGERNAUT) {
                    const sweepDir = direction === "col" ? "col" : "row";
                    const index = sweepDir === "row" ? row : col;

                    if (index === undefined) {
                        socket.emit("error", {
                            message: `${sweepDir === "row" ? "Row" : "Column"} required for Juggernaut`,
                        });
                        return;
                    }
                    if (index < 0 || index >= BOARD_SIZE) {
                        socket.emit("error", { message: "Target out of bounds" });
                        return;
                    }

                    const targetShips = targetPlayer.ships;
                    const sweepCells = [];
                    for (let i = 0; i < BOARD_SIZE; i++) {
                        const r = sweepDir === "row" ? index : i;
                        const c = sweepDir === "row" ? i : index;
                        const v = targetBoard[r][c];
                        if (v !== CELL.HIT && v !== CELL.MISS) sweepCells.push({ row: r, col: c });
                    }

                    let updatedBoard = targetBoard.map((r) => [...r]);
                    let gameOver = false;
                    const opponentNum = getOpponent(playerNum);

                    const sweepResults = [];
                    for (let i = 0; i < sweepCells.length; i++) {
                        const cell = sweepCells[i];
                        const {
                            board: newBoard,
                            result,
                            sunkShipId,
                            sunkShipCells,
                        } = processShot(updatedBoard, targetShips, cell.row, cell.col);
                        updatedBoard = newBoard;

                        sweepResults.push({
                            row: cell.row,
                            col: cell.col,
                            result,
                            sunkShipId,
                            sunkShipCells,
                            shooter: playerNum,
                            nextTurn: playerNum,
                            fromSweep: true,
                            sweepIndex: i,
                            sweepTotal: sweepCells.length,
                        });

                        if (checkAllShipsSunk(updatedBoard)) {
                            gameOver = true;
                            break;
                        }
                    }
                    for (const shot of sweepResults) {
                        io.to(gameId).emit("shot-result", shot);
                        blockchain.shotFired(gameId, playerNum, shot.row, shot.col, shot.result);
                    }

                    if (playerNum === 1) game.board2 = updatedBoard;
                    else game.board1 = updatedBoard;

                    player.abilityUsed = true;
                    player.sweepCharges = Math.max(0, (player.sweepCharges ?? 1) - 1);
                    const chargesRemaining = player.sweepCharges;

                    if (gameOver) {
                        game.state = GameState.FINISHED;
                        game.winner = playerNum;
                        gameStore.set(gameId, game);
                        GameService.finalizeOnChain(game);
                        io.to(gameId).emit("game-over", {
                            gameId,
                            winner: playerNum,
                            player1Ships: game.player1!.ships.map((s) => ({
                                shipId: s.shipId,
                                cells: s.cells,
                            })),
                            player2Ships: game.player2!.ships.map((s) => ({
                                shipId: s.shipId,
                                cells: s.cells,
                            })),
                        });
                    } else if (chargesRemaining > 0) {
                        game.turn = playerNum;
                        gameStore.set(gameId, game);
                        io.to(gameId).emit("ability-result", {
                            type: "juggernaut",
                            chargesRemaining,
                            nextTurn: playerNum,
                            player: playerNum,
                        });
                    } else {
                        game.turn = opponentNum;
                        gameStore.set(gameId, game);
                        io.to(gameId).emit("ability-result", {
                            type: "juggernaut",
                            chargesRemaining: 0,
                            nextTurn: opponentNum,
                            player: playerNum,
                        });
                    }
                    logger.info("Juggernaut broadside used", {
                        gameId,
                        player: playerNum,
                        chargesRemaining,
                    });
                }
            } catch (error) {
                logger.error("Error using ability", {
                    error: error instanceof Error ? error.message : error,
                });
                socket.emit("error", { message: "Failed to use ability" });
            }
        },
    );
}
