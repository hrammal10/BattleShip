import { Router } from "express";
import { gameStore } from "../store/gameStore";
import logger from "../utils/logger";

export const gameRoutes = Router();

gameRoutes.get("/game/:gameId", (req, res) => {
    try {
        const game = gameStore.get(req.params.gameId);

        if (!game) {
            res.status(404).json({ error: "Game not found" });
            return;
        }

        res.json({
            gameId: game.gameId,
            state: game.state,
            player1Connected: !!game.player1,
            player2Connected: !!game.player2,
            turn: game.turn,
            winner: game.winner,
        });
    } catch (error) {
        logger.error("Error fetching game", {
            error: error instanceof Error ? error.message : error,
        });
        res.status(500).json({ error: "Internal server error" });
    }
});
