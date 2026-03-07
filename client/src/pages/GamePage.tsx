import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useGame } from "../context/GameContext";
import Board from "../components/Board";
import GameStatus from "../components/GameStatus";
import GameOverModal from "../components/GameOverModal";
import { GameState, CELL } from "../types/game";
import "./GamePage.css";

export default function GamePage() {
    const { gameId: urlGameId } = useParams<{ gameId: string }>();
    const navigate = useNavigate();
    const {
        gameState,
        myBoard,
        attackBoard,
        myShips,
        sunkEnemyShips,
        playerId,
        isMyTurn,
        winner,
        rematchCount,
        fireShot,
        requestRematch,
    } = useGame();

    useEffect(() => {
        if (gameState === GameState.SETUP) {
            navigate(`/play/${urlGameId}/setup`);
        }
    }, [gameState, urlGameId, navigate]);

    const handleAttack = (row: number, col: number) => {
        if (!isMyTurn) return;
        if (attackBoard[row][col] === CELL.HIT || attackBoard[row][col] === CELL.MISS) return;
        fireShot(row, col);
    };

    const statusMessage = isMyTurn ? "YOUR TURN — Fire!" : "ENEMY'S TURN — Stand by...";

    return (
        <div className="game-page">
            <GameStatus message={statusMessage} isMyTurn={isMyTurn} />

            <div className="game-boards">
                <motion.div
                    className="board-wrapper"
                    initial={{ x: 0 }}
                    animate={{ x: 0 }}
                    transition={{ type: "spring", damping: 20 }}
                >
                    <Board
                        board={myBoard}
                        showShips={true}
                        interactive={false}
                        shipOverlays={myShips.map((s) => ({
                            shipId: s.shipId,
                            cells: s.cells,
                        }))}
                        title="My Board"
                    />
                </motion.div>

                <motion.div
                    className="board-wrapper"
                    initial={{ x: 200, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ type: "spring", damping: 20, delay: 0.3 }}
                >
                    <Board
                        board={attackBoard}
                        onCellClick={handleAttack}
                        interactive={isMyTurn}
                        showShips={false}
                        shipOverlays={sunkEnemyShips.map((s) => ({
                            shipId: s.shipId,
                            cells: s.cells,
                            isSunk: true,
                        }))}
                        title="Attack Board"
                    />
                </motion.div>
            </div>

            {gameState === GameState.FINISHED && winner && playerId && (
                <GameOverModal
                    winner={winner}
                    playerId={playerId}
                    rematchCount={rematchCount}
                    onRematch={requestRematch}
                />
            )}
        </div>
    );
}
