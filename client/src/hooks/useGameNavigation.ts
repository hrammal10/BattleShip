import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "./useGame";

/**
 * Centralizes game-state-driven navigation.
 *
 * @param urlGameId  - the game ID from the URL param
 * @param routes     - map of GameState → path suffix to navigate to (e.g. { SETUP: "/setup" })
 *                     Define this as a module-level constant to keep the reference stable.
 * @param guardNoPlayerId - when true, redirects to the lobby if the player has no session
 */
export function useGameNavigation(
    urlGameId: string | undefined,
    routes: Partial<Record<string, string>> = {},
    guardNoPlayerId = false,
) {
    const navigate = useNavigate();
    const { gameState, playerId } = useGame();

    useEffect(() => {
        if (guardNoPlayerId && !playerId) {
            navigate(`/play/${urlGameId}`, { replace: true });
        }
    }, [guardNoPlayerId, playerId, urlGameId, navigate]);

    useEffect(() => {
        const path = routes[gameState];
        if (path) navigate(`/play/${urlGameId}${path}`);
        // routes is defined as a module-level constant in each caller — reference is stable
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameState, urlGameId, navigate]);
}
