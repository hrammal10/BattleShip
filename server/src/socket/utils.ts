import { Socket } from "socket.io";
import type { IGame } from "../game/types";

/**
 * Resolves which player number (1 or 2) the given socket belongs to in a game.
 * Returns null if the socket is not a participant.
 */
export function resolvePlayerNumber(game: IGame, socketId: string): 1 | 2 | null {
    if (game.player1?.socketId === socketId) return 1;
    if (game.player2?.socketId === socketId) return 2;
    return null;
}

/**
 * Returns the opponent's player number.
 */
export function getOpponent(playerNum: 1 | 2): 1 | 2 {
    return playerNum === 1 ? 2 : 1;
}

/**
 * Emits a not-in-game error and returns null — use as a guard in socket handlers.
 */
export function rejectUnknownSocket(socket: Socket): null {
    socket.emit("error", { message: "You are not in this game" });
    return null;
}
