import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useGame } from "../hooks/useGame";
import Board from "../components/Board";
import GameStatus from "../components/GameStatus";
import ChatBox from "../components/ChatBox";
import { GameState, CELL, PRESIDENTS, PresidentId } from "../types/game";
import PresidentSidebar from "../components/PresidentSidebar";
import { useGameNavigation } from "../hooks/useGameNavigation";
import "./GamePage.css";

const GAME_ROUTES = {
    [GameState.SETUP]: "/setup",
};

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
        president,
        enemyPresident,
        abilityUsed,
        radarCells,
        useAbility: activateAbility,
        sweepCharges,
        resetGame,
        enemyShips,
    } = useGame();

    const [hasRequestedRematch, setHasRequestedRematch] = useState(false);
    const [abilityMode, setAbilityMode] = useState(false);

    useGameNavigation(urlGameId, GAME_ROUTES, true);

    useEffect(() => {
        if (gameState === GameState.IN_PROGRESS) {
            setHasRequestedRematch(false);
        }
    }, [gameState]);

    // Exit ability mode if ability was used
    useEffect(() => {
        if (abilityUsed) setAbilityMode(false);
    }, [abilityUsed]);

    const presidentDef = president ? PRESIDENTS.find((p) => p.id === president) : null;
    const enemyPresidentDef = enemyPresident
        ? PRESIDENTS.find((p) => p.id === enemyPresident)
        : null;

    const handleAttack = (row: number, col: number) => {
        if (!isMyTurn) return;

        if (abilityMode && presidentDef) {
            if (presidentDef.id === PresidentId.STRATEGIST) {
                activateAbility(row, col);
                setAbilityMode(false);
                return;
            }
            // Juggernaut uses label clicks, not cell clicks — ignore cell clicks in ability mode
            if (presidentDef.id === PresidentId.JUGGERNAUT) return;
        }

        if (attackBoard[row][col] === CELL.HIT || attackBoard[row][col] === CELL.MISS) return;
        fireShot(row, col);
    };

    const handleSweepRow = (row: number) => {
        activateAbility(row, undefined, "row");
        setAbilityMode(false);
    };

    const handleSweepCol = (col: number) => {
        activateAbility(undefined, col, "col");
        setAbilityMode(false);
    };

    const handleUseAbility = () => {
        if (!presidentDef || !isMyTurn) return;
        if (presidentDef.id === PresidentId.JUGGERNAUT) {
            if (sweepCharges === 0) return;
            setAbilityMode(!abilityMode);
            return;
        }
        if (abilityUsed) return;
        if (presidentDef.id === PresidentId.GHOST) {
            activateAbility();
        } else {
            setAbilityMode(!abilityMode);
        }
    };

    const handleRematch = () => {
        if (hasRequestedRematch) return;
        setHasRequestedRematch(true);
        requestRematch();
    };

    const isFinished = gameState === GameState.FINISHED && winner && playerId;
    const isWinner = isFinished && winner === playerId;
    const statusMessage = abilityMode
        ? presidentDef?.id === PresidentId.JUGGERNAUT
            ? `Broadside! Click a row letter or column number to sweep (${sweepCharges} charge${sweepCharges !== 1 ? "s" : ""} left)`
            : `Click the attack board to use ${presidentDef?.abilityName}!`
        : isMyTurn
          ? "YOUR TURN — Fire!"
          : "ENEMY'S TURN — Stand by...";

    return (
        <div className="game-page">
            {!isFinished && (
                <GameStatus message={statusMessage} isMyTurn={isMyTurn || abilityMode} />
            )}

            <div className="game-boards">
                <PresidentSidebar president={presidentDef ?? null} />

                <div className="board-wrapper">
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
                </div>

                <div className="board-wrapper">
                    <Board
                        board={attackBoard}
                        onCellClick={handleAttack}
                        onRowLabelClick={
                            abilityMode && presidentDef?.id === PresidentId.JUGGERNAUT
                                ? handleSweepRow
                                : undefined
                        }
                        onColLabelClick={
                            abilityMode && presidentDef?.id === PresidentId.JUGGERNAUT
                                ? handleSweepCol
                                : undefined
                        }
                        interactive={isMyTurn || abilityMode}
                        showShips={false}
                        shipOverlays={
                            isFinished && enemyShips.length > 0
                                ? enemyShips.map((s) => {
                                      const wasSunk = sunkEnemyShips.some(
                                          (sunk) => sunk.shipId === s.shipId,
                                      );
                                      return { shipId: s.shipId, cells: s.cells, isSunk: wasSunk };
                                  })
                                : sunkEnemyShips.map((s) => ({
                                      shipId: s.shipId,
                                      cells: s.cells,
                                      isSunk: true,
                                  }))
                        }
                        radarCells={radarCells}
                        title="Attack Board"
                    />
                </div>

                <div className="right-sidebar-col">
                    <PresidentSidebar president={enemyPresidentDef ?? null} isEnemy />

                    {presidentDef && (
                        <div className="ability-sidebar">
                            <span className="ability-sidebar-icon">{presidentDef.icon}</span>
                            {presidentDef.abilityType === "passive" ? (
                                <span className="ability-panel-badge passive">✨ Passive</span>
                            ) : presidentDef.id === PresidentId.JUGGERNAUT ? (
                                sweepCharges === 0 && abilityUsed ? (
                                    <span className="ability-panel-badge used">✓ Used</span>
                                ) : (
                                    <button
                                        className={`ability-panel-btn ${abilityMode ? "active" : ""}`}
                                        onClick={handleUseAbility}
                                        disabled={!isMyTurn || !!isFinished || sweepCharges === 0}
                                        title="Spend 1 charge to sweep a row or column"
                                    >
                                        {abilityMode ? "Cancel" : `⚡ ${sweepCharges}`}
                                    </button>
                                )
                            ) : abilityUsed ? (
                                <span className="ability-panel-badge used">✓ Used</span>
                            ) : (
                                <button
                                    className={`ability-panel-btn ${abilityMode ? "active" : ""}`}
                                    onClick={handleUseAbility}
                                    disabled={!isMyTurn || !!isFinished}
                                    title="One-time use per game"
                                >
                                    {abilityMode ? "Cancel" : "Use (1×)"}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="game-footer">
                {isFinished && (
                    <motion.div
                        className={`game-over-panel ${isWinner ? "victory" : "defeat"}`}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                    >
                        <h2 className="game-over-title">{isWinner ? "VICTORY!" : "DEFEAT"}</h2>
                        <p className="game-over-subtitle">
                            {isWinner
                                ? "You sank the entire enemy fleet!"
                                : "Your fleet has been destroyed."}
                        </p>
                        <button
                            className={`rematch-btn ${hasRequestedRematch ? "requested" : ""}`}
                            onClick={handleRematch}
                            disabled={hasRequestedRematch}
                        >
                            Rematch ({rematchCount}/2)
                        </button>
                        <button
                            className="home-btn"
                            onClick={() => {
                                resetGame();
                                navigate("/");
                            }}
                        >
                            Home
                        </button>
                    </motion.div>
                )}
                <ChatBox />
            </div>
        </div>
    );
}
