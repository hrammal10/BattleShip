import mongoose, { Schema, Document } from "mongoose";
import { GameState, IPlayer } from "../game/types";
import { createEmptyBoard } from "../game/gameLogic";

const ShipPlacementSchema = new Schema(
    {
        shipId: { type: String, required: true },
        cells: [
            {
                row: { type: Number, required: true },
                col: { type: Number, required: true },
            },
        ],
    },
    { _id: false },
);

const PlayerSchema = new Schema<IPlayer>(
    {
        socketId: { type: String, required: true },
        ready: { type: Boolean, default: false },
        rematchReady: { type: Boolean, default: false },
        ships: { type: [ShipPlacementSchema], default: [] },
    },
    { _id: false },
);

export interface GameDocument extends Document {
    gameId: string;
    state: GameState;
    player1: IPlayer | null;
    player2: IPlayer | null;
    board1: number[][];
    board2: number[][];
    turn: 1 | 2;
    winner: 1 | 2 | null;
}

const GameSchema = new Schema<GameDocument>(
    {
        gameId: { type: String, required: true, unique: true, index: true },
        state: {
            type: String,
            enum: Object.values(GameState),
            default: GameState.WAITING,
        },
        player1: { type: PlayerSchema, default: null },
        player2: { type: PlayerSchema, default: null },
        board1: { type: [[Number]], default: () => createEmptyBoard() },
        board2: { type: [[Number]], default: () => createEmptyBoard() },
        turn: { type: Number, default: 1 },
        winner: { type: Number, default: null },
    },
    { timestamps: true },
);

export default mongoose.model<GameDocument>("Game", GameSchema);
