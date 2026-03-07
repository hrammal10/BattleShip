import { useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext";
import { useEffect } from "react";
import { motion } from "framer-motion";
import "./HomePage.css";

export default function HomePage() {
    const navigate = useNavigate();
    const { createGame, gameId } = useGame();

    useEffect(() => {
        if (gameId) {
            navigate(`/play/${gameId}`);
        }
    }, [gameId, navigate]);

    return (
        <div className="home-page">
            <motion.div
                className="home-content"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
            >
                <h1 className="home-title">BATTLESHIP</h1>
                <p className="home-subtitle">Sink the enemy fleet. No signup required.</p>
                <motion.button
                    className="create-game-btn"
                    onClick={createGame}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    Create Game
                </motion.button>
            </motion.div>
        </div>
    );
}
