import { Server, Socket } from "socket.io";
import { GameService } from "../services/GameService";
import { CELL } from "../game/constants";
import { GameState } from "../game/types";
import { gameStore } from "../store/gameStore";
import logger from "../utils/logger";

export function registerLobbyHandlers(io: Server, socket: Socket) {
    socket.on("create-game", () => {
        try {
            const game = GameService.createGame(socket.id);
            const gameId = game.gameId;

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

    socket.on("join-game", ({ gameId }: { gameId: string }) => {
        try {
            const existing = gameStore.get(gameId);

            if (!existing) {
                socket.emit("error", { message: "Game not found" });
                return;
            }
            if (existing.player1?.socketId === socket.id) {
                socket.emit("error", { message: "Cannot join your own game" });
                return;
            }

            const game = GameService.joinGame(gameId, socket.id);
            if (!game) {
                socket.emit("error", { message: "Game is not joinable" });
                return;
            }

            socket.join(gameId);
            socket.data.gameId = gameId;
            socket.data.playerNumber = 2;

            socket.emit("game-joined", { gameId, playerId: 2 });
            io.to(gameId).emit("president-select", { gameId });

            logger.info("Player joined game", { gameId, socketId: socket.id });
        } catch (error) {
            logger.error("Error joining game", {
                error: error instanceof Error ? error.message : error,
            });
            socket.emit("error", { message: "Failed to join game" });
        }
    });

    socket.on("rejoin-game", ({ gameId, playerId }: { gameId: string; playerId: 1 | 2 }) => {
        try {
            const existing = gameStore.get(gameId);

            if (!existing) {
                socket.emit("error", { message: "Game not found" });
                return;
            }

            const playerKey = playerId === 1 ? "player1" : "player2";
            if (!existing[playerKey]) {
                socket.emit("error", { message: "Player not found in game" });
                return;
            }

            // Block rejoin if the original socket is still connected (e.g. another tab)
            const oldSocketId = existing[playerKey]!.socketId;
            if (oldSocketId && oldSocketId !== socket.id && io.sockets.sockets.has(oldSocketId)) {
                socket.emit("error", { message: "Game is not joinable" });
                return;
            }

            const game = GameService.rejoinGame(gameId, playerId, socket.id);
            if (!game) {
                socket.emit("error", { message: "Failed to rejoin game" });
                return;
            }

            socket.join(gameId);
            socket.data.gameId = gameId;
            socket.data.playerNumber = playerId;

            const myPlayer = playerId === 1 ? game.player1 : game.player2;
            const enemyPlayer = playerId === 1 ? game.player2 : game.player1;
            const myBoard = playerId === 1 ? game.board1 : game.board2;
            const enemyBoard = playerId === 1 ? game.board2 : game.board1;

            // Mask enemy board — only reveal HIT and MISS cells
            const attackBoard = enemyBoard.map((row) =>
                row.map((cell) => (cell === CELL.HIT || cell === CELL.MISS ? cell : CELL.EMPTY)),
            );

            // Derive sunk enemy ships (all cells are HIT on the enemy board)
            const sunkEnemyShips = (enemyPlayer?.ships ?? [])
                .filter((ship) => ship.cells.every((c) => enemyBoard[c.row][c.col] === CELL.HIT))
                .map((s) => ({ shipId: s.shipId, cells: s.cells }));

            // Full enemy ships revealed only after game ends
            const enemyShips =
                game.state === GameState.FINISHED && enemyPlayer
                    ? enemyPlayer.ships.map((s) => ({ shipId: s.shipId, cells: s.cells }))
                    : [];

            socket.emit("rejoin-success", {
                gameId,
                playerId,
                gameState: game.state,
                myBoard,
                attackBoard,
                myShips: (myPlayer?.ships ?? []).map((s) => ({ shipId: s.shipId, cells: s.cells })),
                sunkEnemyShips,
                president: myPlayer?.president ?? null,
                enemyPresident: enemyPlayer?.president ?? null,
                abilityUsed: myPlayer?.abilityUsed ?? false,
                sweepCharges: myPlayer?.sweepCharges ?? 0,
                turn: game.turn,
                winner: game.winner,
                opponentReady: enemyPlayer?.ready ?? false,
                enemyShips,
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
    });
}
