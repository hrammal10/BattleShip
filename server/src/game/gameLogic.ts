import { BOARD_SIZE, CELL, SHIP_LIST } from "./constants";
import { ShipPlacement, ShotResult } from "./types";

const coordKey = (row: number, col: number) => `${row},${col}`;

export function createEmptyBoard(): number[][] {
    return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(CELL.EMPTY));
}

export function validateFleetPlacement(
    ships: ShipPlacement[],
): { valid: true } | { valid: false; reason: string } {
    const expectedById = new Map<string, (typeof SHIP_LIST)[number]>(
        SHIP_LIST.map((s) => [s.id, s]),
    );

    if (ships.length !== expectedById.size) {
        return { valid: false, reason: "Must place exactly 5 ships" };
    }

    const seenIds = new Set<string>();
    const occupiedCells = new Set<string>();

    for (const { shipId, cells } of ships) {
        const expected = expectedById.get(shipId);
        if (!expected) return { valid: false, reason: `Unknown ship: ${shipId}` };
        if (seenIds.has(shipId)) return { valid: false, reason: `Duplicate ship: ${shipId}` };
        seenIds.add(shipId);

        if (cells.length !== expected.length) {
            return { valid: false, reason: `${shipId} must be ${expected.length} cells` };
        }

        for (const { row, col } of cells) {
            if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
                return { valid: false, reason: `${shipId} is out of bounds` };
            }
            const key = coordKey(row, col);
            if (occupiedCells.has(key)) {
                return { valid: false, reason: `Ships overlap at (${row}, ${col})` };
            }
            occupiedCells.add(key);
        }

        if (!isContiguousLine(cells)) {
            return { valid: false, reason: `${shipId} must be a straight line` };
        }
    }

    return { valid: true };
}

function isContiguousLine(cells: { row: number; col: number }[]): boolean {
    if (cells.length <= 1) return true;

    const sorted = [...cells].sort((a, b) => a.row - b.row || a.col - b.col);

    const isHorizontal = sorted.every((c) => c.row === sorted[0].row);
    const isVertical = sorted.every((c) => c.col === sorted[0].col);

    if (!isHorizontal && !isVertical) return false;

    for (let i = 1; i < sorted.length; i++) {
        const dr = sorted[i].row - sorted[i - 1].row;
        const dc = sorted[i].col - sorted[i - 1].col;
        if (isHorizontal && dc !== 1) return false;
        if (isVertical && dr !== 1) return false;
    }

    return true;
}

export function processShot(
    board: number[][],
    ships: ShipPlacement[],
    row: number,
    col: number,
): {
    board: number[][];
    result: ShotResult;
    sunkShipId?: string;
    sunkShipCells?: { row: number; col: number }[];
} {
    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
        throw new Error("Shot out of bounds");
    }
    if (board[row][col] === CELL.HIT || board[row][col] === CELL.MISS) {
        throw new Error("Cell already targeted");
    }

    const newBoard = board.map((r) => [...r]);

    // Decoy cell: registers as a hit but never sinks — baits follow-up shots
    if (newBoard[row][col] === CELL.DECOY) {
        newBoard[row][col] = CELL.HIT;
        return { board: newBoard, result: "hit" };
    }

    if (newBoard[row][col] === CELL.SHIP) {
        newBoard[row][col] = CELL.HIT;

        const hitShip = ships.find((s) => s.cells.some((c) => c.row === row && c.col === col));

        if (hitShip) {
            const allHit = hitShip.cells.every((c) => newBoard[c.row][c.col] === CELL.HIT);
            if (allHit) {
                return {
                    board: newBoard,
                    result: "sunk",
                    sunkShipId: hitShip.shipId,
                    sunkShipCells: hitShip.cells,
                };
            }
        }

        return { board: newBoard, result: "hit" };
    }

    newBoard[row][col] = CELL.MISS;
    return { board: newBoard, result: "miss" };
}

export function isValidTurn(turn: 1 | 2, playerNumber: 1 | 2): boolean {
    return turn === playerNumber;
}

export function checkAllShipsSunk(board: number[][]): boolean {
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (board[r][c] === CELL.SHIP) {
                return false;
            }
        }
    }
    return true;
}

export function sanitizeBoardForOpponent(board: number[][]): number[][] {
    return board.map((row) =>
        row.map((cell) => (cell === CELL.SHIP || cell === CELL.DECOY ? CELL.EMPTY : cell)),
    );
}

export function findValidShipPlacement(
    board: number[][],
    shipLength: number,
): { row: number; col: number }[] | null {
    // Collect all valid placements, then pick one at random — guaranteed to find
    // a placement if one exists (unlike the previous probabilistic retry loop).
    const candidates: { row: number; col: number; horizontal: boolean }[] = [];

    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            if (col + shipLength <= BOARD_SIZE) {
                const fits = Array.from(
                    { length: shipLength },
                    (_, i) => board[row][col + i],
                ).every((v) => v === CELL.EMPTY);
                if (fits) candidates.push({ row, col, horizontal: true });
            }
            if (row + shipLength <= BOARD_SIZE) {
                const fits = Array.from(
                    { length: shipLength },
                    (_, i) => board[row + i][col],
                ).every((v) => v === CELL.EMPTY);
                if (fits) candidates.push({ row, col, horizontal: false });
            }
        }
    }

    if (candidates.length === 0) return null;

    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    return Array.from({ length: shipLength }, (_, i) => ({
        row: pick.horizontal ? pick.row : pick.row + i,
        col: pick.horizontal ? pick.col + i : pick.col,
    }));
}
