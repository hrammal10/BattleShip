import { Server, Socket } from "socket.io";
import Game from "../models/Game";
import { GameState } from "../game/types";
import { processShot, isValidTurn, checkAllShipsSunk, createEmptyBoard } from "../game/gameLogic";
import logger from "../utils/logger";

export function registerGameHandlers(io: Server, socket: Socket) {
    socket.on(
        "fire-shot",
        async ({ gameId, row, col }: { gameId: string; row: number; col: number }) => {
            try {
                const game = await Game.findOne({ gameId });

                if (!game || game.state !== GameState.IN_PROGRESS) {
                    socket.emit("error", { message: "Game not in progress" });
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

                const targetBoardKey = playerNum === 1 ? "board2" : "board1";
                const targetPlayerKey = playerNum === 1 ? "player2" : "player1";
                const targetBoard = game[targetBoardKey] as number[][];
                const targetShips = game[targetPlayerKey]!.ships;

                const { board: updatedBoard, result, sunkShipId, sunkShipCells } = processShot(
                    targetBoard,
                    targetShips,
                    row,
                    col,
                );

                game[targetBoardKey] = updatedBoard;

                if (checkAllShipsSunk(updatedBoard)) {
                    game.state = GameState.FINISHED;
                    game.winner = playerNum;
                    await game.save();

                    io.to(gameId).emit("shot-result", {
                        row,
                        col,
                        result,
                        sunkShipId,
                        sunkShipCells,
                        shooter: playerNum,
                        nextTurn: playerNum,
                    });
                    io.to(gameId).emit("game-over", { gameId, winner: playerNum });

                    logger.info("Game over", { gameId, winner: playerNum });
                    return;
                }

                // Hit or sunk = keep your turn, miss = switch turns
                const nextTurn = result === "miss" ? ((playerNum === 1 ? 2 : 1) as 1 | 2) : playerNum;
                game.turn = nextTurn;
                await game.save();

                io.to(gameId).emit("shot-result", {
                    row,
                    col,
                    result,
                    sunkShipId,
                    sunkShipCells,
                    shooter: playerNum,
                    nextTurn,
                });

                logger.debug("Shot fired", { gameId, player: playerNum, row, col, result });
            } catch (error) {
                const message = error instanceof Error ? error.message : "Failed to process shot";
                socket.emit("error", { message });
                logger.error("Error processing shot", { error: message });
            }
        },
    );

    socket.on("request-rematch", async ({ gameId }: { gameId: string }) => {
        try {
            const game = await Game.findOne({ gameId });

            if (!game || game.state !== GameState.FINISHED) {
                socket.emit("error", { message: "Game is not finished" });
                return;
            }

            let playerNum: 1 | 2;
            if (game.player1?.socketId === socket.id) {
                playerNum = 1;
            } else if (game.player2?.socketId === socket.id) {
                playerNum = 2;
            } else {
                socket.emit("error", { message: "You are not in this game" });
                return;
            }

            const playerKey = playerNum === 1 ? "player1" : "player2";
            game[playerKey]!.rematchReady = true;
            await game.save();

            const count =
                (game.player1?.rematchReady ? 1 : 0) + (game.player2?.rematchReady ? 1 : 0);
            io.to(gameId).emit("rematch-update", { count });

            logger.info("Rematch requested", { gameId, player: playerNum, count });

            if (game.player1?.rematchReady && game.player2?.rematchReady) {
                // Reset game for a new round
                game.state = GameState.SETUP;
                game.board1 = createEmptyBoard();
                game.board2 = createEmptyBoard();
                game.player1.ships = [];
                game.player1.ready = false;
                game.player1.rematchReady = false;
                game.player2!.ships = [];
                game.player2!.ready = false;
                game.player2!.rematchReady = false;
                game.turn = 1;
                game.winner = null;
                await game.save();

                io.to(gameId).emit("setup-phase", { gameId });
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
