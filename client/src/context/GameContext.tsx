import { useReducer, useCallback } from "react";
import type { ReactNode } from "react";
import socket from "../socket";
import { GameState, BOARD_SIZE, CELL } from "../types/game";
import type { ShipPlacement } from "../types/game";
import type { GameAction } from "../hooks/types";
import { useSocketEvents } from "../hooks/useSocketEvents";
import { GameContext } from "./gameContextDef";
import type { GameContextState, GameContextValue } from "./gameContextDef";

function createEmptyBoard(): number[][] {
    return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(CELL.EMPTY));
}

const initialState: GameContextState = {
    gameId: null,
    playerId: null,
    gameState: GameState.WAITING,
    myBoard: createEmptyBoard(),
    attackBoard: createEmptyBoard(),
    myShips: [],
    sunkEnemyShips: [],
    mySunkShips: [],
    turn: 1,
    winner: null,
    opponentReady: false,
    rematchCount: 0,
    connected: false,
    error: null,
    president: null,
    enemyPresident: null,
    abilityUsed: false,
    radarCells: [],
    sweepCharges: 0,
    enemyShips: [],
    chatMessages: [],
};

function gameReducer(state: GameContextState, action: GameAction): GameContextState {
    switch (action.type) {
        case "GAME_CREATED":
            return {
                ...state,
                gameId: action.gameId,
                playerId: action.playerId,
                gameState: GameState.WAITING,
            };
        case "GAME_JOINED":
            return {
                ...state,
                gameId: action.gameId,
                playerId: action.playerId,
            };
        case "OPPONENT_JOINED":
            return state;
        case "PRESIDENT_SELECT":
            return { ...state, gameState: GameState.PRESIDENT_SELECT };
        case "PRESIDENT_CHOSEN":
            return { ...state, president: action.presidentId };
        case "ENEMY_PRESIDENT_REVEALED":
            return { ...state, enemyPresident: action.presidentId };
        case "ABILITY_USED":
            return { ...state, abilityUsed: true };
        case "SWEEP_CHARGED":
            return { ...state, sweepCharges: Math.min(3, state.sweepCharges + 1) };
        case "SWEEP_USED":
            return {
                ...state,
                sweepCharges: action.chargesRemaining,
                abilityUsed: action.chargesRemaining === 0,
            };
        case "RADAR_REVEALED":
            return { ...state, radarCells: [...state.radarCells, ...action.cells] };
        case "SNIPER_REVEALED":
            return {
                ...state,
                radarCells: [
                    ...state.radarCells,
                    { row: action.row, col: action.col, hasShip: true },
                ],
            };
        case "GHOST_MOVED": {
            const newMyShips = state.myShips.map((s) =>
                s.shipId === action.shipId ? { ...s, cells: action.newCells } : s,
            );
            return { ...state, myShips: newMyShips };
        }
        case "SETUP_PHASE":
            return {
                ...state,
                gameState: GameState.SETUP,
                myBoard: createEmptyBoard(),
                opponentReady: false,
                rematchCount: 0,
                sunkEnemyShips: [],
                mySunkShips: [],
                abilityUsed: false,
                radarCells: [],
                sweepCharges: 0,
            };
        case "SHIPS_PLACED":
            return {
                ...state,
                myShips: action.ships,
                myBoard: action.board,
            };
        case "SHIPS_ACCEPTED":
            return state;
        case "SHIPS_REJECTED":
            return {
                ...state,
                error: action.reason,
                myShips: [],
                myBoard: createEmptyBoard(),
            };
        case "OPPONENT_READY":
            return { ...state, opponentReady: true };
        case "GAME_START":
            return {
                ...state,
                gameState: GameState.IN_PROGRESS,
                turn: action.turn,
                playerId: action.playerId,
                attackBoard: createEmptyBoard(),
            };
        case "SHOT_RESULT": {
            const { row, col, result, shooter, nextTurn, sunkShipId, sunkShipCells, fromSweep } =
                action.data;
            const isMyShot = shooter === state.playerId;
            // Sweep shot-results must not update turn — ability-result is the sole source of truth for turn after a sweep
            const turnUpdate = fromSweep ? {} : { turn: nextTurn };

            if (isMyShot) {
                const newAttackBoard = state.attackBoard.map((r) => [...r]);
                newAttackBoard[row][col] = result === "miss" ? CELL.MISS : CELL.HIT;
                const newSunkEnemyShips =
                    result === "sunk" && sunkShipId && sunkShipCells
                        ? [...state.sunkEnemyShips, { shipId: sunkShipId, cells: sunkShipCells }]
                        : state.sunkEnemyShips;
                return {
                    ...state,
                    attackBoard: newAttackBoard,
                    ...turnUpdate,
                    sunkEnemyShips: newSunkEnemyShips,
                };
            } else {
                const newMyBoard = state.myBoard.map((r) => [...r]);
                newMyBoard[row][col] = result === "miss" ? CELL.MISS : CELL.HIT;
                const newMySunkShips =
                    result === "sunk" && sunkShipId && sunkShipCells
                        ? [...state.mySunkShips, { shipId: sunkShipId, cells: sunkShipCells }]
                        : state.mySunkShips;
                return {
                    ...state,
                    myBoard: newMyBoard,
                    ...turnUpdate,
                    mySunkShips: newMySunkShips,
                };
            }
        }
        case "TURN_CHANGED":
            return { ...state, turn: action.nextTurn };
        case "GAME_OVER":
            return {
                ...state,
                gameState: GameState.FINISHED,
                winner: action.winner,
                rematchCount: 0,
                enemyShips: action.enemyShips,
            };
        case "REMATCH_UPDATE":
            return { ...state, rematchCount: action.count };
        case "OPPONENT_DISCONNECTED":
            return { ...state, error: "Opponent disconnected" };
        case "CONNECTED":
            return { ...state, connected: true };
        case "DISCONNECTED":
            return { ...state, connected: false };
        case "ERROR":
            return { ...state, error: action.message };
        case "CLEAR_ERROR":
            return { ...state, error: null };
        case "CHAT_MESSAGE":
            return { ...state, chatMessages: [...state.chatMessages, action.message] };
        case "REJOIN_STATE":
            return {
                ...state,
                gameId: action.gameId,
                playerId: action.playerId,
                gameState: (action.gameState as GameState) ?? GameState.WAITING,
                myBoard: action.myBoard,
                attackBoard: action.attackBoard,
                myShips: action.myShips,
                sunkEnemyShips: action.sunkEnemyShips,
                president: action.president,
                enemyPresident: action.enemyPresident,
                abilityUsed: action.abilityUsed,
                sweepCharges: action.sweepCharges,
                turn: action.turn,
                winner: action.winner,
                opponentReady: action.opponentReady,
                enemyShips: action.enemyShips,
            };
        case "RESET":
            return initialState;
        default:
            return state;
    }
}

