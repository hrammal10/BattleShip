export enum GameState {
    WAITING = "WAITING",
    SETUP = "SETUP",
    IN_PROGRESS = "IN_PROGRESS",
    FINISHED = "FINISHED",
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
