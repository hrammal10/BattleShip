import { Server, Socket } from "socket.io";
import Game from "../models/Game";
import { GameState, ShipPlacement } from "../game/types";
import { CELL } from "../game/constants";
import { createEmptyBoard, validateFleetPlacement } from "../game/gameLogic";
import logger from "../utils/logger";

export function registerSetupHandlers(io: Server, socket: Socket) {
    socket.on(
        "place-ships",
        async ({ gameId, ships }: { gameId: string; ships: ShipPlacement[] }) => {
            try {
                const game = await Game.findOne({ gameId });

                if (!game || game.state !== GameState.SETUP) {
                    socket.emit("error", { message: "Invalid game state" });
                    return;
                }

                const validation = validateFleetPlacement(ships);
                if (!validation.valid) {
                    socket.emit("ships-rejected", { gameId, reason: validation.reason });
                    logger.warn("Ships rejected", {
                        gameId,
                        socketId: socket.id,
                        reason: validation.reason,
                    });
                    return;
                }

                // Determine player from DB (socket.data can be lost on reconnect)
                let playerNum: 1 | 2;
                if (game.player1?.socketId === socket.id) {
                    playerNum = 1;
                } else if (game.player2?.socketId === socket.id) {
                    playerNum = 2;
                } else {
                    socket.emit("error", { message: "You are not in this game" });
                    logger.warn("Unknown socket tried to place ships", {
                        gameId,
                        socketId: socket.id,
                    });
                    return;
                }

                const boardKey = playerNum === 1 ? "board1" : "board2";
                const playerKey = playerNum === 1 ? "player1" : "player2";

                const board = createEmptyBoard();
                for (const ship of ships) {
                    for (const cell of ship.cells) {
                        board[cell.row][cell.col] = CELL.SHIP;
                    }
                }

                game[boardKey] = board;
                game[playerKey]!.ships = ships;
                game[playerKey]!.ready = true;
                await game.save();

                socket.emit("ships-accepted", { gameId });
                socket.to(gameId).emit("opponent-ready", { gameId });

                logger.info("Ships placed", { gameId, player: playerNum });

                // Re-fetch to avoid race condition if both players submit close together
                const updated = await Game.findOne({ gameId });
                if (updated?.player1?.ready && updated?.player2?.ready) {
                    const startingTurn = (Math.random() < 0.5 ? 1 : 2) as 1 | 2;
                    updated.turn = startingTurn;
                    updated.state = GameState.IN_PROGRESS;
                    await updated.save();

                    // Emit to each socket in the room with their player ID
                    const sockets = await io.in(gameId).fetchSockets();
                    for (const s of sockets) {
                        const pNum =
                            updated.player1.socketId === s.id
                                ? 1
                                : updated.player2!.socketId === s.id
                                  ? 2
                                  : null;
                        if (pNum) {
                            s.emit("game-start", {
                                gameId,
                                turn: startingTurn,
                                yourPlayerId: pNum,
                            });
                        }
                    }

                    logger.info("Game started", { gameId, firstTurn: startingTurn });
                }
            } catch (error) {
                logger.error("Error placing ships", {
                    error: error instanceof Error ? error.message : error,
                });
                socket.emit("error", { message: "Failed to place ships" });
            }
        },
    );
}
