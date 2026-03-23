import type { President } from "../types/game";
import "./PresidentSidebar.css";

interface PresidentSidebarProps {
    president: President | null;
    isEnemy?: boolean;
    pendingText?: string;
}

export default function PresidentSidebar({
    president,
    isEnemy = false,
    pendingText = "Unknown",
}: PresidentSidebarProps) {
    if (!president && !isEnemy) return null;

    if (!president) {
        return (
            <div className="president-sidebar enemy pending">
                <p className="president-sidebar-label">Enemy's President</p>
                <p className="president-sidebar-pending">{pendingText}</p>
            </div>
        );
    }

    return (
        <div className={`president-sidebar${isEnemy ? " enemy" : ""}`}>
            {isEnemy && <p className="president-sidebar-label">Enemy's President</p>}
            <div className="president-sidebar-icon">{president.icon}</div>
            <h3 className="president-sidebar-name">{president.name}</h3>
            <p className="president-sidebar-title">{president.title}</p>
            <p className="president-sidebar-desc">{president.description}</p>
            <div className="president-sidebar-ability">
                <span className={`president-sidebar-badge ${president.abilityType}`}>
                    {president.abilityType === "active" ? "⚡ Active" : "✨ Passive"}
                </span>
                <p className="president-sidebar-ability-name">{president.abilityName}</p>
                <p className="president-sidebar-ability-desc">{president.abilityDescription}</p>
            </div>
        </div>
    );
}
