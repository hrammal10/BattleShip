import { motion } from "framer-motion";
import { CELL } from "../types/game";
import "./Cell.css";

interface CellProps {
    value: number;
    onClick?: () => void;
    onMouseEnter?: () => void;
    interactive?: boolean;
    isPlacedShip?: boolean;
    isSunkShip?: boolean;
    isDecoy?: boolean;
    showShips?: boolean;
    radarState?: "ship" | "empty";
    ghostState?: "valid" | "invalid";
}

export default function Cell({
    value,
    onClick,
    onMouseEnter,
    interactive = false,
    isPlacedShip = false,
    isSunkShip = false,
    isDecoy = false,
    showShips = false,
    radarState,
    ghostState,
}: CellProps) {
    const getCellClass = () => {
        if (isDecoy) return "cell cell-decoy";
        if (isPlacedShip) return "cell cell-ship cell-ship-pickup";
        switch (value) {
            case CELL.SHIP:
                return showShips ? "cell cell-ship" : "cell cell-water";
            case CELL.MISS:
                return "cell cell-miss";
            case CELL.HIT:
                return "cell cell-hit";
            default:
                return "cell cell-water";
        }
    };

    return (
        <motion.div
            className={`${getCellClass()} ${interactive ? "cell-interactive" : ""} ${ghostState ? `cell-ghost-${ghostState}` : ""}`}
            onClick={interactive || isPlacedShip ? onClick : undefined}
            onMouseEnter={onMouseEnter}
            whileHover={interactive ? { scale: 1.1 } : {}}
            whileTap={interactive ? { scale: 0.95 } : {}}
        >
            {isDecoy && (
                <motion.div
                    className="decoy-marker"
                    animate={{ opacity: [0.6, 1, 0.6] }}
                    transition={{ repeat: Infinity, duration: 1.8 }}
                >
                    🎭
                </motion.div>
            )}
            {value === CELL.HIT && !isSunkShip && !showShips && (
                <motion.div
                    className="hit-marker"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", damping: 10 }}
                >
                    🔥
                </motion.div>
            )}
            {value === CELL.MISS && (
                <motion.div
                    className="miss-marker"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", damping: 12 }}
                >
                    💧
                </motion.div>
            )}
            {radarState && (
                <div className={`radar-marker radar-${radarState}`}>
                    {radarState === "ship" ? "📍" : "○"}
                </div>
            )}
        </motion.div>
    );
}
