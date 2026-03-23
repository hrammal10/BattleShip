import { useState, useEffect, useRef } from "react";
import socket from "../socket";
import { useGame } from "../hooks/useGame";
import "./ChatBox.css";

export default function ChatBox() {
    const { gameId, playerId, chatMessages: messages } = useGame();
    const [input, setInput] = useState("");
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const send = () => {
        const trimmed = input.trim();
        if (!trimmed || !gameId) return;
        socket.emit("chat-message", { gameId, text: trimmed });
        setInput("");
    };

    const handleKey = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") send();
    };

    return (
        <div className="chatbox">
            <div className="chatbox-title">Chat</div>
            <div className="chatbox-messages">
                {messages.length === 0 && <p className="chatbox-empty">No messages yet...</p>}
                {messages.map((msg, i) => {
                    const isMine = msg.from === playerId;
                    const prevMsg = messages[i - 1];
                    const showSender = !prevMsg || prevMsg.from !== msg.from;
                    return (
                        <div
                            key={msg.ts + msg.from}
                            className={`chatbox-msg ${isMine ? "mine" : "theirs"}`}
                        >
                            {showSender && (
                                <span className="chatbox-sender">{isMine ? "You" : "Enemy"}</span>
                            )}
                            <span className="chatbox-text">{msg.text}</span>
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>
            <div className="chatbox-input-row">
                <input
                    className="chatbox-input"
                    type="text"
                    placeholder="Say something..."
                    value={input}
                    maxLength={200}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKey}
                />
                <button className="chatbox-send" onClick={send} disabled={!input.trim()}>
                    Send
                </button>
            </div>
        </div>
    );
}
