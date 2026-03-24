import { useState, useCallback, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useGame } from "../hooks/useGame";
import Board from "../components/Board";
import type { GhostOverlay } from "../components/Board";
import ShipTray from "../components/ShipTray";
import GameStatus from "../components/GameStatus";
import { BOARD_SIZE, CELL, GameState, SHIPS, PRESIDENTS, PresidentId } from "../types/game";
import type { ShipDefinition, ShipPlacement } from "../types/game";
import PresidentSidebar from "../components/PresidentSidebar";
import { useGameNavigation } from "../hooks/useGameNavigation";
import "./SetupPage.css";

const SETUP_ROUTES = {
    [GameState.IN_PROGRESS]: "/game",
};

function getShipCells(
    ship: ShipDefinition,
    row: number,
    col: number,
    isHorizontal: boolean,
): { row: number; col: number }[] {
    const offset = Math.floor(ship.length / 2);
    const startRow = isHorizontal ? row : row - offset;
    const startCol = isHorizontal ? col - offset : col;
    const cells = [];
    for (let i = 0; i < ship.length; i++) {
        cells.push({
            row: isHorizontal ? startRow : startRow + i,
            col: isHorizontal ? startCol + i : startCol,
        });
    }
    return cells;
}

function isPlacementValid(cells: { row: number; col: number }[], board: number[][]): boolean {
    return cells.every(
        (c) =>
            c.row >= 0 &&
            c.row < BOARD_SIZE &&
            c.col >= 0 &&
            c.col < BOARD_SIZE &&
            board[c.row][c.col] === CELL.EMPTY,
    );
}

