import { useEffect, useMemo, useRef, useState } from "react";
import { useMessages } from "../../hooks/useApi";
import type { EventType } from "../../types/timeline";
import {
	convertToTimelineEvents,
	countEventTypes,
} from "../../utils/eventConverter";
import { TimelineEvent } from "./TimelineEvent";
import { TimelineHeader } from "./TimelineHeader";

interface EventTimelineProps {
	conversationId: number | null;
}

export function EventTimeline({ conversationId }: EventTimelineProps) {
	const { data: messages, isLoading, error } = useMessages(conversationId);
	const [filters, setFilters] = useState<EventType[]>([]);
	const scrollRef = useRef<HTMLDivElement>(null);

	// メッセージをタイムラインイベントに変換
	const events = useMemo(() => {
		if (!messages) return [];
		return convertToTimelineEvents(messages);
	}, [messages]);

	// イベントタイプ別のカウント
	const eventCounts = useMemo(() => countEventTypes(events), [events]);

	// フィルタリング
	const filteredEvents = useMemo(() => {
		if (filters.length === 0) return events;
		return events.filter((e) => filters.includes(e.type));
	}, [events, filters]);

	// 新しいイベントが追加されたら自動スクロール
	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, []);

	if (!conversationId) {
		return (
			<div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
				<div className="text-center">
					<div className="text-4xl mb-2">📋</div>
					<div>Select a conversation to view timeline</div>
				</div>
			</div>
		);
	}

	if (isLoading) {
		return (
			<div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
				<div className="animate-pulse">Loading timeline...</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="h-full flex items-center justify-center text-red-500">
				<div className="text-center">
					<div className="text-4xl mb-2">❌</div>
					<div>Failed to load timeline</div>
				</div>
			</div>
		);
	}

	if (events.length === 0) {
		return (
			<div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
				<div className="text-center">
					<div className="text-4xl mb-2">📭</div>
					<div>No events in this conversation</div>
				</div>
			</div>
		);
	}

	return (
		<div className="h-full flex flex-col bg-white dark:bg-gray-900">
			{/* ヘッダー（フィルタ） */}
			<TimelineHeader
				eventCounts={eventCounts}
				filters={filters}
				onFilterChange={setFilters}
			/>

			{/* タイムラインコンテンツ */}
			<div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
				{/* タイムライン縦線 */}
				<div className="relative pl-8">
					<div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />

					{/* イベント一覧 */}
					{filteredEvents.map((event) => (
						<TimelineEvent key={event.id} event={event} />
					))}

					{/* 終端マーカー */}
					<div className="relative flex items-center gap-3 mt-4">
						<div className="absolute -left-[1.625rem] w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600 ring-2 ring-white dark:ring-gray-900" />
						<div className="text-xs text-gray-400 w-20" />
						<div className="text-sm text-gray-400 dark:text-gray-500 italic">
							End of timeline
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
