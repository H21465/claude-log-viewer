import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMessages } from "../../hooks/useApi";
import { useWebSocket } from "../../hooks/useWebSocket";
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
	const [hiddenTypes, setHiddenTypes] = useState<EventType[]>([]);
	const [showScrollButton, setShowScrollButton] = useState(false);
	const scrollRef = useRef<HTMLDivElement>(null);
	const prevEventCountRef = useRef(0);

	// WebSocket for real-time updates
	const { isConnected } = useWebSocket({
		projectId: "all",
	});

	// メッセージをタイムラインイベントに変換
	const events = useMemo(() => {
		if (!messages) return [];
		return convertToTimelineEvents(messages);
	}, [messages]);

	// イベントタイプ別のカウント
	const eventCounts = useMemo(() => countEventTypes(events), [events]);

	// フィルタリング（hiddenTypesに含まれるタイプを非表示）
	const filteredEvents = useMemo(() => {
		if (hiddenTypes.length === 0) return events;
		return events.filter((e) => !hiddenTypes.includes(e.type));
	}, [events, hiddenTypes]);

	// 最新メッセージへスクロール
	const scrollToLatest = useCallback(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTo({
				top: scrollRef.current.scrollHeight,
				behavior: "smooth",
			});
		}
	}, []);

	// スクロール位置を監視してボタン表示を制御
	const handleScroll = useCallback(() => {
		if (scrollRef.current) {
			const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
			// 下から100px以上離れていたらボタンを表示
			const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
			setShowScrollButton(!isNearBottom);
		}
	}, []);

	// 新しいイベントが追加されたら自動スクロール（下部にいる場合のみ）
	useEffect(() => {
		if (scrollRef.current && events.length > prevEventCountRef.current) {
			const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
			const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
			// 下部にいる場合のみ自動スクロール
			if (isNearBottom) {
				scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
			}
		}
		prevEventCountRef.current = events.length;
	}, [events.length]);

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
		<div className="h-full flex flex-col bg-white dark:bg-gray-900 relative">
			{/* ヘッダー（フィルタ） */}
			<TimelineHeader
				eventCounts={eventCounts}
				hiddenTypes={hiddenTypes}
				onHiddenTypesChange={setHiddenTypes}
				isLive={isConnected}
			/>

			{/* タイムラインコンテンツ */}
			<div
				ref={scrollRef}
				onScroll={handleScroll}
				className="flex-1 overflow-y-auto px-4 py-4"
			>
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

			{/* 最新へジャンプボタン */}
			{showScrollButton && (
				<button
					type="button"
					onClick={scrollToLatest}
					className="absolute bottom-6 right-6 flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg transition-all hover:scale-105"
				>
					<svg
						className="w-4 h-4"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M19 14l-7 7m0 0l-7-7m7 7V3"
						/>
					</svg>
					<span className="text-sm font-medium">Latest</span>
				</button>
			)}
		</div>
	);
}
