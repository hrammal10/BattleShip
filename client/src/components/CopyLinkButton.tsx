import { useState, useEffect, useRef } from "react";
import "./CopyLinkButton.css";

interface CopyLinkButtonProps {
    gameId: string;
}

const COPIED_RESET_DELAY_MS = 2000;

export default function CopyLinkButton({ gameId }: CopyLinkButtonProps) {
    const [copied, setCopied] = useState(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const link = `${window.location.origin}/play/${gameId}`;

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            timeoutRef.current = setTimeout(() => setCopied(false), COPIED_RESET_DELAY_MS);
        } catch {
            // Clipboard API unavailable or permission denied — no-op
        }
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
