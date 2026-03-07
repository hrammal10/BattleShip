import { useState } from "react";
import { motion } from "framer-motion";
import "./GameOverModal.css";

interface GameOverModalProps {
    winner: 1 | 2;
    playerId: 1 | 2;
    rematchCount: number;
    onRematch: () => void;
}

export default function GameOverModal({
    winner,
    playerId,
    rematchCount,
    onRematch,
}: GameOverModalProps) {
    const isWinner = winner === playerId;
    const [hasRequested, setHasRequested] = useState(false);

    const handleRematch = () => {
        if (hasRequested) return;
        setHasRequested(true);
        onRematch();
    };

    return (
        <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
        >
            <motion.div
                className={`modal-content ${isWinner ? "victory" : "defeat"}`}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", damping: 12, delay: 0.2 }}
            >
                <h2 className="modal-title">{isWinner ? "VICTORY!" : "DEFEAT"}</h2>
                <p className="modal-subtitle">
                    {isWinner
                        ? "You sank the entire enemy fleet!"
                        : "Your fleet has been destroyed."}
                </p>
                <button
                    className={`play-again-btn ${hasRequested ? "requested" : ""}`}
                    onClick={handleRematch}
                    disabled={hasRequested}
                >
                    Rematch ({rematchCount}/2)
                </button>
            </motion.div>
        </motion.div>
    );
}
