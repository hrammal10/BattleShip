import { Server, Socket } from "socket.io";
import { GameState, ShipPlacement } from "../game/types";
import { validateFleetPlacement } from "../game/gameLogic";
import { GameService } from "../services/GameService";
import { gameStore } from "../store/gameStore";
import { blockchain } from "../services/BlockchainService";
import { resolvePlayerNumber, rejectUnknownSocket } from "./utils";
import logger from "../utils/logger";

// Atomically start the game if both players are ready.
// Returns without emitting if the game isn't ready yet or another handler beat us to it.
async function startGameIfBothReady(io: Server, gameId: string): Promise<void> {
    const startingTurn = (Math.random() < 0.5 ? 1 : 2) as 1 | 2;
    const started = GameService.startGame(gameId, startingTurn);
    if (!started) return;

    // Emit individually so each socket receives its own player ID
    const sockets = await io.in(gameId).fetchSockets();
    for (const s of sockets) {
        const pNum = resolvePlayerNumber(started, s.id);
        if (pNum) {
            s.emit("game-start", { gameId, turn: startingTurn, yourPlayerId: pNum });
        }
    }
    logger.info("Game started", { gameId, firstTurn: startingTurn });
}

export function registerSetupHandlers(io: Server, socket: Socket) {
    socket.on(
        "place-ships",
        async ({
            gameId,
            ships,
            decoyCell,
        }: {
            gameId: string;
            ships: ShipPlacement[];
            decoyCell?: { row: number; col: number } | null;
        }) => {
            try {
                const game = gameStore.get(gameId);
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

                const playerNum = resolvePlayerNumber(game, socket.id);
                if (!playerNum) {
                    logger.warn("Unknown socket tried to place ships", {
                        gameId,
                        socketId: socket.id,
                    });
                    return rejectUnknownSocket(socket);
                }

                const { error } = GameService.placeShips(gameId, playerNum, ships, decoyCell);
                if (error) {
                    socket.emit("ships-rejected", { gameId, reason: error });
                    return;
                }

                blockchain.shipsPlaced(gameId, playerNum);
                socket.emit("ships-accepted", { gameId });
                socket.to(gameId).emit("opponent-ready", { gameId });
                logger.info("Ships placed", { gameId, player: playerNum });

                await startGameIfBothReady(io, gameId);
            } catch (error) {
                logger.error("Error placing ships", {
                    error: error instanceof Error ? error.message : error,
                });
                socket.emit("error", { message: "Failed to place ships" });
            }
        },
    );
}
