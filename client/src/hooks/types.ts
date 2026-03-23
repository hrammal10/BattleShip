import type { ShipPlacement, ShotResultEvent, RadarCell } from "../types/game";

export type GameAction =
    | { type: "GAME_CREATED"; gameId: string; playerId: 1 | 2 }
    | { type: "GAME_JOINED"; gameId: string; playerId: 1 | 2 }
    | { type: "OPPONENT_JOINED" }
    | { type: "PRESIDENT_SELECT" }
    | { type: "PRESIDENT_CHOSEN"; presidentId: string }
    | { type: "ENEMY_PRESIDENT_REVEALED"; presidentId: string }
    | { type: "ABILITY_USED" }
    | { type: "SWEEP_CHARGED" }
    | { type: "SWEEP_USED"; chargesRemaining: number }
    | { type: "RADAR_REVEALED"; cells: RadarCell[] }
    | { type: "SNIPER_REVEALED"; row: number; col: number }
    | { type: "GHOST_MOVED"; shipId: string; newCells: { row: number; col: number }[] }
    | { type: "SETUP_PHASE" }
    | { type: "SHIPS_PLACED"; ships: ShipPlacement[]; board: number[][] }
    | { type: "SHIPS_ACCEPTED" }
    | { type: "SHIPS_REJECTED"; reason: string }
    | { type: "OPPONENT_READY" }
    | { type: "GAME_START"; turn: 1 | 2; playerId: 1 | 2 }
    | { type: "SHOT_RESULT"; data: ShotResultEvent }
    | {
          type: "GAME_OVER";
          winner: 1 | 2;
          enemyShips: { shipId: string; cells: { row: number; col: number }[] }[];
      }
    | { type: "TURN_CHANGED"; nextTurn: 1 | 2 }
    | { type: "REMATCH_UPDATE"; count: number }
    | { type: "OPPONENT_DISCONNECTED" }
    | { type: "CONNECTED" }
    | { type: "DISCONNECTED" }
    | { type: "ERROR"; message: string }
    | { type: "CLEAR_ERROR" }
    | { type: "CHAT_MESSAGE"; message: { from: 1 | 2; text: string; ts: number } }
    | { type: "RESET" }
    | {
          type: "REJOIN_STATE";
          gameId: string;
          playerId: 1 | 2;
          gameState: string;
          myBoard: number[][];
          attackBoard: number[][];
          myShips: ShipPlacement[];
          sunkEnemyShips: ShipPlacement[];
          president: string | null;
          enemyPresident: string | null;
          abilityUsed: boolean;
          sweepCharges: number;
          turn: 1 | 2;
          winner: 1 | 2 | null;
          opponentReady: boolean;
          enemyShips: ShipPlacement[];
      };
