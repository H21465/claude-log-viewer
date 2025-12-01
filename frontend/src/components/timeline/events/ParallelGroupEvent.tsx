import { useState } from "react";
import type { TimelineEvent } from "../../../types/timeline";
import { EVENT_TYPE_META } from "../../../types/timeline";
import { EventNode } from "../EventNode";
import { AgentSpawnEvent } from "./AgentSpawnEvent";

interface ParallelGroupEventProps {
	event: TimelineEvent;
}

export function ParallelGroupEvent({ event }: ParallelGroupEventProps) {
	const [expanded, setExpanded] = useState(true);
	const meta = EVENT_TYPE_META.PARALLEL_GROUP;

	const taskCount = event.parallelTasks?.length || 0;

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
		<div className="mb-3">
			<EventNode
				icon={meta.icon}
				color={meta.color as EventNodeColor}
				timestamp={event.timestamp}
				label={`Parallel (${taskCount})`}
				expandable={taskCount > 0}
				expanded={expanded}
				onClick={() => setExpanded(!expanded)}
			>
				<div className="text-sm">
					<span className="font-medium">{taskCount} tasks</span>
					<span className="text-gray-500 ml-2">running in parallel</span>
				</div>
			</EventNode>

			{/* 展開時: グリッド表示 */}
			{expanded && event.parallelTasks && (
				<div className="ml-8 mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
					{event.parallelTasks.map((task) => (
						<div
							key={task.id}
							className="border border-violet-200 dark:border-violet-800 rounded-lg bg-violet-50/50 dark:bg-violet-900/10 overflow-hidden"
						>
							<AgentSpawnEvent event={task} compact />
						</div>
					))}
				</div>
			)}
		</div>
	);
}
