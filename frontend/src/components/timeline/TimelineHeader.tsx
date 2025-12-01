import type { EventType } from "../../types/timeline";
import { EVENT_TYPE_META } from "../../types/timeline";

interface TimelineHeaderProps {
	eventCounts: Record<EventType, number>;
	filters: EventType[];
	onFilterChange: (filters: EventType[]) => void;
}

export function TimelineHeader({
	eventCounts,
	filters,
	onFilterChange,
}: TimelineHeaderProps) {
	const toggleFilter = (type: EventType) => {
		if (filters.includes(type)) {
			onFilterChange(filters.filter((f) => f !== type));
		} else {
			onFilterChange([...filters, type]);
		}
	};

	const totalEvents = Object.values(eventCounts).reduce((a, b) => a + b, 0);

	// 表示するイベントタイプ（0件のものは非表示）
	const visibleTypes = (Object.keys(eventCounts) as EventType[]).filter(
		(type) => eventCounts[type] > 0,
	);

	return (
		<div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3">
			<div className="flex items-center justify-between mb-2">
				<h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
					Timeline
				</h2>
				<span className="text-sm text-gray-500">
					{filters.length > 0
						? `Filtered: ${filters.map((f) => eventCounts[f]).reduce((a, b) => a + b, 0)} / ${totalEvents}`
						: `${totalEvents} events`}
				</span>
			</div>

			{/* フィルタチップ */}
			<div className="flex flex-wrap gap-1.5">
				{filters.length > 0 && (
					<button
						type="button"
						onClick={() => onFilterChange([])}
						className="px-2 py-1 text-xs rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
					>
						Clear filters
					</button>
				)}
				{visibleTypes.map((type) => {
					const meta = EVENT_TYPE_META[type];
					const isActive = filters.length === 0 || filters.includes(type);
					const count = eventCounts[type];

					return (
						<button
							key={type}
							type="button"
							onClick={() => toggleFilter(type)}
							className={`
                px-2 py-1 text-xs rounded-full flex items-center gap-1 transition-colors
                ${
									isActive
										? "bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800"
										: "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500"
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
