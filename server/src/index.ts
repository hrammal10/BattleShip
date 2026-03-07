import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { connectDB } from "./config/db";
import { registerSocketHandlers } from "./socket";
import { gameRoutes } from "./routes/gameRoutes";
import logger from "./utils/logger";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || "https://localhost:5173",
        methods: ["GET", "POST"],
    },
});

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", uptime: process.uptime() });
});

app.use("/api", gameRoutes);

registerSocketHandlers(io);

const PORT = process.env.PORT || 3001;

async function start() {
    await connectDB();
    server.listen(PORT, () => {
        logger.info(`Server running on port ${PORT}`);
    });
}

start();