export default function SetupPage() {
    const { gameId: urlGameId } = useParams<{ gameId: string }>();
    const { gameState, playerId, placeShips, opponentReady, president, enemyPresident, error } = useGame();

    const [board, setBoard] = useState<number[][]>(() =>
        Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(CELL.EMPTY)),
    );
    const [placements, setPlacements] = useState<ShipPlacement[]>([]);
    const [selectedShip, setSelectedShip] = useState<ShipDefinition | null>(null);
    const [isHorizontal, setIsHorizontal] = useState(true);
    const [hoverCell, setHoverCell] = useState<{ row: number; col: number } | null>(null);
    const [decoyCell, setDecoyCell] = useState<{ row: number; col: number } | null>(null);
    const [placingDecoy, setPlacingDecoy] = useState(false);
    const [isReady, setIsReady] = useState(false);

    const isProvocateur = president === PresidentId.PROVOCATEUR;
    const presidentDef = president ? PRESIDENTS.find((p) => p.id === president) : null;
    const enemyPresidentDef = enemyPresident
        ? PRESIDENTS.find((p) => p.id === enemyPresident)
        : null;

    useGameNavigation(urlGameId, SETUP_ROUTES, true);

    // Reset ready state if the server rejects the ship placement
    useEffect(() => {
        if (error) setIsReady(false);
    }, [error]);

    // R key to rotate
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if ((e.key === "r" || e.key === "R") && selectedShip && !isReady) {
                setIsHorizontal((v) => !v);
            }
        };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [selectedShip, isReady]);

    const handleCellClick = useCallback(
        (row: number, col: number) => {
            if (isReady) return;

            // Decoy placement mode
            if (placingDecoy) {
                if (board[row][col] !== CELL.EMPTY) return;
                setDecoyCell({ row, col });
                setPlacingDecoy(false);
                return;
            }

            // No ship selected — recall placed ship if clicked, or remove decoy
            if (!selectedShip) {
                if (decoyCell?.row === row && decoyCell?.col === col) {
                    setDecoyCell(null);
                    return;
                }
                const placement = placements.find((p) =>
                    p.cells.some((c) => c.row === row && c.col === col),
                );
                if (placement) {
                    const newBoard = board.map((r) => [...r]);
                    for (const cell of placement.cells) newBoard[cell.row][cell.col] = CELL.EMPTY;
                    setBoard(newBoard);
                    setPlacements((prev) => prev.filter((p) => p.shipId !== placement.shipId));
                    setSelectedShip(SHIPS.find((s) => s.id === placement.shipId) ?? null);
                }
                return;
            }

            // Ship selected — validate and place
            const cells = getShipCells(selectedShip, row, col, isHorizontal);
            if (!isPlacementValid(cells, board)) return;

            const newBoard = board.map((r) => [...r]);
            for (const cell of cells) newBoard[cell.row][cell.col] = CELL.SHIP;
            setBoard(newBoard);
            setPlacements((prev) => [...prev, { shipId: selectedShip.id, cells }]);
            setSelectedShip(null);
            setHoverCell(null);
        },
        [selectedShip, isHorizontal, board, placements, isReady, placingDecoy, decoyCell],
    );

    const handleCellHover = useCallback(
        (row: number, col: number) => {
            if (!isReady) setHoverCell({ row, col });
        },
        [isReady],
    );

    const handleBoardLeave = useCallback(() => {
        setHoverCell(null);
    }, []);

    const handleRecallShip = useCallback(
        (shipId: string) => {
            if (isReady) return;
            if (selectedShip?.id === shipId) {
                setSelectedShip(null);
                return;
            }
            const placement = placements.find((p) => p.shipId === shipId);
            if (!placement) return;
            const newBoard = board.map((r) => [...r]);
            for (const cell of placement.cells) newBoard[cell.row][cell.col] = CELL.EMPTY;
            setBoard(newBoard);
            setPlacements((prev) => prev.filter((p) => p.shipId !== shipId));
        },
        [isReady, selectedShip, placements, board],
    );

    const handleReady = () => {
        const allShipsPlaced = placements.length === SHIPS.length;
        const decoyReady = !isProvocateur || decoyCell !== null;
        if (!allShipsPlaced || !decoyReady) return;
        placeShips(placements, board, isProvocateur ? decoyCell : null);
        setIsReady(true);
    };

    const allShipsPlaced = placements.length === SHIPS.length;
    const canReady = allShipsPlaced && (!isProvocateur || decoyCell !== null);

    // Compute ghost overlay
    const ghostOverlay: GhostOverlay | null =
        selectedShip && hoverCell && !isReady
            ? (() => {
                  const cells = getShipCells(
                      selectedShip,
                      hoverCell.row,
                      hoverCell.col,
                      isHorizontal,
                  );
                  return {
                      shipId: selectedShip.id,
                      cells,
                      orientation: isHorizontal ? "horizontal" : "vertical",
                      valid: isPlacementValid(cells, board),
                  };
              })()
            : null;

    const statusMessage = isReady
        ? opponentReady
            ? "Both ready! Starting game..."
            : "Waiting for opponent..."
        : placingDecoy
          ? "Click any empty cell to place your decoy 🎭"
          : selectedShip
            ? `Placing ${selectedShip.name} — click to place, R to rotate (${isHorizontal ? "→" : "↓"})`
            : !allShipsPlaced
              ? "Select a ship from the tray to place it"
              : isProvocateur && !decoyCell
                ? "Now place your decoy — click 🎭 Place Decoy, then pick a cell"
                : "All ships placed! Click Ready";

    return (
        <div className="setup-page">
            <GameStatus message={statusMessage} />

            <motion.div
                className="setup-content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
            >
                <PresidentSidebar president={presidentDef ?? null} />

                <ShipTray
                    placedShipIds={placements.map((p) => p.shipId)}
                    selectedShip={selectedShip}
                    inProgressShipId={null}
                    onSelectShip={(ship) => {
                        setSelectedShip(ship);
                        setPlacingDecoy(false);
                    }}
                    onRecallShip={handleRecallShip}
                    disabled={isReady}
                />

                <Board
                    board={board}
                    onCellClick={handleCellClick}
                    onCellHover={handleCellHover}
                    onBoardLeave={handleBoardLeave}
                    interactive={!isReady && (!!selectedShip || placingDecoy)}
                    showShips={true}
                    placedShipCells={
                        !isReady && !selectedShip && !placingDecoy
                            ? placements.flatMap((p) => p.cells)
                            : []
                    }
                    shipOverlays={placements.map((p) => ({
                        shipId: p.shipId,
                        cells: p.cells,
                    }))}
                    ghostOverlay={ghostOverlay}
                    decoyCell={decoyCell}
                    title="Your Board"
                />

                <PresidentSidebar
                    president={enemyPresidentDef ?? null}
                    isEnemy
                    pendingText="Waiting for opponent..."
                />

                <div className="setup-actions">
                    {isProvocateur && (
                        <button
                            className={`decoy-btn ${placingDecoy ? "active" : ""} ${decoyCell ? "placed" : ""}`}
                            onClick={() => {
                                if (decoyCell) {
                                    setDecoyCell(null);
                                } else {
                                    setPlacingDecoy((v) => !v);
                                    setSelectedShip(null);
                                }
                            }}
                            disabled={isReady}
                        >
                            {decoyCell
                                ? "↩ Recall Decoy"
                                : placingDecoy
                                  ? "Cancel"
                                  : "🎭 Place Decoy"}
                        </button>
                    )}
                    <button
                        className={`ready-btn ${canReady && !isReady ? "active" : ""}`}
                        onClick={handleReady}
                        disabled={!canReady || isReady}
                    >
                        {isReady ? "Ready!" : "Ready"}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
