// イベントタイプ
export type EventType =
	| "USER_MESSAGE"
	| "USER_PERMISSION"
	| "USER_REJECTION"
	| "THINKING"
	| "AGENT_RESPONSE"
	| "TOOL_USE"
	| "TOOL_RESULT"
	| "AGENT_SPAWN"
	| "AGENT_RESULT"
	| "PARALLEL_GROUP";

// タイムラインイベント
export interface TimelineEvent {
	id: string;
	type: EventType;
	timestamp: string;
	messageId: number;
	blockIndex?: number;

	// Content
	content?: string;

	// Tool related
	toolName?: string;
	toolInput?: Record<string, unknown>;
	toolUseId?: string;

	// Agent related
	agentType?: string;
	agentId?: string;
	agentStatus?: "running" | "completed" | "error";
	model?: string;

	// Nested events (for AGENT_SPAWN)
	nestedEvents?: TimelineEvent[];

	// Parallel tasks (for PARALLEL_GROUP)
	parallelTasks?: TimelineEvent[];

	// Permission related
	permissionType?: string;
	isAllowed?: boolean;

	// Stats
	duration?: number;
	tokenCount?: number;
}

// フィルタ
export interface TimelineFilter {
	eventTypes: EventType[];
	searchQuery?: string;
	agentTypes?: string[];
}

// イベントタイプのメタデータ
export const EVENT_TYPE_META: Record<
	EventType,
	{
		icon: string;
		label: string;
		color: string;
	}
> = {
	USER_MESSAGE: { icon: "💬", label: "User Message", color: "blue" },
	USER_PERMISSION: { icon: "✅", label: "Permission Granted", color: "green" },
	USER_REJECTION: { icon: "❌", label: "Permission Denied", color: "red" },
	THINKING: { icon: "💭", label: "Thinking", color: "purple" },
	AGENT_RESPONSE: { icon: "🤖", label: "Agent Response", color: "orange" },
	TOOL_USE: { icon: "🔧", label: "Tool Use", color: "slate" },
	TOOL_RESULT: { icon: "📋", label: "Tool Result", color: "gray" },
	AGENT_SPAWN: { icon: "🚀", label: "Agent Spawn", color: "indigo" },
	AGENT_RESULT: { icon: "✓", label: "Agent Result", color: "teal" },
	PARALLEL_GROUP: {
		icon: "⚡",
		label: "Parallel Execution",
		color: "violet",
	},
};
