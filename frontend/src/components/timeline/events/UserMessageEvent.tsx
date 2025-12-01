import type { TimelineEvent } from "../../../types/timeline";
import { EVENT_TYPE_META } from "../../../types/timeline";
import { EventNode } from "../EventNode";

interface UserMessageEventProps {
	event: TimelineEvent;
}

export function UserMessageEvent({ event }: UserMessageEventProps) {
	const meta = EVENT_TYPE_META.USER_MESSAGE;

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
			label="User"
		>
			<div className="whitespace-pre-wrap break-words">
				{event.content || "(empty message)"}
			</div>
		</EventNode>
	);
}
