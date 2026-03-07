import { Server, Socket } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import Game from "../models/Game";
import { GameState } from "../game/types";
import logger from "../utils/logger";

export function registerLobbyHandlers(io: Server, socket: Socket) {
    socket.on("create-game", async () => {
        try {
            const gameId = uuidv4().slice(0, 8);

            const game = new Game({
                gameId,
                state: GameState.WAITING,
                player1: { socketId: socket.id, ready: false, rematchReady: false, ships: [] },
            });
            await game.save();

            socket.join(gameId);
            socket.data.gameId = gameId;
            socket.data.playerNumber = 1;

            socket.emit("game-created", { gameId, playerId: 1 });
            logger.info("Game created", { gameId, socketId: socket.id });
        } catch (error) {
            logger.error("Error creating game", {
                error: error instanceof Error ? error.message : error,
            });
            socket.emit("error", { message: "Failed to create game" });
        }
    });

    socket.on("join-game", async ({ gameId }: { gameId: string }) => {
        try {
            const game = await Game.findOne({ gameId });

            if (!game) {
                socket.emit("error", { message: "Game not found" });
                return;
            }
            if (game.state !== GameState.WAITING) {
                socket.emit("error", { message: "Game is not joinable" });
                return;
            }
            if (game.player1?.socketId === socket.id) {
                socket.emit("error", { message: "Cannot join your own game" });
                return;
            }

            game.player2 = { socketId: socket.id, ready: false, rematchReady: false, ships: [] };
            game.state = GameState.SETUP;
            await game.save();

            socket.join(gameId);
            socket.data.gameId = gameId;
            socket.data.playerNumber = 2;

            socket.emit("game-joined", { gameId, playerId: 2 });
            socket.to(gameId).emit("opponent-joined", { gameId });
            io.to(gameId).emit("setup-phase", { gameId });

            logger.info("Player joined game", { gameId, socketId: socket.id });
        } catch (error) {
            logger.error("Error joining game", {
                error: error instanceof Error ? error.message : error,
            });
            socket.emit("error", { message: "Failed to join game" });
        }
    });

    socket.on(
        "rejoin-game",
        async ({ gameId, playerId }: { gameId: string; playerId: 1 | 2 }) => {
            try {
                const game = await Game.findOne({ gameId });

                if (!game) {
                    socket.emit("error", { message: "Game not found" });
                    return;
                }

                const playerKey = playerId === 1 ? "player1" : "player2";
                if (!game[playerKey]) {
                    socket.emit("error", { message: "Player not found in game" });
                    return;
                }

                // Update the stored socket ID to the new one
                game[playerKey]!.socketId = socket.id;
                await game.save();

                socket.join(gameId);
                socket.data.gameId = gameId;
                socket.data.playerNumber = playerId;

                socket.emit("rejoin-success", {
                    gameId,
                    playerId,
                    gameState: game.state,
                });

                logger.info("Player rejoined game", {
                    gameId,
                    player: playerId,
                    socketId: socket.id,
                });
            } catch (error) {
                logger.error("Error rejoining game", {
                    error: error instanceof Error ? error.message : error,
                });
                socket.emit("error", { message: "Failed to rejoin game" });
            }
        },
    );
}
