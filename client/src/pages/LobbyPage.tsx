import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useGame } from "../hooks/useGame";
import { useGameNavigation } from "../hooks/useGameNavigation";
import CopyLinkButton from "../components/CopyLinkButton";
import GameStatus from "../components/GameStatus";
import { GameState } from "../types/game";
import { gameStorage } from "../utils/storage";
import "./LobbyPage.css";

const ERROR_GAME_NOT_JOINABLE = "Game is not joinable";

const LOBBY_ROUTES = {
    [GameState.PRESIDENT_SELECT]: "/president",
    [GameState.SETUP]: "/setup",
};

export default function LobbyPage() {
    const { gameId: urlGameId } = useParams<{ gameId: string }>();
    const navigate = useNavigate();
    const { gameId, gameState, playerId, joinGame, rejoinGame, error } = useGame();

    useEffect(() => {
        if (urlGameId && !gameId && !playerId) {
            const { gameId: storedGameId, playerId: storedPlayerId } = gameStorage.getSession();
            if (storedGameId === urlGameId && storedPlayerId) {
                rejoinGame(urlGameId, storedPlayerId);
            } else {
                joinGame(urlGameId);
            }
        }
    }, [urlGameId, gameId, playerId, joinGame, rejoinGame]);

    useEffect(() => {
        if (error === ERROR_GAME_NOT_JOINABLE) {
            const { gameId: storedGameId, playerId: storedPlayerId } = gameStorage.getLocal();
            if (storedGameId === urlGameId && storedPlayerId) {
                rejoinGame(urlGameId!, storedPlayerId);
            }
        }
    }, [error, urlGameId, rejoinGame]);

    useGameNavigation(urlGameId, LOBBY_ROUTES);

    if (error === ERROR_GAME_NOT_JOINABLE) {
        return (
            <div className="lobby-page">
                <motion.div
                    className="lobby-content"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4 }}
                >
                    <h2 className="lobby-title">Game Full</h2>
                    <GameStatus message="This game already has 2 players." />
                    <button className="ready-btn active" onClick={() => navigate("/")}>
                        Go Home
                    </button>
                </motion.div>
            </div>
        );
    }

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
                    message={playerId === 1 ? "Waiting for opponent to join..." : "Joining game..."}
                />
                {urlGameId && playerId === 1 && (
                    <div className="lobby-link-section">
                        <p className="lobby-instruction">Share this link with your opponent:</p>
                        <CopyLinkButton gameId={urlGameId} />
                        <p className="lobby-instruction">Or share the game code:</p>
                        <div className="lobby-game-code">{urlGameId.toUpperCase()}</div>
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
