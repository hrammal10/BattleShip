export enum GameState {
    WAITING = "WAITING",
    PRESIDENT_SELECT = "PRESIDENT_SELECT",
    SETUP = "SETUP",
    IN_PROGRESS = "IN_PROGRESS",
    FINISHED = "FINISHED",
}

export enum PresidentId {
    STRATEGIST = "strategist",
    SHIELD = "shield",
    PROVOCATEUR = "provocateur",
    GHOST = "ghost",
    JUGGERNAUT = "juggernaut",
}

export interface ShipPlacement {
    shipId: string;
    cells: { row: number; col: number }[];
}

export interface IPlayer {
    socketId: string;
    ready: boolean;
    rematchReady: boolean;
    ships: ShipPlacement[];
    president: PresidentId | null;
    abilityUsed: boolean;
    shieldHitsBlocked: number;
    turnsToSkip: number;
    sweepCharges: number;
    decoyCell: { row: number; col: number } | null;
}

export interface IGame {
    gameId: string;
    state: GameState;
    player1: IPlayer | null;
    player2: IPlayer | null;
    board1: number[][];
    board2: number[][];
    turn: 1 | 2;
    winner: 1 | 2 | null;
    createdAt: Date;
    updatedAt: Date;
}

export type ShotResult = "hit" | "miss" | "sunk";
