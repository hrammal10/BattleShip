import { motion, AnimatePresence } from "framer-motion";
import "./GameStatus.css";

interface GameStatusProps {
    message: string;
    isMyTurn?: boolean;
}

export default function GameStatus({ message, isMyTurn }: GameStatusProps) {
    return (
        <div className="game-status-wrapper">
            <AnimatePresence mode="wait">
                <motion.div
                    key={message}
                    className={`game-status ${isMyTurn ? "my-turn" : ""}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    {isMyTurn && (
                        <motion.span
                            className="turn-indicator"
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                        >
                            &bull;
                        </motion.span>
                    )}
                    {message}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
