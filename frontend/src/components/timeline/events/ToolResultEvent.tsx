import { useState } from "react";
import type { TimelineEvent } from "../../../types/timeline";
import { EVENT_TYPE_META } from "../../../types/timeline";
import { EventNode } from "../EventNode";

interface ToolResultEventProps {
	event: TimelineEvent;
}

function getResultStatus(
	content: string | undefined,
): "success" | "error" | "neutral" {
	if (!content) return "neutral";
	const lower = content.toLowerCase();
	if (
		lower.includes("error") ||
		lower.includes("failed") ||
		lower.includes("exception")
	) {
		return "error";
	}
	if (
		lower.includes("success") ||
		lower.includes("created") ||
		lower.includes("written")
	) {
		return "success";
	}
	return "neutral";
}

export function ToolResultEvent({ event }: ToolResultEventProps) {
	const [expanded, setExpanded] = useState(false);
	const meta = EVENT_TYPE_META.TOOL_RESULT;

	const content = event.content || "";
	const isLong = content.length > 200;
	const status = getResultStatus(content);

	const statusIcon = {
		success: "✓",
		error: "✗",
		neutral: "•",
	}[status];

	const statusColor = {
		success: "text-green-600 dark:text-green-400",
		error: "text-red-600 dark:text-red-400",
		neutral: "text-gray-500",
	}[status];

	return (
		<EventNode
			icon={meta.icon}
			color={
				status === "error"
					? "red"
					: (meta.color as
							| "blue"
							| "green"
							| "red"
							| "purple"
							| "orange"
							| "slate"
							| "gray"
							| "indigo"
							| "teal"
							| "violet")
			}
			timestamp={event.timestamp}
			label={event.toolName ? `${event.toolName} Result` : "Result"}
			expandable={isLong}
			expanded={expanded}
			onClick={isLong ? () => setExpanded(!expanded) : undefined}
		>
			<div>
				<span className={`font-medium ${statusColor}`}>{statusIcon} </span>
				<span
					className={`font-mono text-xs whitespace-pre-wrap break-all ${!expanded && isLong ? "line-clamp-3" : ""}`}
				>
					{content}
				</span>
			</div>
		</EventNode>
	);
}
