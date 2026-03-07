import { motion, AnimatePresence } from "framer-motion";
import "./GameStatus.css";

interface GameStatusProps {
    message: string;
    isMyTurn?: boolean;
}

export default function GameStatus({ message, isMyTurn }: GameStatusProps) {
    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={message}
                className={`game-status ${isMyTurn ? "my-turn" : ""}`}
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                transition={{ type: "spring", damping: 15 }}
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
    );
}
