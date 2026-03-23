import { createContext } from "react";
import { GameState } from "../types/game";
import type { ShipPlacement, RadarCell } from "../types/game";

export interface SunkShip {
    shipId: string;
    cells: { row: number; col: number }[];
}

export interface GameContextState {
    gameId: string | null;
    playerId: 1 | 2 | null;
    gameState: GameState;
    myBoard: number[][];
    attackBoard: number[][];
    myShips: ShipPlacement[];
    sunkEnemyShips: SunkShip[];
    mySunkShips: SunkShip[];
    turn: 1 | 2;
    winner: 1 | 2 | null;
    opponentReady: boolean;
    rematchCount: number;
    connected: boolean;
    error: string | null;
    president: string | null;
    enemyPresident: string | null;
    abilityUsed: boolean;
    radarCells: RadarCell[];
    sweepCharges: number;
    enemyShips: SunkShip[];
    chatMessages: { from: 1 | 2; text: string; ts: number }[];
}

export interface GameContextValue extends GameContextState {
    createGame: () => void;
    joinGame: (gameId: string) => void;
    rejoinGame: (gameId: string, playerId: 1 | 2) => void;
    placeShips: (
        ships: ShipPlacement[],
        board: number[][],
        decoyCell?: { row: number; col: number } | null,
    ) => void;
    fireShot: (row: number, col: number) => void;
    requestRematch: () => void;
    isMyTurn: boolean;
    clearError: () => void;
    selectPresident: (presidentId: string) => void;
    useAbility: (row?: number, col?: number, direction?: "row" | "col") => void;
    resetGame: () => void;
}

export const GameContext = createContext<GameContextValue | null>(null);
