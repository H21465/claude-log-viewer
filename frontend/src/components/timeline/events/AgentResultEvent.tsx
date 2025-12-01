import { useState } from "react";
import type { TimelineEvent } from "../../../types/timeline";
import { EVENT_TYPE_META } from "../../../types/timeline";
import { useAppStore } from "../../../store";
import { EventNode } from "../EventNode";
import { SubagentTimeline } from "../SubagentTimeline";

interface AgentResultEventProps {
	event: TimelineEvent;
}

export function AgentResultEvent({ event }: AgentResultEventProps) {
	const [expanded, setExpanded] = useState(false);
	const [showSubagent, setShowSubagent] = useState(false);
	const meta = EVENT_TYPE_META.AGENT_RESULT;
	const { selectedProject } = useAppStore();

	const content = event.content || "";
	const isLong = content.length > 300;
	const preview = isLong ? `${content.slice(0, 300)}...` : content;

	// Detect success/failure
	const isError =
		content.toLowerCase().includes("error") ||
		content.toLowerCase().includes("failed");

	const hasSubagent = !!event.agentId && !!selectedProject?.path;

	return (
		<div className="mb-3">
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
				expandable={isLong || hasSubagent}
				expanded={expanded}
				onClick={() => setExpanded(!expanded)}
			>
				<div>
					{/* Show subagent button */}
					{hasSubagent && (
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								setShowSubagent(!showSubagent);
							}}
							className={`mb-2 px-2 py-1 text-xs rounded transition-colors ${
								showSubagent
									? "bg-indigo-500 text-white"
									: "bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800"
							}`}
						>
							{showSubagent ? "Hide" : "Show"} Subagent Timeline ({event.agentId?.slice(0, 8)})
						</button>
					)}
					<div className="whitespace-pre-wrap break-words text-sm">
						{expanded ? content : preview}
					</div>
				</div>
			</EventNode>

			{/* Subagent Timeline */}
			{showSubagent && event.agentId && selectedProject?.path && (
				<div className="ml-8 mt-2">
					<SubagentTimeline
						agentId={event.agentId}
						projectPath={selectedProject.path}
					/>
				</div>
			)}
		</div>
	);
}
