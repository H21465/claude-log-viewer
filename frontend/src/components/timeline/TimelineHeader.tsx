import type { EventType } from "../../types/timeline";
import { EVENT_TYPE_META } from "../../types/timeline";

interface TimelineHeaderProps {
	eventCounts: Record<EventType, number>;
	hiddenTypes: EventType[];
	onHiddenTypesChange: (hiddenTypes: EventType[]) => void;
	isLive?: boolean;
}

export function TimelineHeader({
	eventCounts,
	hiddenTypes,
	onHiddenTypesChange,
	isLive = false,
}: TimelineHeaderProps) {
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
					{isLive && (
						<span className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
							<span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
							Live
						</span>
					)}
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
