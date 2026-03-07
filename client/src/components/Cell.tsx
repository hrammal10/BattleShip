import { motion } from "framer-motion";
import { CELL } from "../types/game";
import "./Cell.css";

interface CellProps {
    value: number;
    row: number;
    col: number;
    onClick?: () => void;
    interactive?: boolean;
    isPlacing?: boolean;
    isValidNext?: boolean;
    isPlacedShip?: boolean;
    isSunkShip?: boolean;
    showShips?: boolean;
}

export default function Cell({
    value,
    onClick,
    interactive = false,
    isPlacing = false,
    isValidNext = false,
    isPlacedShip = false,
    isSunkShip = false,
    showShips = false,
}: CellProps) {
    const getCellClass = () => {
        if (isPlacing) return "cell cell-placing";
        if (isValidNext) return "cell cell-valid-next";
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
            className={`${getCellClass()} ${interactive ? "cell-interactive" : ""}`}
            onClick={interactive ? onClick : undefined}
            whileHover={interactive ? { scale: 1.1 } : {}}
            whileTap={interactive ? { scale: 0.95 } : {}}
        >
            {value === CELL.HIT && !isSunkShip && (
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
        </motion.div>
    );
}
