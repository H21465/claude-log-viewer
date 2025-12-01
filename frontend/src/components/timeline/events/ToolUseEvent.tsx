import { useState } from "react";
import type { TimelineEvent } from "../../../types/timeline";
import { EVENT_TYPE_META } from "../../../types/timeline";
import { EventNode } from "../EventNode";

interface ToolUseEventProps {
	event: TimelineEvent;
}

// Tool icon mapping
const TOOL_ICONS: Record<string, string> = {
	Bash: "💻",
	Read: "📖",
	Write: "✏️",
	Edit: "📝",
	Glob: "🗂️",
	Grep: "🔍",
	WebFetch: "🌐",
	WebSearch: "🔎",
	Task: "🔀",
	TodoWrite: "✅",
};

function formatToolInput(input: Record<string, unknown> | undefined): string {
	if (!input) return "";

	// Display priority parameters
	const priorityKeys = [
		"command",
		"file_path",
		"pattern",
		"url",
		"query",
		"content",
	];
	for (const key of priorityKeys) {
		if (input[key]) {
			const value = input[key];
			if (typeof value === "string") {
				return value.length > 100 ? `${value.slice(0, 100)}...` : value;
			}
		}
	}

	return JSON.stringify(input, null, 2).slice(0, 200);
}

export function ToolUseEvent({ event }: ToolUseEventProps) {
	const [expanded, setExpanded] = useState(false);
	const meta = EVENT_TYPE_META.TOOL_USE;
	const toolIcon = TOOL_ICONS[event.toolName || ""] || "🔧";

	return (
		<EventNode
			icon={toolIcon}
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
			label={event.toolName || "Tool"}
			expandable={!!event.toolInput}
			expanded={expanded}
			onClick={() => setExpanded(!expanded)}
		>
			<div className="overflow-hidden">
				{/* Tool call preview */}
				<div className="font-mono text-xs bg-white/30 dark:bg-black/20 rounded px-2 py-1 break-all">
					{formatToolInput(event.toolInput)}
				</div>

				{/* Full JSON when expanded */}
				{expanded && event.toolInput && (
					<pre className="mt-2 text-xs bg-white/50 dark:bg-black/30 rounded p-2 max-h-60 overflow-y-auto whitespace-pre-wrap break-all">
						{JSON.stringify(event.toolInput, null, 2)}
					</pre>
				)}
			</div>
		</EventNode>
	);
}
