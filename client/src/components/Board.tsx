import { Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Cell from "./Cell";
import ShipSprite from "./ShipSprite";
import "./Board.css";

export interface ShipOverlay {
    shipId: string;
    cells: { row: number; col: number }[];
    isSunk?: boolean;
}

interface BoardProps {
    board: number[][];
    onCellClick?: (row: number, col: number) => void;
    interactive?: boolean;
    showShips?: boolean;
    placingCells?: { row: number; col: number }[];
    validNextCells?: { row: number; col: number }[];
    placedShipCells?: { row: number; col: number }[];
    shipOverlays?: ShipOverlay[];
    title: string;
}

const COL_LABELS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
const ROW_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

const CELL_SIZE = 40;
const LABEL_SIZE = 30;
const GAP = 1;
const PADDING = 2;

function getOverlayStyle(cells: { row: number; col: number }[]) {
    const sorted = [...cells].sort((a, b) => a.row - b.row || a.col - b.col);
    const first = sorted[0];
    const isHorizontal = sorted.every((c) => c.row === first.row);
    const orientation = isHorizontal ? "horizontal" : "vertical";

    // Position: padding + label + gap, then cell index * (cellSize + gap)
    const left = PADDING + LABEL_SIZE + GAP + first.col * (CELL_SIZE + GAP);
    const top = PADDING + LABEL_SIZE + GAP + first.row * (CELL_SIZE + GAP);

    return { left, top, orientation: orientation as "horizontal" | "vertical" };
}

export default function Board({
    board,
    onCellClick,
    interactive = false,
    showShips = false,
    placingCells = [],
    validNextCells = [],
    placedShipCells = [],
    shipOverlays = [],
    title,
}: BoardProps) {
    const sunkCells = new Set(
        shipOverlays
            .filter((o) => o.isSunk)
            .flatMap((o) => o.cells.map((c) => `${c.row},${c.col}`)),
    );

    const isPlacing = (row: number, col: number) =>
        placingCells.some((c) => c.row === row && c.col === col);

    const isValidNext = (row: number, col: number) =>
        validNextCells.some((c) => c.row === row && c.col === col);

    const isPlacedShip = (row: number, col: number) =>
        placedShipCells.some((c) => c.row === row && c.col === col);

    // If placement props are provided, restrict interactivity to specific cells.
    // Otherwise (attack board), all cells are interactive when interactive=true.
    const inPlacementMode =
        placingCells.length > 0 || validNextCells.length > 0 || placedShipCells.length > 0;

    return (
        <div className="board-container">
            <h3 className="board-title">{title}</h3>
            <div className="board-grid-wrapper">
                <div className="board">
                    <div className="board-corner" />
                    {COL_LABELS.map((label) => (
                        <div key={label} className="board-col-label">
                            {label}
                        </div>
                    ))}
                    {board.map((row, rowIdx) => (
                        <Fragment key={rowIdx}>
                            <div className="board-row-label">{ROW_LABELS[rowIdx]}</div>
                            {row.map((cell, colIdx) => (
                                <Cell
                                    key={`${rowIdx}-${colIdx}`}
                                    value={cell}
                                    row={rowIdx}
                                    col={colIdx}
                                    onClick={() => onCellClick?.(rowIdx, colIdx)}
                                    interactive={
                                        inPlacementMode
                                            ? (interactive && isValidNext(rowIdx, colIdx)) ||
                                              isPlacing(rowIdx, colIdx) ||
                                              isPlacedShip(rowIdx, colIdx)
                                            : interactive
                                    }
                                    showShips={showShips}
                                    isPlacing={isPlacing(rowIdx, colIdx)}
                                    isValidNext={interactive && isValidNext(rowIdx, colIdx)}
                                    isPlacedShip={isPlacedShip(rowIdx, colIdx)}
                                    isSunkShip={sunkCells.has(`${rowIdx},${colIdx}`)}
                                />
                            ))}
                        </Fragment>
                    ))}
                </div>
                <AnimatePresence>
                    {shipOverlays.map((overlay) => {
                        const { left, top, orientation } = getOverlayStyle(overlay.cells);
                        return (
                            <motion.div
                                key={overlay.shipId}
                                className="ship-overlay"
                                style={{ left, top }}
                                initial={overlay.isSunk ? { opacity: 0, scale: 1.3 } : { opacity: 0.85 }}
                                animate={{ opacity: 0.85, scale: 1 }}
                                transition={overlay.isSunk ? { duration: 0.6, ease: "easeOut" } : { duration: 0 }}
                            >
                                <ShipSprite
                                    shipId={overlay.shipId}
                                    cellSize={CELL_SIZE}
                                    orientation={orientation}
                                    isSunk={overlay.isSunk}
                                />
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </div>
    );
}
