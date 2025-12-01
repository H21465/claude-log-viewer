import { useState } from "react";
import type { TimelineEvent } from "../../../types/timeline";
import { EVENT_TYPE_META } from "../../../types/timeline";
import { EventNode } from "../EventNode";

interface ThinkingEventProps {
	event: TimelineEvent;
}

export function ThinkingEvent({ event }: ThinkingEventProps) {
	const [expanded, setExpanded] = useState(false);
	const meta = EVENT_TYPE_META.THINKING;

	const content = event.content || "";
	const preview =
		content.length > 100 ? `${content.slice(0, 100)}...` : content;

	type EventNodeColor =
		| "blue"
		| "green"
		| "red"
		| "purple"
		| "orange"
		| "slate"
		| "gray"
		| "indigo"
		| "teal"
		| "violet";

	return (
		<EventNode
			icon={meta.icon}
			color={meta.color as EventNodeColor}
			timestamp={event.timestamp}
			label="Thinking"
			expandable={content.length > 100}
			expanded={expanded}
			onClick={content.length > 100 ? () => setExpanded(!expanded) : undefined}
		>
			<div className="italic opacity-80 whitespace-pre-wrap break-words">
				{expanded ? content : preview}
			</div>
		</EventNode>
	);
}
