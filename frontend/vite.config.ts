import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";
import { defineConfig } from "vite";

// Backend port configuration
const BACKEND_PORTS = [8000, 8001, 8002, 8003, 8004];
const PORT_FILE = path.resolve(__dirname, "../.backend_port");

/**
 * Get the backend port from port file or default
 */
function getBackendPort(): number {
	try {
		if (fs.existsSync(PORT_FILE)) {
			const port = parseInt(fs.readFileSync(PORT_FILE, "utf-8").trim(), 10);
			if (!isNaN(port)) {
				console.log(`Using backend port from file: ${port}`);
				return port;
			}
		}
	} catch {
		// Ignore errors
	}
	console.log(`Using default backend port: ${BACKEND_PORTS[0]}`);
	return BACKEND_PORTS[0];
}

const backendPort = getBackendPort();

// https://vite.dev/config/
export default defineConfig({
	plugins: [react()],
	server: {
		proxy: {
			"/api": {
				target: `http://127.0.0.1:${backendPort}`,
				changeOrigin: true,
			},
			// WebSocket proxy temporarily disabled
			// "/ws": {
			// 	target: `ws://127.0.0.1:${backendPort}`,
			// 	ws: true,
			// 	rewriteWsOrigin: true,
			// },
		},
	},
});
