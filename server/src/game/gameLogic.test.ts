import { describe, it, expect } from "vitest";
import {
    createEmptyBoard,
    processShot,
    checkAllShipsSunk,
    validateFleetPlacement,
    findValidShipPlacement,
    isValidTurn,
    sanitizeBoardForOpponent,
} from "./gameLogic";
import { CELL, BOARD_SIZE } from "./constants";
import type { ShipPlacement } from "./types";

// ── helpers ──────────────────────────────────────────────────────────────────

function makeFleet(): ShipPlacement[] {
    return [
        {
            shipId: "carrier",
            cells: [
                { row: 0, col: 0 },
                { row: 0, col: 1 },
                { row: 0, col: 2 },
                { row: 0, col: 3 },
                { row: 0, col: 4 },
            ],
        },
        {
            shipId: "battleship",
            cells: [
                { row: 1, col: 0 },
                { row: 1, col: 1 },
                { row: 1, col: 2 },
                { row: 1, col: 3 },
            ],
        },
        {
            shipId: "cruiser",
            cells: [
                { row: 2, col: 0 },
                { row: 2, col: 1 },
                { row: 2, col: 2 },
            ],
        },
        {
            shipId: "submarine",
            cells: [
                { row: 3, col: 0 },
                { row: 3, col: 1 },
                { row: 3, col: 2 },
            ],
        },
        {
            shipId: "destroyer",
            cells: [
                { row: 4, col: 0 },
                { row: 4, col: 1 },
            ],
        },
    ];
}

function boardWithShips(ships: ShipPlacement[]): number[][] {
    const board = createEmptyBoard();
    for (const ship of ships) {
        for (const c of ship.cells) board[c.row][c.col] = CELL.SHIP;
    }
    return board;
}

// ── createEmptyBoard ─────────────────────────────────────────────────────────

describe("createEmptyBoard", () => {
    it("creates a 10×10 board filled with EMPTY", () => {
        const board = createEmptyBoard();
        expect(board).toHaveLength(BOARD_SIZE);
        expect(board[0]).toHaveLength(BOARD_SIZE);
        expect(board.every((row) => row.every((cell) => cell === CELL.EMPTY))).toBe(true);
    });

    it("returns independent rows (no shared references)", () => {
        const board = createEmptyBoard();
        board[0][0] = CELL.SHIP;
        expect(board[1][0]).toBe(CELL.EMPTY);
    });
});

// ── isValidTurn ──────────────────────────────────────────────────────────────

describe("isValidTurn", () => {
    it("returns true when turn matches player", () => {
        expect(isValidTurn(1, 1)).toBe(true);
        expect(isValidTurn(2, 2)).toBe(true);
    });
    it("returns false when turn does not match player", () => {
        expect(isValidTurn(1, 2)).toBe(false);
        expect(isValidTurn(2, 1)).toBe(false);
    });
});

// ── processShot ──────────────────────────────────────────────────────────────

describe("processShot", () => {
    it("returns miss when targeting an empty cell", () => {
        const board = createEmptyBoard();
        const { result, board: newBoard } = processShot(board, [], 3, 5);
        expect(result).toBe("miss");
        expect(newBoard[3][5]).toBe(CELL.MISS);
    });

    it("returns hit when targeting a ship cell that is not fully sunk", () => {
        const ships = makeFleet();
        const board = boardWithShips(ships);
        const { result, board: newBoard } = processShot(board, ships, 0, 0);
        expect(result).toBe("hit");
        expect(newBoard[0][0]).toBe(CELL.HIT);
    });

    it("returns sunk with shipId/cells when all cells of a ship are hit", () => {
        const ships: ShipPlacement[] = [
            {
                shipId: "destroyer",
                cells: [
                    { row: 5, col: 5 },
                    { row: 5, col: 6 },
                ],
            },
        ];
        let board = boardWithShips(ships);
        board = processShot(board, ships, 5, 5).board;
        const { result, sunkShipId, sunkShipCells } = processShot(board, ships, 5, 6);
        expect(result).toBe("sunk");
        expect(sunkShipId).toBe("destroyer");
        expect(sunkShipCells).toHaveLength(2);
    });

    it("does not mutate the original board", () => {
        const board = createEmptyBoard();
        const original = board[0][0];
        processShot(board, [], 0, 0);
        expect(board[0][0]).toBe(original);
    });

    it("throws when shot is out of bounds", () => {
        expect(() => processShot(createEmptyBoard(), [], -1, 0)).toThrow("out of bounds");
        expect(() => processShot(createEmptyBoard(), [], 0, BOARD_SIZE)).toThrow("out of bounds");
    });

    it("throws when cell was already targeted", () => {
        const board = createEmptyBoard();
        const b2 = processShot(board, [], 0, 0).board;
        expect(() => processShot(b2, [], 0, 0)).toThrow("already targeted");
    });
});

