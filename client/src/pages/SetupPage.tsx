import { useState, useCallback, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useGame } from "../context/GameContext";
import Board from "../components/Board";
import ShipTray from "../components/ShipTray";
import GameStatus from "../components/GameStatus";
import { BOARD_SIZE, CELL, GameState, SHIPS } from "../types/game";
import type { ShipDefinition, ShipPlacement } from "../types/game";
import { playSound } from "../utils/sounds";
import "./SetupPage.css";

export default function SetupPage() {
    const { gameId: urlGameId } = useParams<{ gameId: string }>();
    const navigate = useNavigate();
    const { gameState, placeShips, opponentReady } = useGame();

    const [board, setBoard] = useState<number[][]>(() =>
        Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(CELL.EMPTY)),
    );
    const [placements, setPlacements] = useState<ShipPlacement[]>([]);
    const [selectedShip, setSelectedShip] = useState<ShipDefinition | null>(null);
    const [selectedCells, setSelectedCells] = useState<{ row: number; col: number }[]>([]);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        if (gameState === GameState.IN_PROGRESS) {
            navigate(`/play/${urlGameId}/game`);
        }
    }, [gameState, urlGameId, navigate]);

    // Compute valid next cells based on what's already been selected
    const validNextCells = useMemo(() => {
        if (!selectedShip || selectedCells.length >= selectedShip.length) return [];

        const valid: { row: number; col: number }[] = [];

        if (selectedCells.length === 0) {
            // Any empty cell on the board is valid
            for (let r = 0; r < BOARD_SIZE; r++) {
                for (let c = 0; c < BOARD_SIZE; c++) {
                    if (board[r][c] === CELL.EMPTY) {
                        valid.push({ row: r, col: c });
                    }
                }
            }
            return valid;
        }

        if (selectedCells.length === 1) {
            // Adjacent cells (up/down/left/right) that are empty
            const { row, col } = selectedCells[0];
            const neighbors = [
                { row: row - 1, col },
                { row: row + 1, col },
                { row, col: col - 1 },
                { row, col: col + 1 },
            ];
            for (const n of neighbors) {
                if (
                    n.row >= 0 &&
                    n.row < BOARD_SIZE &&
                    n.col >= 0 &&
                    n.col < BOARD_SIZE &&
                    board[n.row][n.col] === CELL.EMPTY
                ) {
                    valid.push(n);
                }
            }
            return valid;
        }

        // 2+ cells placed: direction is locked, only extend from either end
        const first = selectedCells[0];
        const second = selectedCells[1];
        const isHorizontal = first.row === second.row;

        // Sort cells to find the min and max ends
        const sorted = [...selectedCells].sort((a, b) =>
            isHorizontal ? a.col - b.col : a.row - b.row,
        );
        const minEnd = sorted[0];
        const maxEnd = sorted[sorted.length - 1];

        if (isHorizontal) {
            // Extend left or right
            const left = { row: minEnd.row, col: minEnd.col - 1 };
            const right = { row: maxEnd.row, col: maxEnd.col + 1 };
            if (left.col >= 0 && board[left.row][left.col] === CELL.EMPTY) valid.push(left);
            if (right.col < BOARD_SIZE && board[right.row][right.col] === CELL.EMPTY)
                valid.push(right);
        } else {
            // Extend up or down
            const up = { row: minEnd.row - 1, col: minEnd.col };
            const down = { row: maxEnd.row + 1, col: maxEnd.col };
            if (up.row >= 0 && board[up.row][up.col] === CELL.EMPTY) valid.push(up);
            if (down.row < BOARD_SIZE && board[down.row][down.col] === CELL.EMPTY) valid.push(down);
        }

        return valid;
    }, [selectedShip, selectedCells, board]);

    const handleCellClick = useCallback(
        (row: number, col: number) => {
            if (isReady) return;

            // If clicking a cell that belongs to an already-placed ship, pick it back up
            if (!selectedShip || selectedCells.length === 0) {
                const placement = placements.find((p) =>
                    p.cells.some((c) => c.row === row && c.col === col),
                );
                if (placement) {
                    // Remove the ship from the board
                    const newBoard = board.map((r) => [...r]);
                    for (const cell of placement.cells) {
                        newBoard[cell.row][cell.col] = CELL.EMPTY;
                    }
                    setBoard(newBoard);
                    setPlacements((prev) => prev.filter((p) => p.shipId !== placement.shipId));
                    // Auto-select the ship for re-placement
                    const shipDef = SHIPS.find((s) => s.id === placement.shipId) || null;
                    setSelectedShip(shipDef);
                    setSelectedCells([]);
                    return;
                }
            }

            if (!selectedShip) return;

            // If clicking a cell that's already placed in the current selection, undo back to it
            const placedIndex = selectedCells.findIndex(
                (c) => c.row === row && c.col === col,
            );
            if (placedIndex !== -1) {
                setSelectedCells((prev) => prev.slice(0, placedIndex));
                return;
            }

            // Check if this cell is a valid next pick
            const isValid = validNextCells.some((c) => c.row === row && c.col === col);
            if (!isValid) return;

            const newCells = [...selectedCells, { row, col }];
            setSelectedCells(newCells);

            // If all cells for this ship are placed, finalize
            if (newCells.length === selectedShip.length) {
                const newBoard = board.map((r) => [...r]);
                for (const cell of newCells) {
                    newBoard[cell.row][cell.col] = CELL.SHIP;
                }
                setBoard(newBoard);
                setPlacements((prev) => [...prev, { shipId: selectedShip.id, cells: newCells }]);
                setSelectedShip(null);
                setSelectedCells([]);
                playSound("place");
            }
        },
        [selectedShip, selectedCells, validNextCells, board, placements, isReady],
    );

    const handleReady = () => {
        if (placements.length !== 5) return;
        placeShips(placements, board);
        setIsReady(true);
    };

    const allShipsPlaced = placements.length === 5;

    const statusMessage = isReady
        ? opponentReady
            ? "Both ready! Starting game..."
            : "Waiting for opponent..."
        : selectedShip
          ? selectedCells.length > 0
              ? `${selectedShip.name}: ${selectedCells.length}/${selectedShip.length} cells placed`
              : `Place your ${selectedShip.name} (${selectedShip.length} cells)`
          : allShipsPlaced
            ? "All ships placed! Click Ready"
            : "Select a ship to place";

    return (
        <div className="setup-page">
            <GameStatus message={statusMessage} />

            <motion.div
                className="setup-content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
            >
                <ShipTray
                    placedShipIds={placements.map((p) => p.shipId)}
                    selectedShip={selectedShip}
                    onSelectShip={(ship) => {
                        setSelectedShip(ship);
                        setSelectedCells([]);
                    }}
                />

                <Board
                    board={board}
                    onCellClick={handleCellClick}
                    interactive={!isReady && !!selectedShip}
                    showShips={true}
                    placingCells={selectedCells}
                    validNextCells={validNextCells}
                    placedShipCells={
                        !isReady && selectedCells.length === 0
                            ? placements.flatMap((p) => p.cells)
                            : []
                    }
                    shipOverlays={placements.map((p) => ({
                        shipId: p.shipId,
                        cells: p.cells,
                    }))}
                    title="Your Board"
                />

                <div className="setup-actions">
                    <button
                        className={`ready-btn ${allShipsPlaced && !isReady ? "active" : ""}`}
                        onClick={handleReady}
                        disabled={!allShipsPlaced || isReady}
                    >
                        {isReady ? "Ready!" : "Ready"}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
