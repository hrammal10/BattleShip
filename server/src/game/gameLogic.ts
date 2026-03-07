import { BOARD_SIZE, CELL, SHIP_LIST } from "./constants";
import { ShipPlacement, ShotResult } from "./types";

export function createEmptyBoard(): number[][] {
    return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(CELL.EMPTY));
}

export function validateFleetPlacement(
    ships: ShipPlacement[],
): { valid: true } | { valid: false; reason: string } {
    const expectedIds = SHIP_LIST.map((s) => s.id);
    const providedIds = ships.map((s) => s.shipId);

    if (providedIds.length !== expectedIds.length) {
        return { valid: false, reason: "Must place exactly 5 ships" };
    }

    for (const id of expectedIds) {
        if (!providedIds.includes(id)) {
            return { valid: false, reason: `Missing ship: ${id}` };
        }
    }

    const occupiedCells = new Set<string>();

    for (const ship of ships) {
        const expected = SHIP_LIST.find((s) => s.id === ship.shipId);
        if (!expected) {
            return { valid: false, reason: `Unknown ship: ${ship.shipId}` };
        }

        if (ship.cells.length !== expected.length) {
            return {
                valid: false,
                reason: `${ship.shipId} must be ${expected.length} cells`,
            };
        }

        for (const cell of ship.cells) {
            if (
                cell.row < 0 ||
                cell.row >= BOARD_SIZE ||
                cell.col < 0 ||
                cell.col >= BOARD_SIZE
            ) {
                return { valid: false, reason: `${ship.shipId} is out of bounds` };
            }
        }

        if (!isContiguousLine(ship.cells)) {
            return { valid: false, reason: `${ship.shipId} must be a straight line` };
        }

        for (const cell of ship.cells) {
            const key = `${cell.row},${cell.col}`;
            if (occupiedCells.has(key)) {
                return { valid: false, reason: `Ships overlap at (${cell.row}, ${cell.col})` };
            }
            occupiedCells.add(key);
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
): { board: number[][]; result: ShotResult; sunkShipId?: string; sunkShipCells?: { row: number; col: number }[] } {
    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
        throw new Error("Shot out of bounds");
    }
    if (board[row][col] === CELL.HIT || board[row][col] === CELL.MISS) {
        throw new Error("Cell already targeted");
    }

    const newBoard = board.map((r) => [...r]);

    if (newBoard[row][col] === CELL.SHIP) {
        newBoard[row][col] = CELL.HIT;

        const hitShip = ships.find((s) => s.cells.some((c) => c.row === row && c.col === col));

        if (hitShip) {
            const allHit = hitShip.cells.every((c) => newBoard[c.row][c.col] === CELL.HIT);
            if (allHit) {
                return { board: newBoard, result: "sunk", sunkShipId: hitShip.shipId, sunkShipCells: hitShip.cells };
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
    return board.map((row) => row.map((cell) => (cell === CELL.SHIP ? CELL.EMPTY : cell)));
}
