import { useNavigate } from "react-router-dom";
import { useGame } from "../hooks/useGame";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import "./HomePage.css";

export default function HomePage() {
    const navigate = useNavigate();
    const { createGame, gameId, resetGame } = useGame();
    const didCreate = useRef(false);

    // Clear stale state from a previous game
    useEffect(() => {
        if (gameId) resetGame();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    const [code, setCode] = useState("");

    useEffect(() => {
        if (gameId && didCreate.current) {
            navigate(`/play/${gameId}`);
        }
    }, [gameId, navigate]);

    const handleCreate = () => {
        didCreate.current = true;
        createGame();
    };

    const handleJoin = () => {
        const trimmed = code.trim().toLowerCase();
        if (trimmed) navigate(`/play/${trimmed}`);
    };

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
                    onClick={handleCreate}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    Create Game
                </motion.button>

                <div className="join-divider">— or —</div>

                <div className="join-section">
                    <input
                        className="join-input"
                        placeholder="Enter game code"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                        maxLength={8}
                    />
                    <motion.button
                        className="join-btn"
                        onClick={handleJoin}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        Join
                    </motion.button>
                </div>
            </motion.div>
        </div>
    );
}
