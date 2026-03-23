import { IGame } from "../game/types";

/**
 * In-memory game store — the runtime source of truth.
 *
 * The blockchain records an immutable audit log of every game event.
 * This store holds the live game state that the socket handlers read and write
 * on every event.  Because Node.js is single-threaded, all mutations are
 * effectively atomic without extra locking.
 *
 * Games are automatically expired 24 hours after their last update so that
 * the server doesn't accumulate unbounded memory over time.
 */

const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface StoredGame {
    game: IGame;
    updatedAt: number; // Date.now()
}

const store = new Map<string, StoredGame>();

// ── Cleanup ──────────────────────────────────────────────────────────────────

const cleanupInterval = setInterval(
    () => {
        const now = Date.now();
        for (const [gameId, entry] of store) {
            if (now - entry.updatedAt > TTL_MS) {
                store.delete(gameId);
            }
        }
    },
    60 * 60 * 1000 /* run every hour */,
);

// Prevent the interval from keeping the process alive during tests / shutdown
cleanupInterval.unref();

// ── Public API ───────────────────────────────────────────────────────────────

export const gameStore = {
    get(gameId: string): IGame | null {
        return store.get(gameId)?.game ?? null;
    },

    set(gameId: string, game: IGame): void {
        game.updatedAt = new Date();
        store.set(gameId, { game, updatedAt: Date.now() });
    },

    delete(gameId: string): void {
        store.delete(gameId);
    },

    has(gameId: string): boolean {
        return store.has(gameId);
    },

    /** Returns a snapshot of all live games (for debugging / the REST endpoint). */
    all(): IGame[] {
        return Array.from(store.values()).map((e) => e.game);
    },
};
