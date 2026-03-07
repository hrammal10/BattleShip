export const GameState = {
    WAITING: "WAITING",
    SETUP: "SETUP",
    IN_PROGRESS: "IN_PROGRESS",
    FINISHED: "FINISHED",
} as const;

export type GameState = (typeof GameState)[keyof typeof GameState];

export interface ShipPlacement {
    shipId: string;
    cells: { row: number; col: number }[];
}

export interface ShipDefinition {
    id: string;
    length: number;
    name: string;
}

export const SHIPS: ShipDefinition[] = [
    { id: "carrier", length: 5, name: "Carrier" },
    { id: "battleship", length: 4, name: "Battleship" },
    { id: "cruiser", length: 3, name: "Cruiser" },
    { id: "submarine", length: 3, name: "Submarine" },
    { id: "destroyer", length: 2, name: "Destroyer" },
];

export const BOARD_SIZE = 10;

export const CELL = {
    EMPTY: 0,
    SHIP: 1,
    MISS: 2,
    HIT: 3,
} as const;

export type ShotResult = "hit" | "miss" | "sunk";

export type Orientation = "horizontal" | "vertical";

export interface ShotResultEvent {
    row: number;
    col: number;
    result: ShotResult;
    sunkShipId?: string;
    sunkShipCells?: { row: number; col: number }[];
    shooter: 1 | 2;
    nextTurn: 1 | 2;
}
