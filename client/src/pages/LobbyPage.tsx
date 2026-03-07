import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useGame } from "../context/GameContext";
import CopyLinkButton from "../components/CopyLinkButton";
import GameStatus from "../components/GameStatus";
import { GameState } from "../types/game";
import "./LobbyPage.css";

export default function LobbyPage() {
    const { gameId: urlGameId } = useParams<{ gameId: string }>();
    const navigate = useNavigate();
    const { gameId, gameState, playerId, joinGame } = useGame();

    useEffect(() => {
        if (urlGameId && !gameId && !playerId) {
            joinGame(urlGameId);
        }
    }, [urlGameId, gameId, playerId, joinGame]);

    useEffect(() => {
        if (gameState === GameState.SETUP) {
            navigate(`/play/${urlGameId}/setup`);
        }
    }, [gameState, urlGameId, navigate]);

    return (
        <div className="lobby-page">
            <motion.div
                className="lobby-content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
            >
                <h2 className="lobby-title">Game Lobby</h2>
                <GameStatus
                    message={
                        playerId === 1
                            ? "Waiting for opponent to join..."
                            : "Joining game..."
                    }
                />
                {urlGameId && playerId === 1 && (
                    <div className="lobby-link-section">
                        <p className="lobby-instruction">
                            Share this link with your opponent:
                        </p>
                        <CopyLinkButton gameId={urlGameId} />
                    </div>
                )}
                <motion.div
                    className="lobby-dots"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                >
                    &bull; &bull; &bull;
                </motion.div>
            </motion.div>
        </div>
    );
}
