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
};

export function AgentSpawnEvent({
	event,
	compact = false,
}: AgentSpawnEventProps) {
	const [expanded, setExpanded] = useState(false);
	const meta = EVENT_TYPE_META.AGENT_SPAWN;

	const agentIcon = AGENT_ICONS[event.agentType || ""] || "🚀";
	const hasNestedEvents = event.nestedEvents && event.nestedEvents.length > 0;

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
					{promptPreview}
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
				label={event.agentType || "Agent Spawn"}
				expandable={!!event.content || hasNestedEvents}
				expanded={expanded}
				onClick={() => setExpanded(!expanded)}
			>
				<div>
					<div className="flex items-center gap-2 text-sm">
						<span className="font-semibold">
							{event.agentType || "Unknown Agent"}
						</span>
						{event.agentStatus && (
							<span
								className={`px-1.5 py-0.5 rounded text-xs ${
									event.agentStatus === "completed"
										? "bg-green-200 text-green-800"
										: event.agentStatus === "error"
											? "bg-red-200 text-red-800"
											: "bg-yellow-200 text-yellow-800"
								}`}
							>
								{event.agentStatus}
							</span>
						)}
					</div>

					{!expanded && promptPreview && (
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
							<div className="whitespace-pre-wrap break-words text-gray-700 dark:text-gray-300">
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
