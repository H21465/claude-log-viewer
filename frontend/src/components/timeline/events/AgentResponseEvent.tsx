import { useState } from "react";
import ReactMarkdown from "react-markdown";
import type { TimelineEvent } from "../../../types/timeline";
import { EVENT_TYPE_META } from "../../../types/timeline";
import { EventNode } from "../EventNode";

interface AgentResponseEventProps {
	event: TimelineEvent;
}

export function AgentResponseEvent({ event }: AgentResponseEventProps) {
	const [expanded, setExpanded] = useState(true);
	const meta = EVENT_TYPE_META.AGENT_RESPONSE;

	const content = event.content || "";
	const isLong = content.length > 300;

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
			label="Response"
			expandable={isLong}
			expanded={expanded}
			onClick={isLong ? () => setExpanded(!expanded) : undefined}
		>
			<div
				className={`prose prose-sm dark:prose-invert max-w-none overflow-hidden ${!expanded ? "line-clamp-3" : ""}`}
			>
				<ReactMarkdown
					components={{
						pre: ({ children }) => (
							<pre className="whitespace-pre-wrap break-all overflow-hidden">
								{children}
							</pre>
						),
						code: ({ children }) => (
							<code className="break-all">{children}</code>
						),
					}}
				>
					{content}
				</ReactMarkdown>
			</div>
		</EventNode>
	);
}
