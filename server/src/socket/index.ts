import { Server } from "socket.io";
import { registerLobbyHandlers } from "./lobbyHandlers";
import { registerSetupHandlers } from "./setupHandlers";
import { registerGameHandlers } from "./gameHandlers";
import { registerPresidentHandlers } from "./presidentHandlers";
import { registerChatHandlers } from "./chatHandlers";
import logger from "../utils/logger";

export function registerSocketHandlers(io: Server) {
    io.on("connection", (socket) => {
        logger.info("Client connected", { socketId: socket.id });

        registerLobbyHandlers(io, socket);
        registerSetupHandlers(io, socket);
        registerGameHandlers(io, socket);
        registerPresidentHandlers(io, socket);
        registerChatHandlers(io, socket);

        socket.on("disconnect", () => {
            logger.info("Client disconnected", { socketId: socket.id });
        });
    });
}
