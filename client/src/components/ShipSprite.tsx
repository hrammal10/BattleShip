import { SHIPS } from "../types/game";
import "./ShipSprite.css";

interface ShipSpriteProps {
    shipId: string;
    cellSize?: number;
    orientation?: "horizontal" | "vertical";
    className?: string;
    isSunk?: boolean;
}

const shipLength = (id: string) => SHIPS.find((s) => s.id === id)?.length ?? 3;

function CarrierSVG() {
    return (
        <svg viewBox="0 0 500 100" preserveAspectRatio="none">
            {/* Hull */}
            <path
                d="M20,55 L60,55 L60,45 L80,45 L80,35 L120,30 L380,30 L420,35 L460,40 L480,50 L480,60 L460,70 L100,75 L60,70 L40,65 L20,60 Z"
                fill="#5a6e7f"
                stroke="#3a4a5a"
                strokeWidth="2"
            />
            {/* Flight deck */}
            <rect
                x="90"
                y="32"
                width="340"
                height="36"
                rx="3"
                fill="#6b7d8e"
                stroke="#4a5a6a"
                strokeWidth="1.5"
            />
            {/* Deck lines */}
            <line
                x1="120"
                y1="50"
                x2="400"
                y2="50"
                stroke="#4a5a6a"
                strokeWidth="1"
                strokeDasharray="8,4"
            />
            {/* Island/tower */}
            <rect x="300" y="20" width="35" height="15" rx="2" fill="#4a5a6a" />
            <rect x="310" y="12" width="15" height="10" rx="1" fill="#3a4a5a" />
            {/* Bow marking */}
            <path d="M430,40 L460,50 L430,60" fill="none" stroke="#4a5a6a" strokeWidth="1.5" />
        </svg>
    );
}

function BattleshipSVG() {
    return (
        <svg viewBox="0 0 400 100" preserveAspectRatio="none">
            {/* Hull */}
            <path
                d="M30,55 L50,50 L80,42 L320,38 L360,45 L380,55 L370,65 L320,72 L80,72 L50,65 Z"
                fill="#5a6e7f"
                stroke="#3a4a5a"
                strokeWidth="2"
            />
            {/* Superstructure */}
            <rect x="140" y="28" width="100" height="16" rx="3" fill="#4a5a6a" />
            <rect x="160" y="18" width="60" height="14" rx="2" fill="#3a4a5a" />
            <rect x="180" y="10" width="20" height="10" rx="1" fill="#2d3a47" />
            {/* Front turret */}
            <circle cx="100" cy="48" r="10" fill="#4a5a6a" stroke="#3a4a5a" strokeWidth="1.5" />
            <rect x="100" y="45" width="30" height="6" rx="2" fill="#3a4a5a" />
            {/* Rear turret */}
            <circle cx="300" cy="48" r="10" fill="#4a5a6a" stroke="#3a4a5a" strokeWidth="1.5" />
            <rect x="270" y="45" width="30" height="6" rx="2" fill="#3a4a5a" />
            {/* Bow */}
            <path d="M350,45 L375,55 L350,65" fill="none" stroke="#4a5a6a" strokeWidth="1.5" />
        </svg>
    );
}

function CruiserSVG() {
    return (
        <svg viewBox="0 0 300 100" preserveAspectRatio="none">
            {/* Hull */}
            <path
                d="M25,55 L50,45 L80,40 L220,38 L260,45 L280,55 L270,65 L220,72 L80,72 L50,65 Z"
                fill="#5a6e7f"
                stroke="#3a4a5a"
                strokeWidth="2"
            />
            {/* Superstructure */}
            <rect x="110" y="28" width="60" height="14" rx="2" fill="#4a5a6a" />
            <rect x="125" y="18" width="30" height="13" rx="2" fill="#3a4a5a" />
            {/* Turret */}
            <circle cx="80" cy="48" r="8" fill="#4a5a6a" stroke="#3a4a5a" strokeWidth="1.5" />
            <rect x="80" y="45" width="25" height="5" rx="2" fill="#3a4a5a" />
            {/* Rear turret */}
            <circle cx="220" cy="48" r="7" fill="#4a5a6a" stroke="#3a4a5a" strokeWidth="1.5" />
            <rect x="195" y="46" width="25" height="4" rx="2" fill="#3a4a5a" />
            {/* Bow */}
            <path d="M255,45 L275,55 L255,65" fill="none" stroke="#4a5a6a" strokeWidth="1.5" />
        </svg>
    );
}

