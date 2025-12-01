import { useState } from "react";
import type { TimelineEvent } from "../../../types/timeline";
import { EVENT_TYPE_META } from "../../../types/timeline";
import { EventNode } from "../EventNode";

interface AgentResultEventProps {
	event: TimelineEvent;
}

export function AgentResultEvent({ event }: AgentResultEventProps) {
	const [expanded, setExpanded] = useState(false);
	const meta = EVENT_TYPE_META.AGENT_RESULT;

	const content = event.content || "";
	const isLong = content.length > 300;
	const preview = isLong ? `${content.slice(0, 300)}...` : content;

	// Detect success/failure
	const isError =
		content.toLowerCase().includes("error") ||
		content.toLowerCase().includes("failed");

	return (
		<EventNode
			icon={isError ? "❌" : meta.icon}
			color={
				isError
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
			label="Agent Result"
			expandable={isLong}
			expanded={expanded}
			onClick={isLong ? () => setExpanded(!expanded) : undefined}
		>
			<div className="whitespace-pre-wrap break-words text-sm">
				{expanded ? content : preview}
			</div>
		</EventNode>
	);
}
