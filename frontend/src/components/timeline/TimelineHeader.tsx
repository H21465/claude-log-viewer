import { useMemo } from "react";
import { useAppStore } from "../../store";
import type { EventType } from "../../types/timeline";
import { EVENT_TYPE_META } from "../../types/timeline";

interface TimelineHeaderProps {
	eventCounts: Record<EventType, number>;
	hiddenTypes: EventType[];
	onHiddenTypesChange: (hiddenTypes: EventType[]) => void;
	lastEventTimestamp?: string;
}

// セッションがアクティブかどうか（5分以内に更新があったか）
function isSessionActive(timestamp: string | undefined): boolean {
	if (!timestamp) return false;
	const lastUpdate = new Date(timestamp).getTime();
	const now = Date.now();
	const fiveMinutes = 5 * 60 * 1000;
	return now - lastUpdate < fiveMinutes;
}

export function TimelineHeader({
	eventCounts,
	hiddenTypes,
	onHiddenTypesChange,
	lastEventTimestamp,
}: TimelineHeaderProps) {
	const { expandThinkingByDefault, toggleExpandThinkingByDefault } =
		useAppStore();
	const isActive = useMemo(
		() => isSessionActive(lastEventTimestamp),
		[lastEventTimestamp],
	);
	const toggleType = (type: EventType) => {
		if (hiddenTypes.includes(type)) {
			// 現在非表示 → 表示に
			onHiddenTypesChange(hiddenTypes.filter((t) => t !== type));
		} else {
			// 現在表示 → 非表示に
			onHiddenTypesChange([...hiddenTypes, type]);
		}
	};

	const totalEvents = Object.values(eventCounts).reduce((a, b) => a + b, 0);

	// 表示するイベントタイプ（0件のものは非表示）
	const visibleTypes = (Object.keys(eventCounts) as EventType[]).filter(
		(type) => eventCounts[type] > 0,
	);

	// 表示中のイベント数を計算
	const visibleEventCount = visibleTypes
		.filter((type) => !hiddenTypes.includes(type))
		.reduce((sum, type) => sum + eventCounts[type], 0);

	return (
		<div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3">
			<div className="flex items-center justify-between mb-2">
				<div className="flex items-center gap-2">
					<h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
						Timeline
					</h2>
					{isActive && (
						<span className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
							<span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
							Active
						</span>
					)}
					<button
						type="button"
						onClick={toggleExpandThinkingByDefault}
						className={`flex items-center gap-1 px-2 py-0.5 text-xs rounded-full transition-colors ${
							expandThinkingByDefault
								? "bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300"
								: "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
						}`}
						title={
							expandThinkingByDefault
								? "Thinking: 展開表示"
								: "Thinking: 折りたたみ表示"
						}
					>
						💭
						{expandThinkingByDefault ? "展開" : "折りたたみ"}
					</button>
				</div>
				<span className="text-sm text-gray-500">
					{hiddenTypes.length > 0
						? `${visibleEventCount} / ${totalEvents} events`
						: `${totalEvents} events`}
				</span>
			</div>

			{/* フィルタチップ */}
			<div className="flex flex-wrap gap-1.5">
				{hiddenTypes.length > 0 && (
					<button
						type="button"
						onClick={() => onHiddenTypesChange([])}
						className="px-2 py-1 text-xs rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
					>
						Show all
					</button>
				)}
				{hiddenTypes.length < visibleTypes.length && (
					<button
						type="button"
						onClick={() => onHiddenTypesChange([...visibleTypes])}
						className="px-2 py-1 text-xs rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
					>
						Hide all
					</button>
				)}
				{visibleTypes.map((type) => {
					const meta = EVENT_TYPE_META[type];
					const isVisible = !hiddenTypes.includes(type);
					const count = eventCounts[type];

					return (
						<button
							key={type}
							type="button"
							onClick={() => toggleType(type)}
							className={`
                px-2 py-1 text-xs rounded-full flex items-center gap-1 transition-colors
                ${
									isVisible
										? "bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800"
										: "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 line-through"
								}
              `}
						>
							<span>{meta.icon}</span>
							<span>{meta.label}</span>
							<span className="opacity-60">({count})</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}
