import { useState } from "react";
import ReactMarkdown from "react-markdown";
import type { TimelineEvent } from "../../../types/timeline";
import { EVENT_TYPE_META } from "../../../types/timeline";
import { EventNode } from "../EventNode";

interface AgentResponseEventProps {
	event: TimelineEvent;
}

// モデル名を短縮表示
function formatModelName(model: string | undefined): string {
	if (!model) return "Agent";
	// claude-3-5-sonnet-20241022 -> Sonnet 3.5
	// claude-3-opus-20240229 -> Opus 3
	// claude-sonnet-4-20250514 -> Sonnet 4
	if (model.includes("opus")) {
		const match = model.match(/claude-(\d+)?-?opus|claude-opus-(\d+)/);
		const version = match?.[1] || match?.[2] || "";
		return `Opus${version ? ` ${version}` : ""}`;
	}
	if (model.includes("sonnet")) {
		const match = model.match(/claude-(\d+)-(\d+)?-?sonnet|claude-sonnet-(\d+)/);
		if (match?.[3]) return `Sonnet ${match[3]}`;
		if (match?.[1] && match?.[2]) return `Sonnet ${match[1]}.${match[2]}`;
		if (match?.[1]) return `Sonnet ${match[1]}`;
		return "Sonnet";
	}
	if (model.includes("haiku")) {
		return "Haiku";
	}
	// 短縮: claude-xxx -> Claude
	if (model.startsWith("claude")) {
		return model.replace("claude-", "").split("-")[0];
	}
	return model.slice(0, 15);
}

export function AgentResponseEvent({ event }: AgentResponseEventProps) {
	const [expanded, setExpanded] = useState(true);
	const meta = EVENT_TYPE_META.AGENT_RESPONSE;

	const content = event.content || "";
	const isLong = content.length > 300;
	const modelName = formatModelName(event.model);

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
			label={modelName}
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
