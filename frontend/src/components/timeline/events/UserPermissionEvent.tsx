import type { TimelineEvent } from "../../../types/timeline";
import { EVENT_TYPE_META } from "../../../types/timeline";
import { EventNode } from "../EventNode";

interface UserPermissionEventProps {
	event: TimelineEvent;
}

export function UserPermissionEvent({ event }: UserPermissionEventProps) {
	const isAllowed = event.type === "USER_PERMISSION";
	const meta = isAllowed
		? EVENT_TYPE_META.USER_PERMISSION
		: EVENT_TYPE_META.USER_REJECTION;

	return (
		<EventNode
			icon={meta.icon}
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
			label={isAllowed ? "Approved" : "Rejected"}
		>
			<div className="flex items-center gap-2">
				{event.permissionType && (
					<span className="px-2 py-0.5 rounded text-xs font-mono bg-white/50 dark:bg-black/20">
						{event.permissionType}
					</span>
				)}
				{event.content && (
					<span className="text-sm truncate opacity-75">{event.content}</span>
				)}
			</div>
		</EventNode>
	);
}