export function GameProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(gameReducer, initialState);

    useSocketEvents(dispatch);

    const createGame = useCallback(() => {
        socket.emit("create-game");
    }, []);

    const joinGame = useCallback((gameId: string) => {
        socket.emit("join-game", { gameId });
    }, []);

    const rejoinGame = useCallback((gameId: string, playerId: 1 | 2) => {
        socket.emit("rejoin-game", { gameId, playerId });
    }, []);

    const placeShips = useCallback(
        (
            ships: ShipPlacement[],
            board: number[][],
            decoyCell?: { row: number; col: number } | null,
        ) => {
            if (!state.gameId) return;
            dispatch({ type: "SHIPS_PLACED", ships, board });
            socket.emit("place-ships", {
                gameId: state.gameId,
                ships,
                decoyCell: decoyCell ?? null,
            });
        },
        [state.gameId],
    );

    const fireShot = useCallback(
        (row: number, col: number) => {
            if (!state.gameId || state.turn !== state.playerId) return;
            socket.emit("fire-shot", { gameId: state.gameId, row, col });
        },
        [state.gameId, state.turn, state.playerId],
    );

    const requestRematch = useCallback(() => {
        if (!state.gameId) return;
        socket.emit("request-rematch", { gameId: state.gameId });
    }, [state.gameId]);

    const clearError = useCallback(() => {
        dispatch({ type: "CLEAR_ERROR" });
    }, []);

    const selectPresident = useCallback(
        (presidentId: string) => {
            if (!state.gameId) return;
            socket.emit("select-president", { gameId: state.gameId, presidentId });
        },
        [state.gameId],
    );

    const useAbility = useCallback(
        (row?: number, col?: number, direction?: "row" | "col") => {
            if (!state.gameId) return;
            socket.emit("use-ability", { gameId: state.gameId, row, col, direction });
        },
        [state.gameId],
    );

    const resetGame = useCallback(() => {
        dispatch({ type: "RESET" });
    }, []);

    const value: GameContextValue = {
        ...state,
        createGame,
        joinGame,
        rejoinGame,
        placeShips,
        fireShot,
        requestRematch,
        isMyTurn: state.turn === state.playerId,
        clearError,
        selectPresident,
        useAbility,
        resetGame,
    };

    return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
