import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

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

export function useWebSocket({ projectId, onMessage }: UseWebSocketOptions = {}) {
	const [isConnected, setIsConnected] = useState(false);
	const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
	const wsRef = useRef<WebSocket | null>(null);
	const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const queryClient = useQueryClient();

	const connect = useCallback(() => {
		if (wsRef.current?.readyState === WebSocket.OPEN) {
			return;
		}

		const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
		const wsUrl = `${protocol}//${window.location.host}/ws/${projectId || "all"}`;
		const ws = new WebSocket(wsUrl);

		ws.onopen = () => {
			console.log("WebSocket connected");
			setIsConnected(true);
		};

		ws.onmessage = (event) => {
			try {
				const message: WebSocketMessage = JSON.parse(event.data);
				setLastMessage(message);

				// Handle different message types
				if (message.type === "message_update") {
					// Invalidate queries to trigger refetch
					queryClient.invalidateQueries({ queryKey: ["messages"] });
					queryClient.invalidateQueries({ queryKey: ["conversations"] });
				}

				// Call custom handler
				onMessage?.(message);
			} catch (error) {
				console.error("Failed to parse WebSocket message:", error);
			}
		};

		ws.onclose = () => {
			console.log("WebSocket disconnected");
			setIsConnected(false);
			wsRef.current = null;

			// Attempt to reconnect after 3 seconds
			reconnectTimeoutRef.current = setTimeout(() => {
				connect();
			}, 3000);
		};

		ws.onerror = (error) => {
			console.error("WebSocket error:", error);
		};

		wsRef.current = ws;
	}, [projectId, onMessage, queryClient]);

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

	const sendMessage = useCallback((message: Record<string, unknown>) => {
		if (wsRef.current?.readyState === WebSocket.OPEN) {
			wsRef.current.send(JSON.stringify(message));
		}
	}, []);

	// Connect on mount, disconnect on unmount
	useEffect(() => {
		connect();

		return () => {
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