function SubmarineSVG() {
    return (
        <svg viewBox="0 0 300 100" preserveAspectRatio="none">
            {/* Hull - rounded cigar shape */}
            <ellipse
                cx="150"
                cy="58"
                rx="130"
                ry="20"
                fill="#5a6e7f"
                stroke="#3a4a5a"
                strokeWidth="2"
            />
            {/* Conning tower */}
            <rect
                x="120"
                y="32"
                width="45"
                height="18"
                rx="6"
                fill="#4a5a6a"
                stroke="#3a4a5a"
                strokeWidth="1.5"
            />
            {/* Periscope */}
            <rect x="140" y="20" width="4" height="14" rx="1" fill="#3a4a5a" />
            <rect x="137" y="18" width="10" height="4" rx="1" fill="#3a4a5a" />
            {/* Tail fin */}
            <path
                d="M25,48 L12,35 L12,55 L20,58 Z"
                fill="#4a5a6a"
                stroke="#3a4a5a"
                strokeWidth="1"
            />
            <path
                d="M25,68 L12,80 L12,65 L20,62 Z"
                fill="#4a5a6a"
                stroke="#3a4a5a"
                strokeWidth="1"
            />
            {/* Bow */}
            <ellipse cx="275" cy="58" rx="8" ry="12" fill="#4e6272" />
        </svg>
    );
}

function DestroyerSVG() {
    return (
        <svg viewBox="0 0 200 100" preserveAspectRatio="none">
            {/* Hull */}
            <path
                d="M20,55 L40,45 L60,40 L140,38 L170,45 L185,55 L175,65 L140,72 L60,72 L40,65 Z"
                fill="#5a6e7f"
                stroke="#3a4a5a"
                strokeWidth="2"
            />
            {/* Superstructure */}
            <rect x="75" y="28" width="40" height="14" rx="2" fill="#4a5a6a" />
            <rect x="85" y="20" width="20" height="11" rx="2" fill="#3a4a5a" />
            {/* Gun */}
            <circle cx="55" cy="48" r="6" fill="#4a5a6a" stroke="#3a4a5a" strokeWidth="1" />
            <rect x="55" y="46" width="20" height="4" rx="1" fill="#3a4a5a" />
            {/* Bow */}
            <path d="M165,45 L182,55 L165,65" fill="none" stroke="#4a5a6a" strokeWidth="1.5" />
        </svg>
    );
}

const SVG_MAP: Record<string, () => JSX.Element> = {
    carrier: CarrierSVG,
    battleship: BattleshipSVG,
    cruiser: CruiserSVG,
    submarine: SubmarineSVG,
    destroyer: DestroyerSVG,
};

export default function ShipSprite({
    shipId,
    cellSize = 40,
    orientation = "horizontal",
    className = "",
    isSunk = false,
}: ShipSpriteProps) {
    const SVGComponent = SVG_MAP[shipId];
    if (!SVGComponent) return null;

    const length = shipLength(shipId);
    const width = cellSize * length;
    const height = cellSize;

    const isVertical = orientation === "vertical";

    return (
        <div
            className={`ship-sprite ${isSunk ? "ship-sprite-sunk" : ""} ${className}`}
            style={{
                width: isVertical ? height : width,
                height: isVertical ? width : height,
            }}
        >
            <div
                className="ship-sprite-inner"
                style={{
                    width,
                    height,
                    transform: isVertical ? `rotate(90deg) translateY(-${height}px)` : undefined,
                    transformOrigin: isVertical ? "top left" : undefined,
                }}
            >
                <SVGComponent />
            </div>
        </div>
    );
}
