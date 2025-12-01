import { useMemo } from "react";
import { useSubagentMessages } from "../../hooks/useApi";
import type { Message } from "../../types";
import { convertToTimelineEvents } from "../../utils/eventConverter";
import { TimelineEvent } from "./TimelineEvent";

interface SubagentTimelineProps {
	agentId: string;
	projectPath: string;
}

export function SubagentTimeline({ agentId, projectPath }: SubagentTimelineProps) {
	const { data: subagentData, isLoading, error } = useSubagentMessages(agentId, projectPath);

	// サブエージェントのメッセージをタイムラインイベントに変換
	const events = useMemo(() => {
		if (!subagentData?.messages) return [];
		// SubagentMessageをMessageに変換（idを追加）
		const messages: Message[] = subagentData.messages.map((msg, idx) => ({
			id: idx,
			uuid: msg.uuid,
			parent_uuid: msg.parent_uuid,
			conversation_id: 0,
			role: msg.role,
			content: msg.content,
			content_blocks: msg.content_blocks,
			model: msg.model,
			timestamp: msg.timestamp,
			has_tool_use: msg.has_tool_use,
			has_thinking: msg.has_thinking,
		}));
		return convertToTimelineEvents(messages);
	}, [subagentData]);

	if (isLoading) {
		return (
			<div className="py-4 text-center text-sm text-gray-500">
				<div className="animate-pulse">Loading subagent messages...</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="py-4 text-center text-sm text-red-500">
				Failed to load subagent messages
			</div>
		);
	}

	if (events.length === 0) {
		return (
			<div className="py-4 text-center text-sm text-gray-500">
				No messages in this subagent
			</div>
		);
	}

	return (
		<div className="relative pl-6 border-l-2 border-indigo-300 dark:border-indigo-700">
			{/* Stats */}
			{subagentData?.stats && (
				<div className="mb-3 flex items-center gap-4 text-xs text-gray-500">
					<span>{subagentData.stats.message_count} messages</span>
					{subagentData.stats.total_tokens && (
						<span>{subagentData.stats.total_tokens.toLocaleString()} tokens</span>
					)}
					{subagentData.stats.total_duration_ms && (
						<span>{(subagentData.stats.total_duration_ms / 1000).toFixed(1)}s</span>
					)}
				</div>
			)}

			{/* Timeline */}
			<div className="relative">
				<div className="absolute left-2 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
				{events.map((event) => (
					<TimelineEvent key={event.id} event={event} nested />
				))}
			</div>
		</div>
	);
}
