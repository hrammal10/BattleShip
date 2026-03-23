const KEYS = {
    gameId: "gameId",
    playerId: "playerId",
} as const;

export const gameStorage = {
    saveSession(gameId: string, playerId: 1 | 2): void {
        localStorage.setItem(KEYS.gameId, gameId);
        localStorage.setItem(KEYS.playerId, String(playerId));
        sessionStorage.setItem(KEYS.gameId, gameId);
        sessionStorage.setItem(KEYS.playerId, String(playerId));
    },

    getSession(): { gameId: string | null; playerId: 1 | 2 | null } {
        const gameId = sessionStorage.getItem(KEYS.gameId);
        const raw = sessionStorage.getItem(KEYS.playerId);
        const playerId = raw === "1" ? 1 : raw === "2" ? 2 : null;
        return { gameId, playerId };
    },

    getLocal(): { gameId: string | null; playerId: 1 | 2 | null } {
        const gameId = localStorage.getItem(KEYS.gameId);
        const raw = localStorage.getItem(KEYS.playerId);
        const playerId = raw === "1" ? 1 : raw === "2" ? 2 : null;
        return { gameId, playerId };
    },

    clearAll(): void {
        sessionStorage.removeItem(KEYS.gameId);
        sessionStorage.removeItem(KEYS.playerId);
        localStorage.removeItem(KEYS.gameId);
        localStorage.removeItem(KEYS.playerId);
    },
};
