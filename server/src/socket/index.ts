import { Server } from "socket.io";
import { registerLobbyHandlers } from "./lobbyHandlers";
import { registerSetupHandlers } from "./setupHandlers";
import { registerGameHandlers } from "./gameHandlers";
import logger from "../utils/logger";

export function registerSocketHandlers(io: Server) {
    io.on("connection", (socket) => {
        logger.info("Client connected", { socketId: socket.id });

        registerLobbyHandlers(io, socket);
        registerSetupHandlers(io, socket);
        registerGameHandlers(io, socket);

        socket.on("disconnect", () => {
            logger.info("Client disconnected", { socketId: socket.id });
        });
    });
}
