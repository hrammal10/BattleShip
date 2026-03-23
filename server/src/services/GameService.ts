import { v4 as uuidv4 } from "uuid";
import { GameState, IGame, IPlayer, PresidentId, ShipPlacement } from "../game/types";
import { CELL } from "../game/constants";
import {
    createEmptyBoard,
    validateFleetPlacement,
    processShot,
    checkAllShipsSunk,
} from "../game/gameLogic";
import { gameStore } from "../store/gameStore";
import { blockchain } from "./BlockchainService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const freshPlayer = (socketId: string): IPlayer => ({
    socketId,
    ready: false,
    rematchReady: false,
    ships: [],
    president: null,
    abilityUsed: false,
    shieldHitsBlocked: 0,
    turnsToSkip: 0,
    sweepCharges: 0,
    decoyCell: null,
});

const now = () => new Date();

// ─── GameService ──────────────────────────────────────────────────────────────

export class GameService {
    static createGame(socketId: string): IGame {
        const gameId = uuidv4().slice(0, 8);
        const game: IGame = {
            gameId,
            state: GameState.WAITING,
            player1: freshPlayer(socketId),
            player2: null,
            board1: createEmptyBoard(),
            board2: createEmptyBoard(),
            turn: 1,
            winner: null,
            createdAt: now(),
            updatedAt: now(),
        };
        gameStore.set(gameId, game);
        return game;
    }

    static joinGame(gameId: string, socketId: string): IGame | null {
        const game = gameStore.get(gameId);
        if (!game || game.state !== GameState.WAITING) return null;
        game.player2 = freshPlayer(socketId);
        game.state = GameState.PRESIDENT_SELECT;
        gameStore.set(gameId, game);
        // Both players are now present — record the game on-chain
        blockchain.createGame(gameId);
        return game;
    }

    static rejoinGame(gameId: string, playerId: 1 | 2, socketId: string): IGame | null {
        const game = gameStore.get(gameId);
        if (!game) return null;
        const player = playerId === 1 ? game.player1 : game.player2;
        if (!player) return null;
        player.socketId = socketId;
        gameStore.set(gameId, game);
        return game;
    }

    static selectPresident(
        gameId: string,
        playerNum: 1 | 2,
        presidentId: PresidentId,
    ): IGame | null {
        const game = gameStore.get(gameId);
        if (!game || game.state !== GameState.PRESIDENT_SELECT) return null;
        const player = playerNum === 1 ? game.player1 : game.player2;
        if (!player) return null;
        player.president = presidentId;
        gameStore.set(gameId, game);
        return game;
    }

    static transitionToSetup(gameId: string): IGame | null {
        const game = gameStore.get(gameId);
        if (!game || game.state !== GameState.PRESIDENT_SELECT) return null;
        game.state = GameState.SETUP;
        gameStore.set(gameId, game);
        return game;
    }

    static placeShips(
        gameId: string,
        playerNum: 1 | 2,
        ships: ShipPlacement[],
        decoyCell?: { row: number; col: number } | null,
    ): { game: IGame; error?: string } {
        const validation = validateFleetPlacement(ships);
        if (!validation.valid) {
            return { game: null as unknown as IGame, error: validation.reason };
        }

        const game = gameStore.get(gameId);
        if (!game || game.state !== GameState.SETUP) {
            return { game: null as unknown as IGame, error: "Invalid game state" };
        }

        const board = createEmptyBoard();
        for (const ship of ships) {
            for (const cell of ship.cells) {
                board[cell.row][cell.col] = CELL.SHIP;
            }
        }

        if (decoyCell) {
            if (board[decoyCell.row][decoyCell.col] !== CELL.EMPTY) {
                return { game: null as unknown as IGame, error: "Decoy overlaps a ship" };
            }
            board[decoyCell.row][decoyCell.col] = CELL.DECOY;
        }

        const player = playerNum === 1 ? game.player1! : game.player2!;
        player.ships = ships;
        player.ready = true;
        player.decoyCell = decoyCell ?? null;

        if (playerNum === 1) game.board1 = board;
        else game.board2 = board;

        gameStore.set(gameId, game);
        return { game };
    }

    static startGame(gameId: string, startingTurn: 1 | 2): IGame | null {
        const game = gameStore.get(gameId);
        if (
            !game ||
            game.state !== GameState.SETUP ||
            !game.player1?.ready ||
            !game.player2?.ready
        ) {
            return null;
        }
        game.state = GameState.IN_PROGRESS;
        game.turn = startingTurn;
        gameStore.set(gameId, game);
        return game;
    }

    static applyShot(
        game: IGame,
        playerNum: 1 | 2,
        row: number,
        col: number,
    ): {
        result: "hit" | "miss" | "sunk";
        sunkShipId?: string;
        sunkShipCells?: { row: number; col: number }[];
        gameOver: boolean;
        updatedBoard: number[][];
    } {
        const targetBoard = playerNum === 1 ? game.board2 : game.board1;
        const targetPlayer = playerNum === 1 ? game.player2! : game.player1!;

        const {
            board: updatedBoard,
            result,
            sunkShipId,
            sunkShipCells,
        } = processShot(targetBoard, targetPlayer.ships, row, col);

        const gameOver = checkAllShipsSunk(updatedBoard);
        return { result, sunkShipId, sunkShipCells, gameOver, updatedBoard };
    }

    /** Call once the game ends to push the final result on-chain. */
    static finalizeOnChain(game: IGame): void {
        if (!game.winner) return;
        blockchain.finalizeGame(game.gameId, game.winner, game.board1, game.board2);
    }

    static setRematchReady(gameId: string, playerNum: 1 | 2): IGame | null {
        const game = gameStore.get(gameId);
        if (!game || game.state !== GameState.FINISHED) return null;
        const player = playerNum === 1 ? game.player1 : game.player2;
        if (!player) return null;
        player.rematchReady = true;
        gameStore.set(gameId, game);
        return game;
    }

    static resetForRematch(gameId: string): IGame | null {
        const game = gameStore.get(gameId);
        if (!game || game.state !== GameState.FINISHED) return null;

        const resetPlayer = (p: IPlayer | null): IPlayer | null => {
            if (!p) return null;
            return {
                ...p,
                ready: false,
                rematchReady: false,
                ships: [],
                president: null,
                abilityUsed: false,
                shieldHitsBlocked: 0,
                turnsToSkip: 0,
                sweepCharges: 0,
                decoyCell: null,
            };
        };

        game.state = GameState.PRESIDENT_SELECT;
        game.board1 = createEmptyBoard();
        game.board2 = createEmptyBoard();
        game.turn = 1;
        game.winner = null;
        game.player1 = resetPlayer(game.player1);
        game.player2 = resetPlayer(game.player2);

        gameStore.set(gameId, game);
        return game;
    }
}
