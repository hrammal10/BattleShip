export const BOARD_SIZE = 10;

export const SHIPS = Object.freeze({
    carrier: { id: "carrier", length: 5 },
    battleship: { id: "battleship", length: 4 },
    cruiser: { id: "cruiser", length: 3 },
    submarine: { id: "submarine", length: 3 },
    destroyer: { id: "destroyer", length: 2 },
} as const);

export const SHIP_LIST = Object.values(SHIPS);

export const CELL = Object.freeze({
    EMPTY: 0,
    SHIP: 1,
    MISS: 2,
    HIT: 3,
} as const);
