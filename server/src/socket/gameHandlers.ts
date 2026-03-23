import { Server, Socket } from "socket.io";
import { GameState, PresidentId } from "../game/types";
import { blockchain } from "../services/BlockchainService";
import { BOARD_SIZE, CELL } from "../game/constants";
import { processShot, isValidTurn, checkAllShipsSunk } from "../game/gameLogic";
import { GameService } from "../services/GameService";
import { gameStore } from "../store/gameStore";
import { resolvePlayerNumber, rejectUnknownSocket, getOpponent } from "./utils";
import logger from "../utils/logger";

export function registerGameHandlers(io: Server, socket: Socket) {
    socket.on("fire-shot", ({ gameId, row, col }: { gameId: string; row: number; col: number }) => {
        try {
            const game = gameStore.get(gameId);

            if (!game || game.state !== GameState.IN_PROGRESS) {
                socket.emit("error", { message: "Game not in progress" });
                return;
            }

            const playerNum = resolvePlayerNumber(game, socket.id);
            if (!playerNum) return rejectUnknownSocket(socket);

            if (
                typeof row !== "number" ||
                typeof col !== "number" ||
                row < 0 ||
                row >= BOARD_SIZE ||
                col < 0 ||
                col >= BOARD_SIZE
            ) {
                socket.emit("error", { message: "Shot out of bounds" });
                return;
            }

            if (!isValidTurn(game.turn as 1 | 2, playerNum)) {
                socket.emit("error", { message: "Not your turn" });
                logger.warn("Out-of-turn shot attempt", {
                    gameId,
                    player: playerNum,
                    turn: game.turn,
                });
                return;
            }

            const targetBoard = playerNum === 1 ? game.board2 : game.board1;
            const targetPlayer = playerNum === 1 ? game.player2 : game.player1;
            if (!targetPlayer) {
                socket.emit("error", { message: "Game data corrupted" });
                return;
            }

            // Shield passive: block first 2 hits
            const defender = targetPlayer;
            if (
                defender.president === PresidentId.SHIELD &&
                defender.shieldHitsBlocked < 2 &&
                targetBoard[row][col] === CELL.SHIP
            ) {
                if (defender.shieldHitsBlocked === 0) {
                    const shipCells: { row: number; col: number }[] = [];
                    for (let r = 0; r < BOARD_SIZE; r++) {
                        for (let c = 0; c < BOARD_SIZE; c++) {
                            if (targetBoard[r][c] === CELL.SHIP) shipCells.push({ row: r, col: c });
                        }
                    }
                    for (let i = 0; i < Math.min(2, shipCells.length); i++) {
                        const idx = Math.floor(Math.random() * shipCells.length);
                        const [picked] = shipCells.splice(idx, 1);
                        socket.emit("sniper-reveal", { row: picked.row, col: picked.col });
                    }
                }
                defender.shieldHitsBlocked += 1;
                const nextTurn = getOpponent(playerNum);
                game.turn = nextTurn;
                gameStore.set(gameId, game);
                blockchain.shotFired(gameId, playerNum, row, col, "miss");
                io.to(gameId).emit("shot-result", {
                    row,
                    col,
                    result: "miss",
                    shooter: playerNum,
                    nextTurn,
                });
                io.to(gameId).emit("shield-activated", { player: getOpponent(playerNum) });
                return;
            }

            const {
                board: updatedBoard,
                result,
                sunkShipId,
                sunkShipCells,
            } = processShot(targetBoard, targetPlayer.ships, row, col);

            if (playerNum === 1) game.board2 = updatedBoard;
            else game.board1 = updatedBoard;

            if (checkAllShipsSunk(updatedBoard)) {
                game.state = GameState.FINISHED;
                game.winner = playerNum;
                gameStore.set(gameId, game);
                blockchain.shotFired(gameId, playerNum, row, col, result);
                GameService.finalizeOnChain(game);

                io.to(gameId).emit("shot-result", {
                    row,
                    col,
                    result,
                    sunkShipId,
                    sunkShipCells,
                    shooter: playerNum,
                    nextTurn: playerNum,
                });
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
                logger.info("Game over", { gameId, winner: playerNum });
                return;
            }

            const rawNextTurn =
                result === "miss" ? getOpponent(playerNum) : playerNum;
            const nextPlayerData = rawNextTurn === 1 ? game.player1 : game.player2;
            let nextTurn = rawNextTurn;
            if (nextPlayerData && (nextPlayerData.turnsToSkip ?? 0) > 0) {
                nextPlayerData.turnsToSkip -= 1;
                nextTurn = playerNum;
            }

            let chargeGained = false;
            const attacker = playerNum === 1 ? game.player1 : game.player2;
            if (
                result === "sunk" &&
                attacker!.president === PresidentId.JUGGERNAUT &&
                !attacker!.abilityUsed &&
                attacker!.sweepCharges < 3
            ) {
                attacker!.sweepCharges += 1;
                chargeGained = true;
            }

            game.turn = nextTurn;
            gameStore.set(gameId, game);
            blockchain.shotFired(gameId, playerNum, row, col, result);

            io.to(gameId).emit("shot-result", {
                row,
                col,
                result,
                sunkShipId,
                sunkShipCells,
                shooter: playerNum,
                nextTurn,
                chargeGained,
            });

            logger.debug("Shot fired", { gameId, player: playerNum, row, col, result });
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to process shot";
            socket.emit("error", { message });
            logger.error("Error processing shot", { error: message });
        }
    });

    socket.on("request-rematch", ({ gameId }: { gameId: string }) => {
        try {
            const game = gameStore.get(gameId);

            if (!game || game.state !== GameState.FINISHED) {
                socket.emit("error", { message: "Game is not finished" });
                return;
            }

            const playerNum = resolvePlayerNumber(game, socket.id);
            if (!playerNum) return rejectUnknownSocket(socket);

            const updated = GameService.setRematchReady(gameId, playerNum);
            if (!updated) {
                socket.emit("error", { message: "Game is not finished" });
                return;
            }

            const count =
                (updated.player1?.rematchReady ? 1 : 0) + (updated.player2?.rematchReady ? 1 : 0);
            io.to(gameId).emit("rematch-update", { count });
            logger.info("Rematch requested", { gameId, player: playerNum, count });

            if (updated.player1?.rematchReady && updated.player2?.rematchReady) {
                GameService.resetForRematch(gameId);
                io.to(gameId).emit("president-select", { gameId });
                logger.info("Rematch started", { gameId });
            }
        } catch (error) {
            logger.error("Error requesting rematch", {
                error: error instanceof Error ? error.message : error,
            });
            socket.emit("error", { message: "Failed to request rematch" });
        }
    });

    socket.on("disconnect", () => {
        const gameId = socket.data.gameId;
        if (gameId) {
            socket.to(gameId).emit("opponent-disconnected", { gameId });
            logger.info("Player disconnected", { gameId, socketId: socket.id });
        }
    });
}
