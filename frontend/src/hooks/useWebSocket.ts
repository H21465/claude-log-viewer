import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

interface WebSocketMessage {
	type: string;
	project_path?: string;
	session_id?: string;
	data?: {
		type: string;
		messages?: unknown[];
	};
}

interface UseWebSocketOptions {
	projectId?: string | number | null;
	onMessage?: (message: WebSocketMessage) => void;
}

export function useWebSocket({
	projectId,
	onMessage,
}: UseWebSocketOptions = {}) {
	const [isConnected, setIsConnected] = useState(false);
	const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
	const wsRef = useRef<WebSocket | null>(null);
	const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);
	const mountedRef = useRef(true);

	// Use refs for values that shouldn't trigger reconnection
	const onMessageRef = useRef(onMessage);
	onMessageRef.current = onMessage;

	// Debounce refs to prevent infinite query invalidation loops
	const lastInvalidationRef = useRef<{ [key: string]: number }>({});
	const DEBOUNCE_MS = 5000; // Minimum 5 seconds between invalidations

	const queryClient = useQueryClient();
	const queryClientRef = useRef(queryClient);
	queryClientRef.current = queryClient;

	const disconnect = useCallback(() => {
		if (reconnectTimeoutRef.current) {
			clearTimeout(reconnectTimeoutRef.current);
			reconnectTimeoutRef.current = null;
		}

		if (wsRef.current) {
			wsRef.current.close();
			wsRef.current = null;
		}

		setIsConnected(false);
	}, []);

	const connect = useCallback(() => {
		// Don't connect if already connected or connecting
		if (
			wsRef.current?.readyState === WebSocket.OPEN ||
			wsRef.current?.readyState === WebSocket.CONNECTING
		) {
			return;
		}

		// In development mode, connect directly to the backend server
		// to avoid Vite's WebSocket proxy issues
		const isDev = import.meta.env.DEV;
		const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
		const host = isDev ? "localhost:8000" : window.location.host;
		const wsUrl = `${protocol}//${host}/ws/${projectId || "all"}`;

		try {
			const ws = new WebSocket(wsUrl);

			ws.onopen = () => {
				if (mountedRef.current) {
					console.log("WebSocket connected");
					setIsConnected(true);
				}
			};

			ws.onmessage = (event) => {
				if (!mountedRef.current) return;

				try {
					const message: WebSocketMessage = JSON.parse(event.data);
					setLastMessage(message);

					const now = Date.now();

					// Handle different message types with debouncing
					if (message.type === "message_update") {
						const lastTime = lastInvalidationRef.current.messages || 0;
						if (now - lastTime > DEBOUNCE_MS) {
							lastInvalidationRef.current.messages = now;
							queryClientRef.current.invalidateQueries({
								queryKey: ["messages"],
							});
							queryClientRef.current.invalidateQueries({
								queryKey: ["conversations"],
							});
						}
					}

					// Handle usage updates with debouncing
					if (message.type === "usage_update") {
						const lastTime = lastInvalidationRef.current.usage || 0;
						if (now - lastTime > DEBOUNCE_MS) {
							lastInvalidationRef.current.usage = now;
							queryClientRef.current.invalidateQueries({
								queryKey: ["usage"],
							});
						}
					}

					// Call custom handler
					onMessageRef.current?.(message);
				} catch (error) {
					console.error("Failed to parse WebSocket message:", error);
				}
			};

			ws.onclose = () => {
				if (mountedRef.current) {
					console.log("WebSocket disconnected");
					setIsConnected(false);
					wsRef.current = null;

					// Attempt to reconnect after 5 seconds (only if still mounted)
					reconnectTimeoutRef.current = setTimeout(() => {
						if (mountedRef.current) {
							connect();
						}
					}, 5000);
				}
			};

			ws.onerror = (error) => {
				console.error("WebSocket error:", error);
			};

			wsRef.current = ws;
		} catch (error) {
			console.error("Failed to create WebSocket:", error);
		}
	}, [projectId]); // Only depend on projectId

	const sendMessage = useCallback((message: Record<string, unknown>) => {
		if (wsRef.current?.readyState === WebSocket.OPEN) {
			wsRef.current.send(JSON.stringify(message));
		}
	}, []);

	// Connect on mount, disconnect on unmount
	useEffect(() => {
		mountedRef.current = true;
		connect();

		return () => {
			mountedRef.current = false;
			disconnect();
		};
	}, [connect, disconnect]);

	// Send ping periodically to keep connection alive
	useEffect(() => {
		if (!isConnected) return;

		const pingInterval = setInterval(() => {
			sendMessage({ type: "ping" });
		}, 25000);

		return () => {
			clearInterval(pingInterval);
		};
	}, [isConnected, sendMessage]);

	return {
		isConnected,
		lastMessage,
		sendMessage,
		connect,
		disconnect,
	};
}