// ── checkAllShipsSunk ────────────────────────────────────────────────────────

describe("checkAllShipsSunk", () => {
    it("returns true for an empty board", () => {
        expect(checkAllShipsSunk(createEmptyBoard())).toBe(true);
    });

    it("returns false when at least one SHIP cell remains", () => {
        const board = createEmptyBoard();
        board[0][0] = CELL.SHIP;
        expect(checkAllShipsSunk(board)).toBe(false);
    });

    it("returns true when only HIT and MISS cells remain", () => {
        const board = createEmptyBoard();
        board[0][0] = CELL.HIT;
        board[1][1] = CELL.MISS;
        expect(checkAllShipsSunk(board)).toBe(true);
    });
});

// ── sanitizeBoardForOpponent ─────────────────────────────────────────────────

describe("sanitizeBoardForOpponent", () => {
    it("replaces SHIP cells with EMPTY, keeps HIT and MISS", () => {
        const board = createEmptyBoard();
        board[0][0] = CELL.SHIP;
        board[1][1] = CELL.HIT;
        board[2][2] = CELL.MISS;
        const sanitized = sanitizeBoardForOpponent(board);
        expect(sanitized[0][0]).toBe(CELL.EMPTY);
        expect(sanitized[1][1]).toBe(CELL.HIT);
        expect(sanitized[2][2]).toBe(CELL.MISS);
    });

    it("does not mutate the original board", () => {
        const board = createEmptyBoard();
        board[0][0] = CELL.SHIP;
        sanitizeBoardForOpponent(board);
        expect(board[0][0]).toBe(CELL.SHIP);
    });
});

// ── validateFleetPlacement ───────────────────────────────────────────────────

describe("validateFleetPlacement", () => {
    it("accepts a valid fleet", () => {
        expect(validateFleetPlacement(makeFleet())).toEqual({ valid: true });
    });

    it("rejects wrong number of ships", () => {
        const result = validateFleetPlacement([makeFleet()[0]]);
        expect(result.valid).toBe(false);
    });

    it("rejects a missing ship id", () => {
        const fleet = makeFleet();
        fleet[0] = { ...fleet[0], shipId: "unknown" };
        expect(validateFleetPlacement(fleet).valid).toBe(false);
    });

    it("rejects a ship with wrong cell count", () => {
        const fleet = makeFleet();
        fleet[0] = { shipId: "carrier", cells: fleet[0].cells.slice(0, 3) };
        expect(validateFleetPlacement(fleet).valid).toBe(false);
    });

    it("rejects overlapping ships", () => {
        const fleet = makeFleet();
        fleet[1] = { ...fleet[1], cells: fleet[0].cells.slice(0, 4) };
        expect(validateFleetPlacement(fleet).valid).toBe(false);
    });

    it("rejects a ship that is not a straight line", () => {
        const fleet = makeFleet();
        fleet[3] = {
            shipId: "submarine",
            cells: [
                { row: 0, col: 0 },
                { row: 1, col: 1 },
                { row: 2, col: 0 },
            ],
        };
        expect(validateFleetPlacement(fleet).valid).toBe(false);
    });

    it("rejects a ship out of bounds", () => {
        const fleet = makeFleet();
        fleet[4] = {
            shipId: "destroyer",
            cells: [
                { row: 9, col: 9 },
                { row: 9, col: 10 },
            ],
        };
        expect(validateFleetPlacement(fleet).valid).toBe(false);
    });
});

// ── findValidShipPlacement ───────────────────────────────────────────────────

describe("findValidShipPlacement", () => {
    it("finds a valid placement on an empty board", () => {
        const board = createEmptyBoard();
        const cells = findValidShipPlacement(board, 3);
        expect(cells).not.toBeNull();
        expect(cells!).toHaveLength(3);
    });

    it("returns null when the board is completely full", () => {
        const board = createEmptyBoard().map((row) => row.map(() => CELL.SHIP));
        expect(findValidShipPlacement(board, 2)).toBeNull();
    });

    it("places ship cells only on EMPTY cells", () => {
        const board = createEmptyBoard();
        const cells = findValidShipPlacement(board, 4)!;
        for (const c of cells) {
            expect(board[c.row][c.col]).toBe(CELL.EMPTY);
        }
    });

    it("always finds a placement when one exists (determinism guarantee)", () => {
        // Fill all but one row to force a tight space
        const board = createEmptyBoard();
        for (let r = 0; r < BOARD_SIZE - 1; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) board[r][c] = CELL.SHIP;
        }
        // Last row has 10 empty cells — a size-2 ship must fit
        const cells = findValidShipPlacement(board, 2);
        expect(cells).not.toBeNull();
    });
});
