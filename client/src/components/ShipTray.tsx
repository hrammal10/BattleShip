import { SHIPS } from "../types/game";
import type { ShipDefinition } from "../types/game";
import ShipSprite from "./ShipSprite";
import "./ShipTray.css";

interface ShipTrayProps {
    placedShipIds: string[];
    selectedShip: ShipDefinition | null;
    onSelectShip: (ship: ShipDefinition) => void;
}

export default function ShipTray({ placedShipIds, selectedShip, onSelectShip }: ShipTrayProps) {
    return (
        <div className="ship-tray">
            <h3 className="tray-title">Your Fleet</h3>
            <div className="ship-list">
                {SHIPS.map((ship) => {
                    const isPlaced = placedShipIds.includes(ship.id);
                    const isSelected = selectedShip?.id === ship.id;

                    return (
                        <button
                            key={ship.id}
                            className={`ship-item ${isPlaced ? "placed" : ""} ${isSelected ? "selected" : ""}`}
                            onClick={() => !isPlaced && onSelectShip(ship)}
                            disabled={isPlaced}
                        >
                            <span className="ship-name">{ship.name}</span>
                            <div className="ship-preview">
                                <ShipSprite shipId={ship.id} cellSize={20} />
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
