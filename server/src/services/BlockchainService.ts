import {
    createWalletClient,
    http,
    parseAbi,
    toHex,
    type WalletClient,
    type Chain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia, polygonAmoy, hardhat, sepolia } from "viem/chains";
import logger from "../utils/logger";
import { PresidentId } from "../game/types";

// ─── ABI ─────────────────────────────────────────────────────────────────────

const ABI = parseAbi([
    "function createGame(bytes32 gameId) external",
    "function presidentsSelected(bytes32 gameId, uint8 p1President, uint8 p2President) external",
    "function shipsPlaced(bytes32 gameId, uint8 playerNum) external",
    "function shotFired(bytes32 gameId, uint8 playerNum, uint8 row, uint8 col, uint8 result) external",
    "function finalizeGame(bytes32 gameId, uint8 winner, bytes calldata board1, bytes calldata board2) external",
]);

// ─── Encodings ────────────────────────────────────────────────────────────────

const PRESIDENT_TO_UINT8: Record<PresidentId, number> = {
    [PresidentId.STRATEGIST]:  1,
    [PresidentId.SHIELD]:      2,
    [PresidentId.PROVOCATEUR]: 3,
    [PresidentId.GHOST]:       4,
    [PresidentId.JUGGERNAUT]:  5,
};

const RESULT_TO_UINT8: Record<"miss" | "hit" | "sunk", number> = {
    miss: 0,
    hit:  1,
    sunk: 2,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveChain(): Chain {
    switch (process.env.CHAIN) {
        case "sepolia":       return sepolia;
        case "base-sepolia":  return baseSepolia;
        case "polygon-amoy":  return polygonAmoy;
        case "localhost":     return hardhat;
        default:              return sepolia;
    }
}

/** Encode a 10x10 board as a flat 100-byte hex string (row-major, values 0-4). */
export function encodeBoard(board: number[][]): `0x${string}` {
    const bytes = new Uint8Array(100);
    for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
            bytes[r * 10 + c] = board[r][c];
        }
    }
    return toHex(bytes);
}

/** Encode a short gameId string into a bytes32 value. */
export function gameIdToBytes32(gameId: string): `0x${string}` {
    const hex = Buffer.from(gameId, "utf8").toString("hex").padEnd(64, "0");
    return `0x${hex}`;
}

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * BlockchainService — full event-sourced writes:
 *   createGame         → both players joined
 *   presidentsSelected → both presidents chosen
 *   shipsPlaced        → a player placed their ships (×2 per game)
 *   shotFired          → every shot fired
 *   finalizeGame       → game over (winner + final boards)
 *
 * All writes are fire-and-forget. If env vars are absent, writes are skipped.
 */
export class BlockchainService {
    private client: WalletClient | null = null;
    private contractAddress: `0x${string}` | null = null;
    private enabled = false;

    constructor() {
        const pk   = process.env.OPERATOR_PRIVATE_KEY;
        const addr = process.env.CONTRACT_ADDRESS;

        if (!pk || !addr) {
            logger.warn("BlockchainService: OPERATOR_PRIVATE_KEY or CONTRACT_ADDRESS not set — blockchain writes disabled");
            return;
        }

        try {
            const account = privateKeyToAccount(pk as `0x${string}`);
            const chain   = resolveChain();

            this.client = createWalletClient({
                account,
                chain,
                transport: http(process.env.RPC_URL),
            });
            this.contractAddress = addr as `0x${string}`;
            this.enabled = true;

            logger.info("BlockchainService: operator wallet ready", {
                address: account.address,
                chain: chain.name,
                contract: addr,
            });
        } catch (err) {
            logger.error("BlockchainService: failed to initialise wallet client", { err });
        }
    }

    private async write(functionName: string, args: unknown[]): Promise<void> {
        if (!this.enabled || !this.client || !this.contractAddress) return;
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const hash = await (this.client as any).writeContract({
                address: this.contractAddress,
                abi: ABI,
                functionName,
                args,
            });
            logger.debug("BlockchainService: tx submitted", { functionName, hash });
        } catch (err) {
            logger.error("BlockchainService: write failed", {
                functionName,
                err: err instanceof Error ? err.message : err,
            });
        }
    }

    /** Fire when both players have joined. */
    createGame(gameId: string): void {
        void this.write("createGame", [gameIdToBytes32(gameId)]);
    }

    /** Fire when both players have selected their president. */
    presidentsSelected(gameId: string, p1President: PresidentId, p2President: PresidentId): void {
        void this.write("presidentsSelected", [
            gameIdToBytes32(gameId),
            PRESIDENT_TO_UINT8[p1President],
            PRESIDENT_TO_UINT8[p2President],
        ]);
    }

    /** Fire when a player finishes placing their ships. */
    shipsPlaced(gameId: string, playerNum: 1 | 2): void {
        void this.write("shipsPlaced", [gameIdToBytes32(gameId), playerNum]);
    }

    /** Fire for every shot (normal shots, juggernaut sweeps, and shield blocks). */
    shotFired(gameId: string, playerNum: 1 | 2, row: number, col: number, result: "hit" | "miss" | "sunk"): void {
        void this.write("shotFired", [
            gameIdToBytes32(gameId),
            playerNum,
            row,
            col,
            RESULT_TO_UINT8[result],
        ]);
    }

    /** Fire once the game ends. */
    finalizeGame(gameId: string, winner: 1 | 2, board1: number[][], board2: number[][]): void {
        void this.write("finalizeGame", [
            gameIdToBytes32(gameId),
            winner,
            encodeBoard(board1),
            encodeBoard(board2),
        ]);
    }
}

export const blockchain = new BlockchainService();
