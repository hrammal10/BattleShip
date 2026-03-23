export const GameState = {
    WAITING: "WAITING",
    PRESIDENT_SELECT: "PRESIDENT_SELECT",
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
    DECOY: 4,
} as const;

export type ShotResult = "hit" | "miss" | "sunk";

export interface ShotResultEvent {
    row: number;
    col: number;
    result: ShotResult;
    sunkShipId?: string;
    sunkShipCells?: { row: number; col: number }[];
    shooter: 1 | 2;
    nextTurn: 1 | 2;
    chargeGained?: boolean;
    fromSweep?: boolean;
    sweepIndex?: number;
    sweepTotal?: number;
}

export const PresidentId = {
    STRATEGIST: "strategist",
    SHIELD: "shield",
    GHOST: "ghost",
    PROVOCATEUR: "provocateur",
    JUGGERNAUT: "juggernaut",
} as const;

export interface President {
    id: string;
    name: string;
    title: string;
    description: string;
    abilityName: string;
    abilityDescription: string;
    abilityType: "active" | "passive";
    icon: string;
}

export const PRESIDENTS: President[] = [
    {
        id: "strategist",
        name: "The Strategist",
        title: "Master of Intelligence",
        description: "Uses surveillance to dominate the battlefield — but intel has a price.",
        abilityName: "War Room",
        abilityDescription:
            "Reveal a 5×5 area of the enemy board. Trade-off: you lose your next 2 turns.",
        abilityType: "active",
        icon: "🔭",
    },
    {
        id: "shield",
        name: "The Shield",
        title: "Defender of the Fleet",
        description: "Fortifies the fleet — but every defense has a crack.",
        abilityName: "Iron Dome",
        abilityDescription:
            "Passively blocks the first 2 hits on your fleet. Trade-off: on first block, 2 of your ship cells are leaked to the enemy.",
        abilityType: "passive",
        icon: "🛡️",
    },
    {
        id: "ghost",
        name: "The Ghost",
        title: "Master of Evasion",
        description: "Vanishes entirely — but disappearing takes time.",
        abilityName: "Phantom Fleet",
        abilityDescription:
            "Relocate ALL your unhit ships at once. Trade-off: opponent gets 2 free shots.",
        abilityType: "active",
        icon: "👻",
    },
    {
        id: "provocateur",
        name: "The Provocateur",
        title: "Master of Misdirection",
        description:
            "Plants false intelligence — but the enemy will eventually see through the ruse.",
        abilityName: "Red Herring",
        abilityDescription:
            "Place a 1-cell decoy on your board during setup. Trade-off: when hit, the enemy sees a hit but no ship ever sinks — wasting their follow-up shots on empty water.",
        abilityType: "passive",
        icon: "🎭",
    },
    {
        id: "juggernaut",
        name: "The Juggernaut",
        title: "Unstoppable Force",
        description:
            "Builds momentum with every kill — but charges must be earned before they can be spent.",
        abilityName: "Broadside",
        abilityDescription:
            "Spend a charge to sweep an entire row of the enemy board. Trade-off: charges are earned by sinking ships first (max 3), and your turn ends when all are exhausted.",
        abilityType: "active",
        icon: "⚓",
    },
];

export interface RadarCell {
    row: number;
    col: number;
    hasShip: boolean;
}
