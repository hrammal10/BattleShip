import { useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useGame } from "../hooks/useGame";
import { useGameNavigation } from "../hooks/useGameNavigation";
import { GameState, PRESIDENTS } from "../types/game";
import "./PresidentSelectPage.css";

const PRESIDENT_ROUTES = {
    [GameState.SETUP]: "/setup",
};

export default function PresidentSelectPage() {
    const { gameId: urlGameId } = useParams<{ gameId: string }>();
    const { selectPresident } = useGame();
    const [selected, setSelected] = useState<string | null>(null);
    const [confirmed, setConfirmed] = useState(false);

    useGameNavigation(urlGameId, PRESIDENT_ROUTES, true);

    const handleConfirm = () => {
        if (!selected || confirmed) return;
        selectPresident(selected);
        setConfirmed(true);
    };

    return (
        <div className="president-page">
            <motion.div
                className="president-content"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <h2 className="president-title">Choose Your President</h2>
                <p className="president-subtitle">
                    Each president grants a unique one-time ability. Choose wisely.
                </p>

                <div className="president-cards">
                    {PRESIDENTS.map((p) => (
                        <motion.div
                            key={p.id}
                            className={`president-card ${selected === p.id ? "selected" : ""} ${confirmed ? "disabled" : ""}`}
                            onClick={() => !confirmed && setSelected(p.id)}
                            whileHover={!confirmed ? { scale: 1.03 } : {}}
                            whileTap={!confirmed ? { scale: 0.97 } : {}}
                        >
                            <div className="president-icon">{p.icon}</div>
                            <h3 className="president-name">{p.name}</h3>
                            <p className="president-card-title">{p.title}</p>
                            <p className="president-description">{p.description}</p>
                            <div className="president-ability">
                                <span className={`ability-badge ${p.abilityType}`}>
                                    {p.abilityType === "active" ? "⚡ Active" : "✨ Passive"}
                                </span>
                                <p className="ability-name">{p.abilityName}</p>
                                <p className="ability-desc">{p.abilityDescription}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {!confirmed ? (
                    <motion.button
                        className={`confirm-btn ${selected ? "active" : ""}`}
                        onClick={handleConfirm}
                        disabled={!selected}
                        whileHover={selected ? { scale: 1.05 } : {}}
                        whileTap={selected ? { scale: 0.95 } : {}}
                    >
                        Confirm Selection
                    </motion.button>
                ) : (
                    <motion.div
                        className="waiting-message"
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                    >
                        Waiting for opponent to choose...
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
}
