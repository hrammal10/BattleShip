import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const serverTarget = process.env.VITE_SERVER_URL || "http://localhost:3001";

export default defineConfig({
    plugins: [react()],
    server: {
        host: true,
        port: 5173,
        allowedHosts: true,
        proxy: {
            "/api": {
                target: serverTarget,
                changeOrigin: true,
            },
            "/socket.io": {
                target: serverTarget,
                changeOrigin: true,
                ws: true,
            },
        },
    },
});
