import { io, Socket } from "socket.io-client";

// No URL = connects to window.location.origin (Vite proxy forwards /socket.io to the server)
const socket: Socket = io({
    autoConnect: false,
});

export default socket;
