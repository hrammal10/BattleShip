import { useState } from "react";
import "./CopyLinkButton.css";

interface CopyLinkButtonProps {
    gameId: string;
}

export default function CopyLinkButton({ gameId }: CopyLinkButtonProps) {
    const [copied, setCopied] = useState(false);

    const link = `${window.location.origin}/play/${gameId}`;

    const handleCopy = async () => {
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="copy-link">
            <input className="link-input" value={link} readOnly />
            <button className="copy-btn" onClick={handleCopy}>
                {copied ? "Copied!" : "Copy Link"}
            </button>
        </div>
    );
}
