import type { TimelineEvent as TimelineEventType } from "../../types/timeline";
import {
	AgentResponseEvent,
	AgentResultEvent,
	AgentSpawnEvent,
	ParallelGroupEvent,
	ThinkingEvent,
	ToolResultEvent,
	ToolUseEvent,
	UserMessageEvent,
	UserPermissionEvent,
} from "./events";

interface TimelineEventProps {
	event: TimelineEventType;
	nested?: boolean;
}

export function TimelineEvent({ event, nested: _nested = false }: TimelineEventProps) {
	switch (event.type) {
		case "USER_MESSAGE":
			return <UserMessageEvent event={event} />;
		case "USER_PERMISSION":
		case "USER_REJECTION":
			return <UserPermissionEvent event={event} />;
		case "THINKING":
			return <ThinkingEvent event={event} />;
		case "AGENT_RESPONSE":
			return <AgentResponseEvent event={event} />;
		case "TOOL_USE":
			return <ToolUseEvent event={event} />;
		case "TOOL_RESULT":
			return <ToolResultEvent event={event} />;
		case "AGENT_SPAWN":
			return <AgentSpawnEvent event={event} />;
		case "AGENT_RESULT":
			return <AgentResultEvent event={event} />;
		case "PARALLEL_GROUP":
			return <ParallelGroupEvent event={event} />;
		default:
			return null;
	}
}
