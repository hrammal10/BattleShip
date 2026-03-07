import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GameProvider } from "./context/GameContext";
import HomePage from "./pages/HomePage";
import LobbyPage from "./pages/LobbyPage";
import SetupPage from "./pages/SetupPage";
import GamePage from "./pages/GamePage";
import "./App.css";

export default function App() {
    return (
        <BrowserRouter>
            <GameProvider>
                <div className="app">
                    <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/play/:gameId" element={<LobbyPage />} />
                        <Route path="/play/:gameId/setup" element={<SetupPage />} />
                        <Route path="/play/:gameId/game" element={<GamePage />} />
                    </Routes>
                </div>
            </GameProvider>
        </BrowserRouter>
    );
}
