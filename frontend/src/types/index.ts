export interface Project {
	id: number;
	name: string;
	path: string;
	created_at: string;
	updated_at: string;
	conversation_count?: number;
	message_count?: number;
	last_activity?: string;
}

export interface Conversation {
	id: number;
	session_id: string;
	project_id: number;
	started_at: string;
	updated_at: string;
	message_count: number;
	preview?: string; // 最初のユーザーメッセージの冒頭
}

export interface ContentBlock {
	type: "text" | "thinking" | "tool_use" | "tool_result";
	text?: string;
	thinking?: string;
	tool_use_id?: string;
	tool_name?: string;
	tool_input?: ToolInput;
}

export interface ToolInput {
	prompt?: string;
	subagent_type?: string;
	description?: string;
	command?: string;
	file_path?: string;
	pattern?: string;
	[key: string]: unknown;
}

export interface ToolUseResult {
	status?: string;
	prompt?: string;
	agentId?: string;
	content?: unknown;
	totalDurationMs?: number;
	totalTokens?: number;
	totalToolUseCount?: number;
}

export interface Message {
	id: number;
	uuid: string;
	parent_uuid: string | null;
	conversation_id: number;
	role: "user" | "assistant";
	content: string;
	content_blocks?: ContentBlock[];
	model: string | null;
	timestamp: string;
	has_tool_use?: boolean;
	has_thinking?: boolean;
	is_sidechain?: boolean;
	is_meta?: boolean;
	tool_use_result?: ToolUseResult | null;
}

// サブエージェント内のメッセージ
export interface SubagentMessage {
	uuid: string;
	parent_uuid: string | null;
	role: "user" | "assistant";
	content: string;
	content_blocks?: ContentBlock[];
	model: string | null;
	timestamp: string;
	has_tool_use: boolean;
	has_thinking: boolean;
}

// サブエージェント詳細（メッセージ履歴含む）
export interface SubagentDetail {
	agent_id: string;
	session_id: string;
	slug: string | null;
	model: string | null;
	messages: SubagentMessage[];
	stats: {
		total_duration_ms: number | null;
		total_tokens: number | null;
		message_count: number;
	};
}

// サブエージェント概要（一覧表示用）
export interface SubagentSummary {
	agent_id: string;
	tool_use_id: string;
	subagent_type: string;
	description: string | null;
	status: "running" | "completed" | "error";
	model: string | null;
	timestamp: string;
	stats: {
		total_duration_ms: number | null;
		total_tokens: number | null;
		message_count: number;
	};
}

// 並列タスクのグループ化用
export interface ParallelTaskGroup {
	tasks: ContentBlock[];
	startIndex: number;
	endIndex: number;
}

export interface SearchQuery {
	query: string;
	project_id?: number;
	role?: "user" | "assistant";
	start_date?: string;
	end_date?: string;
}

export interface SearchResult {
	message: Message;
	conversation: Conversation;
	project: Project;
	highlight: string; // ハイライト付きスニペット
}

export interface AppState {
	selectedProjectId: number | null;
	selectedConversationId: number | null;
	searchQuery: string;
	darkMode: boolean;
	setSelectedProjectId: (id: number | null) => void;
	setSelectedConversationId: (id: number | null) => void;
	setSearchQuery: (query: string) => void;
	toggleDarkMode: () => void;
}
