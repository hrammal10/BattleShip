import { createContext, useContext, useReducer, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import socket from "../socket";
import { GameState, BOARD_SIZE, CELL } from "../types/game";
import type { ShipPlacement, ShotResultEvent } from "../types/game";
import { playSound } from "../utils/sounds";

interface SunkShip {
    shipId: string;
    cells: { row: number; col: number }[];
}

interface GameContextState {
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
}

type GameAction =
    | { type: "GAME_CREATED"; gameId: string; playerId: 1 | 2 }
    | { type: "GAME_JOINED"; gameId: string; playerId: 1 | 2 }
    | { type: "OPPONENT_JOINED" }
    | { type: "SETUP_PHASE" }
    | { type: "SHIPS_PLACED"; ships: ShipPlacement[]; board: number[][] }
    | { type: "SHIPS_ACCEPTED" }
    | { type: "SHIPS_REJECTED"; reason: string }
    | { type: "OPPONENT_READY" }
    | { type: "GAME_START"; turn: 1 | 2; playerId: 1 | 2 }
    | { type: "SHOT_RESULT"; data: ShotResultEvent }
    | { type: "GAME_OVER"; winner: 1 | 2 }
    | { type: "REMATCH_UPDATE"; count: number }
    | { type: "OPPONENT_DISCONNECTED" }
    | { type: "CONNECTED" }
    | { type: "DISCONNECTED" }
    | { type: "ERROR"; message: string }
    | { type: "CLEAR_ERROR" };

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
        case "SETUP_PHASE":
            return {
                ...state,
                gameState: GameState.SETUP,
                myBoard: createEmptyBoard(),
                opponentReady: false,
                rematchCount: 0,
                sunkEnemyShips: [],
                mySunkShips: [],
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
            const { row, col, result, shooter, nextTurn, sunkShipId, sunkShipCells } = action.data;
            const isMyShot = shooter === state.playerId;

            if (isMyShot) {
                const newAttackBoard = state.attackBoard.map((r) => [...r]);
                newAttackBoard[row][col] = result === "miss" ? CELL.MISS : CELL.HIT;
                const newSunkEnemyShips =
                    result === "sunk" && sunkShipId && sunkShipCells
                        ? [...state.sunkEnemyShips, { shipId: sunkShipId, cells: sunkShipCells }]
                        : state.sunkEnemyShips;
                return { ...state, attackBoard: newAttackBoard, turn: nextTurn, sunkEnemyShips: newSunkEnemyShips };
            } else {
                const newMyBoard = state.myBoard.map((r) => [...r]);
                if (result === "miss") {
                    newMyBoard[row][col] = CELL.MISS;
                } else {
                    newMyBoard[row][col] = CELL.HIT;
                }
                const newMySunkShips =
                    result === "sunk" && sunkShipId && sunkShipCells
                        ? [...state.mySunkShips, { shipId: sunkShipId, cells: sunkShipCells }]
                        : state.mySunkShips;
                return { ...state, myBoard: newMyBoard, turn: nextTurn, mySunkShips: newMySunkShips };
            }
        }
        case "GAME_OVER":
            return { ...state, gameState: GameState.FINISHED, winner: action.winner, rematchCount: 0 };
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
        default:
            return state;
    }
}

interface GameContextValue extends GameContextState {
    createGame: () => void;
    joinGame: (gameId: string) => void;
    placeShips: (ships: ShipPlacement[], board: number[][]) => void;
    fireShot: (row: number, col: number) => void;
    requestRematch: () => void;
    isMyTurn: boolean;
    clearError: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(gameReducer, initialState);

