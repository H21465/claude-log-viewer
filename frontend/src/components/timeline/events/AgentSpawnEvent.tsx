import { useMemo, useState } from "react";
import type { TimelineEvent } from "../../../types/timeline";
import { EVENT_TYPE_META } from "../../../types/timeline";
import { EventNode } from "../EventNode";

interface AgentSpawnEventProps {
	event: TimelineEvent;
	compact?: boolean;
}

// Agent type icons mapping
const AGENT_ICONS: Record<string, string> = {
	architect: "🏗️",
	implementer: "⚙️",
	reviewer: "👁️",
	debugger: "🐛",
	"doc-writer": "📝",
	explore: "🔭",
	search: "🔍",
	Explore: "🔭",
	Plan: "📋",
	"general-purpose": "🤖",
	"claude-code-guide": "📚",
};

// Agent type descriptions
const AGENT_DESCRIPTIONS: Record<string, string> = {
	architect: "設計・判断・タスク分割",
	implementer: "機能実装",
	reviewer: "コードレビュー",
	debugger: "デバッグ・エラー解析",
	"doc-writer": "ドキュメント生成",
	explore: "コードベース探索",
	search: "Web検索・ドキュメント調査",
	Explore: "コードベース探索",
	Plan: "計画・設計",
	"general-purpose": "汎用エージェント",
	"claude-code-guide": "Claude Code ガイド",
};

export function AgentSpawnEvent({
	event,
	compact = false,
}: AgentSpawnEventProps) {
	const [expanded, setExpanded] = useState(false);
	const meta = EVENT_TYPE_META.AGENT_SPAWN;

	const agentIcon = AGENT_ICONS[event.agentType || ""] || "🚀";
	const agentDesc = AGENT_DESCRIPTIONS[event.agentType || ""] || "";
	const hasNestedEvents = event.nestedEvents && event.nestedEvents.length > 0;

	// Extract description from toolInput if available
	const taskDescription = useMemo(() => {
		const input = event.toolInput as Record<string, unknown> | undefined;
		return input?.description as string | undefined;
	}, [event.toolInput]);

	// Prompt preview
	const promptPreview = useMemo(() => {
		const prompt = event.content || "";
		if (prompt.length > 150) {
			return `${prompt.slice(0, 150)}...`;
		}
		return prompt;
	}, [event.content]);

	if (compact) {
		return (
			<div className="text-sm p-2">
				<div className="flex items-center gap-2 font-medium">
					<span>{agentIcon}</span>
					<span>{event.agentType || "Agent"}</span>
				</div>
				<div className="text-xs text-gray-500 mt-1 line-clamp-2">
					{taskDescription || promptPreview}
				</div>
			</div>
		);
	}

	return (
		<div className="mb-3">
			<EventNode
				icon={agentIcon}
				color={
					meta.color as
						| "blue"
						| "green"
						| "red"
						| "purple"
						| "orange"
						| "slate"
						| "gray"
						| "indigo"
						| "teal"
						| "violet"
				}
				timestamp={event.timestamp}
				label="Subagent Started"
				expandable={!!event.content || hasNestedEvents}
				expanded={expanded}
				onClick={() => setExpanded(!expanded)}
			>
				<div>
					{/* Agent type header with icon */}
					<div className="flex items-center gap-2 mb-1">
						<span className="text-lg">{agentIcon}</span>
						<span className="font-semibold text-indigo-700 dark:text-indigo-300">
							{event.agentType || "Unknown Agent"}
						</span>
						<span className="px-2 py-0.5 rounded-full text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 animate-pulse">
							Running
						</span>
					</div>

					{/* Agent role description */}
					{agentDesc && (
						<div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
							{agentDesc}
						</div>
					)}

					{/* Task description (short summary) */}
					{taskDescription && (
						<div className="flex items-center gap-1 text-sm mt-1">
							<span className="text-gray-400">📌</span>
							<span className="font-medium text-gray-700 dark:text-gray-300">
								{taskDescription}
							</span>
						</div>
					)}

					{/* Prompt preview (if no description) */}
					{!expanded && !taskDescription && promptPreview && (
						<div className="text-xs text-gray-500 mt-1 line-clamp-2">
							{promptPreview}
						</div>
					)}
				</div>
			</EventNode>

			{/* Expanded: Full prompt and nested events */}
			{expanded && (
				<div className="ml-8 pl-4 border-l-2 border-indigo-300 dark:border-indigo-700">
					{/* Full prompt */}
					{event.content && (
						<div className="mb-3 p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded text-sm overflow-hidden">
							<div className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-1">
								Prompt:
							</div>
							<div className="whitespace-pre-wrap break-words text-gray-700 dark:text-gray-300 text-xs">
								{event.content}
							</div>
						</div>
					)}

					{/* Nested events */}
					{hasNestedEvents && (
						<div className="space-y-2">
							<div className="text-xs font-medium text-gray-500 mb-2">
								Sub-agent events ({event.nestedEvents?.length}):
							</div>
							{/* Note: Actual nested event rendering will be done by parent component */}
							<div className="text-xs text-gray-400">
								(Nested events will be rendered by parent)
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
