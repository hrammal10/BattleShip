import { useEffect, type Dispatch } from "react";
import socket from "../socket";
import type { ShotResultEvent, RadarCell } from "../types/game";
import { gameStorage } from "../utils/storage";
import { playSound } from "../utils/sounds";
import type { GameAction } from "./types";

export function useSocketEvents(dispatch: Dispatch<GameAction>) {
    useEffect(() => {
        socket.connect();

        socket.on("connect", () => {
            dispatch({ type: "CONNECTED" });

            const { gameId, playerId } = gameStorage.getSession();
            if (gameId && playerId) {
                socket.emit("rejoin-game", { gameId, playerId });
            }
        });

        socket.on("disconnect", () => dispatch({ type: "DISCONNECTED" }));

        socket.on("game-created", ({ gameId, playerId }: { gameId: string; playerId: 1 | 2 }) => {
            gameStorage.saveSession(gameId, playerId);
            dispatch({ type: "GAME_CREATED", gameId, playerId });
        });

        socket.on("game-joined", ({ gameId, playerId }: { gameId: string; playerId: 1 | 2 }) => {
            gameStorage.saveSession(gameId, playerId);
            dispatch({ type: "GAME_JOINED", gameId, playerId });
        });

        socket.on(
            "rejoin-success",
            (data: {
                gameId: string;
                playerId: 1 | 2;
                gameState: string;
                myBoard: number[][];
                attackBoard: number[][];
                myShips: { shipId: string; cells: { row: number; col: number }[] }[];
                sunkEnemyShips: { shipId: string; cells: { row: number; col: number }[] }[];
                president: string | null;
                enemyPresident: string | null;
                abilityUsed: boolean;
                sweepCharges: number;
                turn: 1 | 2;
                winner: 1 | 2 | null;
                opponentReady: boolean;
                enemyShips: { shipId: string; cells: { row: number; col: number }[] }[];
            }) => {
                dispatch({ type: "REJOIN_STATE", ...data });
            },
        );

        socket.on("opponent-joined", () => dispatch({ type: "OPPONENT_JOINED" }));
        socket.on("setup-phase", () => dispatch({ type: "SETUP_PHASE" }));
        socket.on("president-select", () => dispatch({ type: "PRESIDENT_SELECT" }));

        socket.on("president-chosen", ({ presidentId }: { presidentId: string }) => {
            dispatch({ type: "PRESIDENT_CHOSEN", presidentId });
        });

        socket.on("enemy-president", ({ presidentId }: { presidentId: string }) => {
            dispatch({ type: "ENEMY_PRESIDENT_REVEALED", presidentId });
        });

        socket.on(
            "ability-result",
            ({
                type,
                cells,
                nextTurn,
                movedShips,
                chargesRemaining,
                player,
            }: {
                type: string;
                cells?: RadarCell[];
                nextTurn?: 1 | 2;
                movedShips?: { shipId: string; newCells: { row: number; col: number }[] }[];
                chargesRemaining?: number;
                player?: 1 | 2;
            }) => {
                const { playerId: myId } = gameStorage.getLocal();
                const isMyAbility = player === myId;

                if (type === "strategist" && cells) {
                    if (isMyAbility) dispatch({ type: "RADAR_REVEALED", cells });
                    if (nextTurn) dispatch({ type: "TURN_CHANGED", nextTurn });
                } else if (type === "ghost" && movedShips) {
                    for (const moved of movedShips) {
                        dispatch({
                            type: "GHOST_MOVED",
                            shipId: moved.shipId,
                            newCells: moved.newCells,
                        });
                    }
                } else if (type === "juggernaut" && chargesRemaining !== undefined) {
                    if (isMyAbility) dispatch({ type: "SWEEP_USED", chargesRemaining });
                    if (nextTurn) dispatch({ type: "TURN_CHANGED", nextTurn });
                    return;
                }
                if (isMyAbility) dispatch({ type: "ABILITY_USED" });
            },
        );

        socket.on("sniper-reveal", ({ row, col }: { row: number; col: number }) => {
            dispatch({ type: "SNIPER_REVEALED", row, col });
        });

        socket.on("shield-activated", () => {
            // Notification only — no state change needed
        });

        socket.on("ships-accepted", () => dispatch({ type: "SHIPS_ACCEPTED" }));

        socket.on("ships-rejected", ({ reason }: { reason: string }) => {
            dispatch({ type: "SHIPS_REJECTED", reason });
        });

        socket.on("opponent-ready", () => dispatch({ type: "OPPONENT_READY" }));

        socket.on("game-start", ({ turn, yourPlayerId }: { turn: 1 | 2; yourPlayerId: 1 | 2 }) => {
            dispatch({ type: "GAME_START", turn, playerId: yourPlayerId });
        });

        const sweepQueue: ShotResultEvent[] = [];
        let sweepTimer: ReturnType<typeof setTimeout> | null = null;
        const SWEEP_DELAY = 150; // ms between each cell reveal

        function processSweepQueue() {
            if (sweepQueue.length === 0) {
                sweepTimer = null;
                return;
            }
            const shot = sweepQueue.shift()!;
            dispatch({ type: "SHOT_RESULT", data: shot });
            sweepTimer = setTimeout(processSweepQueue, SWEEP_DELAY);
        }

        socket.on("shot-result", (data: ShotResultEvent) => {
            if (data.fromSweep) {
                // Play juggernaut sound once at the start of the sweep
                if (data.sweepIndex === 0) {
                    playSound("juggernaut");
                }
                sweepQueue.push(data);
                // Start processing if not already running
                if (!sweepTimer) {
                    sweepTimer = setTimeout(processSweepQueue, SWEEP_DELAY);
                }
                return;
            }

            // Normal shot — play sounds immediately
            if (data.result === "hit" || data.result === "sunk") {
                playSound("hit");
            } else {
                playSound("miss");
            }
            if (data.result === "sunk") {
                setTimeout(() => playSound("sunk"), 500);
            }
            if (data.chargeGained) {
                dispatch({ type: "SWEEP_CHARGED" });
            }
            dispatch({ type: "SHOT_RESULT", data });
        });

        socket.on(
            "game-over",
            ({
                winner,
                player1Ships,
                player2Ships,
            }: {
                winner: 1 | 2;
                player1Ships: { shipId: string; cells: { row: number; col: number }[] }[];
                player2Ships: { shipId: string; cells: { row: number; col: number }[] }[];
            }) => {
                const { playerId: myId } = gameStorage.getLocal();
                playSound(winner === myId ? "victory" : "loser");
                const enemyShips = myId === 1 ? player2Ships : player1Ships;
                dispatch({ type: "GAME_OVER", winner, enemyShips });
            },
        );

        socket.on("rematch-update", ({ count }: { count: number }) => {
            dispatch({ type: "REMATCH_UPDATE", count });
        });

        socket.on("opponent-disconnected", () => {
            dispatch({ type: "OPPONENT_DISCONNECTED" });
        });

        socket.on("chat-message", (msg: { from: 1 | 2; text: string; ts: number }) => {
            dispatch({ type: "CHAT_MESSAGE", message: msg });
        });

        socket.on("error", ({ message }: { message: string }) => {
            dispatch({ type: "ERROR", message });
        });

        return () => {
            if (sweepTimer) clearTimeout(sweepTimer);
            socket.removeAllListeners();
            socket.disconnect();
        };
    }, [dispatch]);
}
