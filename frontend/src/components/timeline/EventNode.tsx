import type { ReactNode } from "react";
import { formatTime } from "../../utils/formatTime";

interface EventNodeProps {
	icon: string;
	color:
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
	timestamp: string;
	label?: string;
	onClick?: () => void;
	expandable?: boolean;
	expanded?: boolean;
	children: ReactNode;
}

const colorClasses: Record<
	string,
	{
		bg: string;
		border: string;
		dot: string;
		text: string;
	}
> = {
	blue: {
		bg: "bg-blue-50 dark:bg-blue-900/20",
		border: "border-blue-200 dark:border-blue-800",
		dot: "bg-blue-500",
		text: "text-blue-700 dark:text-blue-300",
	},
	green: {
		bg: "bg-green-50 dark:bg-green-900/20",
		border: "border-green-200 dark:border-green-800",
		dot: "bg-green-500",
		text: "text-green-700 dark:text-green-300",
	},
	red: {
		bg: "bg-red-50 dark:bg-red-900/20",
		border: "border-red-200 dark:border-red-800",
		dot: "bg-red-500",
		text: "text-red-700 dark:text-red-300",
	},
	purple: {
		bg: "bg-purple-50 dark:bg-purple-900/20",
		border: "border-purple-200 dark:border-purple-800",
		dot: "bg-purple-500",
		text: "text-purple-700 dark:text-purple-300",
	},
	orange: {
		bg: "bg-orange-50 dark:bg-orange-900/20",
		border: "border-orange-200 dark:border-orange-800",
		dot: "bg-orange-500",
		text: "text-orange-700 dark:text-orange-300",
	},
	slate: {
		bg: "bg-slate-50 dark:bg-slate-900/20",
		border: "border-slate-200 dark:border-slate-700",
		dot: "bg-slate-500",
		text: "text-slate-700 dark:text-slate-300",
	},
	gray: {
		bg: "bg-gray-50 dark:bg-gray-900/20",
		border: "border-gray-200 dark:border-gray-700",
		dot: "bg-gray-500",
		text: "text-gray-700 dark:text-gray-300",
	},
	indigo: {
		bg: "bg-indigo-50 dark:bg-indigo-900/20",
		border: "border-indigo-200 dark:border-indigo-800",
		dot: "bg-indigo-500",
		text: "text-indigo-700 dark:text-indigo-300",
	},
	teal: {
		bg: "bg-teal-50 dark:bg-teal-900/20",
		border: "border-teal-200 dark:border-teal-800",
		dot: "bg-teal-500",
		text: "text-teal-700 dark:text-teal-300",
	},
	violet: {
		bg: "bg-violet-50 dark:bg-violet-900/20",
		border: "border-violet-200 dark:border-violet-800",
		dot: "bg-violet-500",
		text: "text-violet-700 dark:text-violet-300",
	},
};

export function EventNode({
	icon,
	color,
	timestamp,
	label,
	onClick,
	expandable,
	expanded,
	children,
}: EventNodeProps) {
	const colors = colorClasses[color] || colorClasses.gray;

	return (
		<div className="relative flex items-start gap-3 mb-3 group">
			{/* タイムラインドット */}
			<div
				className={`absolute -left-[1.625rem] top-3 w-3 h-3 rounded-full ${colors.dot} ring-2 ring-white dark:ring-gray-900 z-10`}
			/>

			{/* タイムスタンプ */}
			<div className="text-xs text-gray-400 dark:text-gray-500 w-20 flex-shrink-0 pt-2.5 font-mono select-text">
				{formatTime(timestamp)}
			</div>

			{/* イベントカード */}
			<div
				className={`flex-1 min-w-0 rounded-lg border ${colors.bg} ${colors.border}`}
			>
				{/* ヘッダー - クリックで折りたたみ */}
				{expandable && onClick ? (
					<button
						type="button"
						onClick={onClick}
						className={`w-full flex items-center gap-2 px-3 py-2 ${colors.text} cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors rounded-t-lg`}
					>
						<span className="text-base flex-shrink-0">{icon}</span>
						{label && (
							<span className="text-xs font-medium uppercase tracking-wide opacity-75 truncate">
								{label}
							</span>
						)}
						<span className="ml-auto text-gray-400 flex-shrink-0">
							{expanded ? "▼" : "▶"}
						</span>
					</button>
				) : (
					<div className={`flex items-center gap-2 px-3 py-2 ${colors.text}`}>
						<span className="text-base flex-shrink-0">{icon}</span>
						{label && (
							<span className="text-xs font-medium uppercase tracking-wide opacity-75 truncate select-text">
								{label}
							</span>
						)}
					</div>
				)}

				{/* コンテンツ - テキスト選択可能 */}
				<div className="px-3 pb-3 text-sm text-gray-700 dark:text-gray-300 overflow-hidden break-words select-text">
					{children}
				</div>
			</div>
		</div>
	);
}
