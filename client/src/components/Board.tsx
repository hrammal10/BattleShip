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

export interface GhostOverlay {
    shipId: string;
    cells: { row: number; col: number }[];
    orientation: "horizontal" | "vertical";
    valid: boolean;
}

interface BoardProps {
    board: number[][];
    onCellClick?: (row: number, col: number) => void;
    onCellHover?: (row: number, col: number) => void;
    onBoardLeave?: () => void;
    onRowLabelClick?: (row: number) => void;
    onColLabelClick?: (col: number) => void;
    interactive?: boolean;
    showShips?: boolean;
    placedShipCells?: { row: number; col: number }[];
    shipOverlays?: ShipOverlay[];
    ghostOverlay?: GhostOverlay | null;
    radarCells?: { row: number; col: number; hasShip: boolean }[];
    decoyCell?: { row: number; col: number } | null;
    title: string;
}

const coordKey = (row: number, col: number) => `${row},${col}`;

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

    const left = PADDING + LABEL_SIZE + GAP + first.col * (CELL_SIZE + GAP);
    const top = PADDING + LABEL_SIZE + GAP + first.row * (CELL_SIZE + GAP);

    return { left, top, orientation: orientation as "horizontal" | "vertical" };
}

export default function Board({
    board,
    onCellClick,
    onCellHover,
    onBoardLeave,
    onRowLabelClick,
    onColLabelClick,
    interactive = false,
    showShips = false,
    placedShipCells = [],
    shipOverlays = [],
    ghostOverlay = null,
    radarCells = [],
    decoyCell = null,
    title,
}: BoardProps) {
    const radarMap = new Map(radarCells.map((rc) => [coordKey(rc.row, rc.col), rc.hasShip]));

    const sunkCells = new Set(
        shipOverlays
            .filter((o) => o.isSunk)
            .flatMap((o) => o.cells.map((c) => coordKey(c.row, c.col))),
    );

    const placedShipSet = new Set(placedShipCells.map((c) => coordKey(c.row, c.col)));

    const ghostCellMap = ghostOverlay
        ? new Map(
              ghostOverlay.cells.map((c) => [
                  coordKey(c.row, c.col),
                  ghostOverlay.valid ? "valid" : ("invalid" as "valid" | "invalid"),
              ]),
          )
        : null;

    return (
        <div className="board-container">
            <h3 className="board-title">{title}</h3>
            <div className="board-grid-wrapper" onMouseLeave={onBoardLeave}>
                <div className="board">
                    <div className="board-corner" />
                    {COL_LABELS.map((label, colIdx) => (
                        <div
                            key={label}
                            className={`board-col-label${onColLabelClick ? " clickable" : ""}`}
                            onClick={() => onColLabelClick?.(colIdx)}
                        >
                            {label}
                        </div>
                    ))}
                    {board.map((row, rowIdx) => (
                        <Fragment key={rowIdx}>
                            <div
                                className={`board-row-label${onRowLabelClick ? " clickable" : ""}`}
                                onClick={() => onRowLabelClick?.(rowIdx)}
                            >
                                {ROW_LABELS[rowIdx]}
                            </div>
                            {row.map((cell, colIdx) => (
                                <Cell
                                    key={`${rowIdx}-${colIdx}`}
                                    value={cell}
                                    onClick={() => onCellClick?.(rowIdx, colIdx)}
                                    onMouseEnter={() => onCellHover?.(rowIdx, colIdx)}
                                    interactive={interactive}
                                    showShips={showShips}
                                    isPlacedShip={placedShipSet.has(coordKey(rowIdx, colIdx))}
                                    isSunkShip={sunkCells.has(coordKey(rowIdx, colIdx))}
                                    isDecoy={decoyCell?.row === rowIdx && decoyCell?.col === colIdx}
                                    radarState={
                                        radarMap.has(coordKey(rowIdx, colIdx))
                                            ? radarMap.get(coordKey(rowIdx, colIdx))
                                                ? "ship"
                                                : "empty"
                                            : undefined
                                    }
                                    ghostState={ghostCellMap?.get(coordKey(rowIdx, colIdx))}
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
                                initial={
                                    overlay.isSunk ? { opacity: 0, scale: 1.3 } : { opacity: 0.85 }
                                }
                                animate={{ opacity: 0.85, scale: 1 }}
                                transition={
                                    overlay.isSunk
                                        ? { duration: 0.6, ease: "easeOut" }
                                        : { duration: 0 }
                                }
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
