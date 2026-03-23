import { SHIPS } from "../types/game";
import type { ShipDefinition } from "../types/game";
import ShipSprite from "./ShipSprite";
import "./ShipTray.css";

interface ShipTrayProps {
    placedShipIds: string[];
    selectedShip: ShipDefinition | null;
    /** The ship currently being placed cell-by-cell (has at least one cell placed) */
    inProgressShipId?: string | null;
    onSelectShip: (ship: ShipDefinition) => void;
    onRecallShip: (shipId: string) => void;
    disabled?: boolean;
}

export default function ShipTray({
    placedShipIds,
    selectedShip,
    inProgressShipId,
    onSelectShip,
    onRecallShip,
    disabled = false,
}: ShipTrayProps) {
    return (
        <div className="ship-tray">
            <h3 className="tray-title">Your Fleet</h3>
            <div className="ship-list">
                {SHIPS.map((ship) => {
                    const isPlaced = placedShipIds.includes(ship.id);
                    const isSelected = selectedShip?.id === ship.id;
                    const isInProgress = inProgressShipId === ship.id;
                    const hasRecall = (isPlaced || isInProgress) && !disabled;

                    return (
                        <div
                            key={ship.id}
                            className={`ship-item ${isPlaced ? "placed" : ""} ${isSelected ? "selected" : ""}`}
                        >
                            <button
                                className="ship-select-btn"
                                onClick={() => !isPlaced && !disabled && onSelectShip(ship)}
                                disabled={isPlaced || disabled}
                            >
                                <span className="ship-name">{ship.name}</span>
                                <div className="ship-preview">
                                    <ShipSprite shipId={ship.id} cellSize={20} />
                                </div>
                            </button>

                            {hasRecall && (
                                <button
                                    className="ship-recall-btn"
                                    onClick={() => onRecallShip(ship.id)}
                                    title="Recall ship"
                                >
                                    ↩
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
