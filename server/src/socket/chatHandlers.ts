import { Server, Socket } from "socket.io";

export function registerChatHandlers(io: Server, socket: Socket) {
    socket.on("chat-message", ({ gameId, text }: { gameId: string; text: string }) => {
        if (!gameId || typeof text !== "string") return;
        const trimmed = text.trim().slice(0, 200);
        if (!trimmed) return;

        const playerNum = socket.data.playerNumber as 1 | 2 | undefined;
        if (!playerNum) return;

        io.to(gameId).emit("chat-message", {
            from: playerNum,
            text: trimmed,
            ts: Date.now(),
        });
    });
}
