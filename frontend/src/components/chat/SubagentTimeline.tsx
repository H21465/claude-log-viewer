import { useState } from "react";
import type { ContentBlock, SubagentMessage } from "../../types";

interface SubagentTimelineProps {
	messages: SubagentMessage[];
	model: string | null;
	slug: string | null;
	stats: {
		total_messages: number;
		total_input_tokens: number;
		total_output_tokens: number;
		tool_use_count: number;
		thinking_count: number;
	};
}

// Format timestamp
const formatTime = (timestamp: string): string => {
	try {
		const date = new Date(timestamp);
		return date.toLocaleTimeString("ja-JP", {
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		});
	} catch {
		return timestamp;
	}
};

// Message block component
interface MessageBlockProps {
	block: ContentBlock;
	timestamp: string;
}

const ThinkingMessage = ({ block, timestamp }: MessageBlockProps) => {
	const [expanded, setExpanded] = useState(false);
	const preview = (block.thinking || "").slice(0, 60).replace(/\n/g, " ");

	return (
		<div className="flex gap-2 group">
			<div className="flex-shrink-0 w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
				<span className="text-lg">💭</span>
			</div>
			<div className="flex-1 min-w-0">
				<div className="flex items-baseline gap-2 mb-1">
					<span className="font-semibold text-sm text-violet-700 dark:text-violet-400">
						Thinking
					</span>
					<span className="text-xs text-gray-500 dark:text-gray-500">
						{formatTime(timestamp)}
					</span>
				</div>
				<div className="rounded-lg overflow-hidden border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20">
					<button
						type="button"
						onClick={() => setExpanded(!expanded)}
						className="w-full px-3 py-2 text-left flex items-center justify-between hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors"
					>
						<span className="text-sm text-violet-800 dark:text-violet-300 truncate">
							{!expanded && <>{preview}...</>}
							{expanded && "思考の詳細"}
						</span>
						<span
							className={`text-xs transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
						>
							▶
						</span>
					</button>
					{expanded && (
						<div className="px-3 py-2 bg-white dark:bg-gray-900 border-t border-violet-200 dark:border-violet-800 max-h-[400px] overflow-y-auto">
							<pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap font-mono leading-relaxed">
								{block.thinking}
							</pre>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

const ToolUseMessage = ({ block, timestamp }: MessageBlockProps) => {
	const [expanded, setExpanded] = useState(false);
	const toolName = block.tool_name || "Unknown";

	// Tool icon mapping
	const toolIcons: Record<string, string> = {
		bash: "💻",
		read: "📖",
		write: "✏️",
		edit: "📝",
		grep: "🔍",
		glob: "🗂️",
		task: "🔀",
	};

	const icon = toolIcons[toolName.toLowerCase()] || "🔧";

	// Get summary from tool input
	const getSummary = (): string => {
		if (!block.tool_input) return "";
		const input = block.tool_input;

		if (input.file_path) {
			const path = String(input.file_path);
			return path.split("/").pop() || path;
		}
		if (input.command) {
			return `${String(input.command).slice(0, 40)}...`;
		}
		if (input.pattern) {
			return `/${input.pattern}/`;
		}
		return "";
	};

	const summary = getSummary();

	return (
		<div className="flex gap-2 group">
			<div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
				<span className="text-lg">{icon}</span>
			</div>
			<div className="flex-1 min-w-0">
				<div className="flex items-baseline gap-2 mb-1">
					<span className="font-semibold text-sm text-blue-700 dark:text-blue-400">
						{toolName}
					</span>
					{summary && (
						<code className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 rounded font-mono truncate max-w-[300px]">
							{summary}
						</code>
					)}
					<span className="text-xs text-gray-500 dark:text-gray-500">
						{formatTime(timestamp)}
					</span>
				</div>
				<div className="rounded-lg overflow-hidden border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
					<button
						type="button"
						onClick={() => setExpanded(!expanded)}
						className="w-full px-3 py-2 text-left flex items-center justify-between hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
					>
						<span className="text-sm text-blue-800 dark:text-blue-300">
							{expanded ? "パラメータを隠す" : "パラメータを表示"}
						</span>
						<span
							className={`text-xs transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
						>
							▶
						</span>
					</button>
					{expanded && block.tool_input && (
						<div className="px-3 py-2 bg-white dark:bg-gray-900 border-t border-blue-200 dark:border-blue-800 max-h-[400px] overflow-y-auto">
							{block.tool_use_id && (
								<div className="text-xs text-gray-500 dark:text-gray-500 mb-2">
									ID: {block.tool_use_id}
								</div>
							)}
							<pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
								{JSON.stringify(block.tool_input, null, 2)}
							</pre>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

const ToolResultMessage = ({ block, timestamp }: MessageBlockProps) => {
	const [expanded, setExpanded] = useState(false);
	const preview = (block.text || "").slice(0, 80).replace(/\n/g, " ");

	return (
		<div className="flex gap-2 group">
			<div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
				<span className="text-lg">✓</span>
			</div>
			<div className="flex-1 min-w-0">
				<div className="flex items-baseline gap-2 mb-1">
					<span className="font-semibold text-sm text-emerald-700 dark:text-emerald-400">
						結果
					</span>
					<span className="text-xs text-gray-500 dark:text-gray-500">
						{formatTime(timestamp)}
					</span>
				</div>
				<div className="rounded-lg overflow-hidden border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20">
					<button
						type="button"
						onClick={() => setExpanded(!expanded)}
						className="w-full px-3 py-2 text-left flex items-center justify-between hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
					>
						<span className="text-sm text-emerald-800 dark:text-emerald-300 truncate">
							{!expanded && <>{preview}...</>}
							{expanded && "結果の詳細"}
						</span>
						<span
							className={`text-xs transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
						>
							▶
						</span>
					</button>
					{expanded && (
						<div className="px-3 py-2 bg-white dark:bg-gray-900 border-t border-emerald-200 dark:border-emerald-800 max-h-[400px] overflow-y-auto">
							<pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap font-mono leading-relaxed">
								{block.text}
							</pre>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

const TextMessage = ({ block, timestamp }: MessageBlockProps) => {
	return (
		<div className="flex gap-2 group">
			<div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
				<span className="text-lg">💬</span>
			</div>
			<div className="flex-1 min-w-0">
				<div className="flex items-baseline gap-2 mb-1">
					<span className="font-semibold text-sm text-gray-700 dark:text-gray-400">
						Text
					</span>
					<span className="text-xs text-gray-500 dark:text-gray-500">
						{formatTime(timestamp)}
					</span>
				</div>
				<div className="rounded-lg px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
					<div className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
						{block.text}
					</div>
				</div>
			</div>
		</div>
	);
};

const MessageBlock = ({ block, timestamp }: MessageBlockProps) => {
	switch (block.type) {
		case "thinking":
			return <ThinkingMessage block={block} timestamp={timestamp} />;
		case "tool_use":
			return <ToolUseMessage block={block} timestamp={timestamp} />;
		case "tool_result":
			return <ToolResultMessage block={block} timestamp={timestamp} />;
		case "text":
			return <TextMessage block={block} timestamp={timestamp} />;
		default:
			return null;
	}
};

export const SubagentTimeline = ({
	messages,
	model,
	slug,
	stats,
}: SubagentTimelineProps) => {
	return (
		<div className="flex flex-col h-full">
			{/* Stats header */}
			<div className="flex-shrink-0 px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
				<div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
					<div className="flex items-center gap-1.5">
						<span className="text-gray-500 dark:text-gray-500">Agent:</span>
						<span className="font-medium text-gray-700 dark:text-gray-300">
							{slug || "Unknown"}
						</span>
					</div>
					{model && (
						<div className="flex items-center gap-1.5">
							<span className="text-gray-500 dark:text-gray-500">Model:</span>
							<span className="font-mono text-xs text-gray-700 dark:text-gray-300">
								{model}
							</span>
						</div>
					)}
					<div className="flex items-center gap-1.5">
						<span>📊</span>
						<span className="text-gray-600 dark:text-gray-400">
							{stats.total_messages} messages
						</span>
					</div>
					<div className="flex items-center gap-1.5">
						<span>💭</span>
						<span className="text-gray-600 dark:text-gray-400">
							{stats.thinking_count} thinking
						</span>
					</div>
					<div className="flex items-center gap-1.5">
						<span>🔧</span>
						<span className="text-gray-600 dark:text-gray-400">
							{stats.tool_use_count} tools
						</span>
					</div>
					<div className="flex items-center gap-1.5">
						<span>🔢</span>
						<span className="text-gray-600 dark:text-gray-400">
							{stats.total_input_tokens.toLocaleString()} in /{" "}
							{stats.total_output_tokens.toLocaleString()} out
						</span>
					</div>
				</div>
			</div>

			{/* Timeline */}
			<div className="flex-1 overflow-y-auto px-4 py-4">
				<div className="space-y-4 max-w-4xl">
					{messages.map((message) => (
						<div key={message.uuid} className="space-y-3">
							{/* Role indicator for user messages */}
							{message.role === "user" && (
								<div className="flex items-center gap-2 mb-2">
									<div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
										<span className="text-lg">👤</span>
									</div>
									<div>
										<div className="font-semibold text-sm text-indigo-700 dark:text-indigo-400">
											User
										</div>
									</div>
								</div>
							)}

							{/* Content blocks */}
							{message.content_blocks && message.content_blocks.length > 0 ? (
								message.content_blocks.map((block, idx) => (
									<MessageBlock
										key={`${message.uuid}-${idx}`}
										block={block}
										timestamp={message.timestamp}
									/>
								))
							) : (
								// Fallback for messages without content_blocks
								<TextMessage
									block={{ type: "text", text: message.content }}
									timestamp={message.timestamp}
								/>
							)}
						</div>
					))}
				</div>
			</div>
		</div>
	);
};
