import { useState } from "react";
import type { TimelineEvent } from "../../../types/timeline";
import { EVENT_TYPE_META } from "../../../types/timeline";
import { EventNode } from "../EventNode";

interface ToolResultEventProps {
	event: TimelineEvent;
}

function getResultStatus(
	content: string | undefined,
	toolName: string | undefined,
): "success" | "error" | "neutral" {
	if (!content) return "neutral";

	// Readツールなど読み取り系はニュートラル
	if (toolName === "Read" || toolName === "Glob" || toolName === "Grep") {
		return "neutral";
	}

	const lower = content.toLowerCase();
	// 明確なエラーパターンのみ検出
	if (
		lower.startsWith("error:") ||
		lower.startsWith("error ") ||
		lower.includes("failed to") ||
		lower.includes("exception:") ||
		lower.includes("traceback") ||
		lower.includes("command failed") ||
		lower.includes("exit code 1")
	) {
		return "error";
	}
	return "success";
}

export function ToolResultEvent({ event }: ToolResultEventProps) {
	const [expanded, setExpanded] = useState(false);
	const meta = EVENT_TYPE_META.TOOL_RESULT;

	const content = event.content || "";
	const isLong = content.length > 200;
	const status = getResultStatus(content, event.toolName);

	const StatusIcon = () => {
		const colorClass =
			status === "error"
				? "text-red-600 dark:text-red-400"
				: status === "success"
					? "text-green-600 dark:text-green-400"
					: "text-gray-500 dark:text-gray-400";

		return (
			<svg
				className={`w-4 h-4 inline ${colorClass}`}
				fill="currentColor"
				viewBox="0 0 20 20"
			>
				<path
					fillRule="evenodd"
					d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
					clipRule="evenodd"
				/>
			</svg>
		);
	};

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
				<StatusIcon />{" "}
				<span
					className={`font-mono text-xs whitespace-pre-wrap break-all ${!expanded && isLong ? "line-clamp-3" : ""}`}
				>
					{content}
				</span>
			</div>
		</EventNode>
	);
}