    useEffect(() => {
        socket.connect();

        socket.on("connect", () => {
            dispatch({ type: "CONNECTED" });

            // Auto-rejoin if we have stored session data
            const storedGameId = sessionStorage.getItem("gameId");
            const storedPlayerId = sessionStorage.getItem("playerId");
            if (storedGameId && storedPlayerId) {
                socket.emit("rejoin-game", {
                    gameId: storedGameId,
                    playerId: Number(storedPlayerId) as 1 | 2,
                });
            }
        });
        socket.on("disconnect", () => dispatch({ type: "DISCONNECTED" }));

        socket.on("game-created", ({ gameId, playerId }) => {
            sessionStorage.setItem("playerId", String(playerId));
            sessionStorage.setItem("gameId", gameId);
            dispatch({ type: "GAME_CREATED", gameId, playerId });
        });

        socket.on("game-joined", ({ gameId, playerId }) => {
            sessionStorage.setItem("playerId", String(playerId));
            sessionStorage.setItem("gameId", gameId);
            dispatch({ type: "GAME_JOINED", gameId, playerId });
        });

        socket.on("rejoin-success", ({ gameId, playerId, gameState }) => {
            dispatch({ type: "GAME_JOINED", gameId, playerId });
            if (gameState === "SETUP") {
                dispatch({ type: "SETUP_PHASE" });
            } else if (gameState === "IN_PROGRESS") {
                dispatch({ type: "SETUP_PHASE" });
            }
        });

        socket.on("opponent-joined", () => dispatch({ type: "OPPONENT_JOINED" }));
        socket.on("setup-phase", () => dispatch({ type: "SETUP_PHASE" }));
        socket.on("ships-accepted", () => dispatch({ type: "SHIPS_ACCEPTED" }));

        socket.on("ships-rejected", ({ reason }) => {
            dispatch({ type: "SHIPS_REJECTED", reason });
        });

        socket.on("opponent-ready", () => {
            dispatch({ type: "OPPONENT_READY" });
        });

        socket.on("game-start", ({ turn, yourPlayerId }) => {
            dispatch({ type: "GAME_START", turn, playerId: yourPlayerId });
        });

        socket.on("shot-result", (data: ShotResultEvent) => {
            if (data.result === "hit" || data.result === "sunk") {
                playSound("hit");
            } else {
                playSound("miss");
            }
            if (data.result === "sunk") {
                setTimeout(() => playSound("sunk"), 500);
            }
            dispatch({ type: "SHOT_RESULT", data });
        });

        socket.on("game-over", ({ winner }) => {
            playSound("victory");
            dispatch({ type: "GAME_OVER", winner });
        });

        socket.on("rematch-update", ({ count }: { count: number }) => {
            dispatch({ type: "REMATCH_UPDATE", count });
        });

        socket.on("opponent-disconnected", () => {
            dispatch({ type: "OPPONENT_DISCONNECTED" });
        });

        socket.on("error", ({ message }) => {
            dispatch({ type: "ERROR", message });
        });

        return () => {
            socket.removeAllListeners();
            socket.disconnect();
        };
    }, []);

    const createGame = useCallback(() => {
        socket.emit("create-game");
    }, []);

    const joinGame = useCallback((gameId: string) => {
        socket.emit("join-game", { gameId });
    }, []);

    const placeShips = useCallback(
        (ships: ShipPlacement[], board: number[][]) => {
            dispatch({ type: "SHIPS_PLACED", ships, board });
            socket.emit("place-ships", { gameId: state.gameId, ships });
            playSound("ready");
        },
        [state.gameId],
    );

    const fireShot = useCallback(
        (row: number, col: number) => {
            if (state.turn !== state.playerId) return;
            socket.emit("fire-shot", { gameId: state.gameId, row, col });
        },
        [state.gameId, state.turn, state.playerId],
    );

    const requestRematch = useCallback(() => {
        socket.emit("request-rematch", { gameId: state.gameId });
    }, [state.gameId]);

    const clearError = useCallback(() => {
        dispatch({ type: "CLEAR_ERROR" });
    }, []);

    const value: GameContextValue = {
        ...state,
        createGame,
        joinGame,
        placeShips,
        fireShot,
        requestRematch,
        isMyTurn: state.turn === state.playerId,
        clearError,
    };

    return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
    const context = useContext(GameContext);
    if (!context) {
        throw new Error("useGame must be used within a GameProvider");
    }
    return context;
}
