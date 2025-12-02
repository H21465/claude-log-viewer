interface TokenProgressBarProps {
	current: number;
	limit: number;
	plan?: "Max" | "Pro" | "Free";
	resetTime?: Date;
	minutesUntilReset?: number;
	showDetails?: boolean;
}

export function TokenProgressBar({
	current,
	limit,
	plan = "Pro",
	resetTime,
	minutesUntilReset,
	showDetails = true,
}: TokenProgressBarProps) {
	const percentage = limit > 0 ? Math.min((current / limit) * 100, 100) : 0;
	const remaining = Math.max(limit - current, 0);
	const isOverLimit = current > limit;

	// Color thresholds matching Python implementation
	const getColorClasses = () => {
		if (percentage >= 90) {
			return {
				bar: "bg-red-500",
				barDark: "dark:bg-red-600",
				text: "text-red-700",
				textDark: "dark:text-red-400",
				icon: "🔴",
			};
		}
		if (percentage >= 50) {
			return {
				bar: "bg-yellow-500",
				barDark: "dark:bg-yellow-600",
				text: "text-yellow-700",
				textDark: "dark:text-yellow-400",
				icon: "🟡",
			};
		}
		return {
			bar: "bg-green-500",
			barDark: "dark:bg-green-600",
			text: "text-green-700",
			textDark: "dark:text-green-400",
			icon: "🟢",
		};
	};

	const colors = getColorClasses();

	const formatNumber = (num: number) => {
		if (num >= 1_000_000) {
			return `${(num / 1_000_000).toFixed(1)}M`;
		}
		if (num >= 1_000) {
			return `${(num / 1_000).toFixed(1)}K`;
		}
		return num.toString();
	};

	const formatResetTime = (minutes?: number, date?: Date) => {
		// Use minutesUntilReset if provided (more accurate from API)
		if (minutes !== undefined) {
			if (minutes <= 0) {
				return "Limit reset";
			}
			const hours = Math.floor(minutes / 60);
			const mins = minutes % 60;
			if (hours > 0) {
				return `Resets in ${hours}h ${mins}m`;
			}
			return `Resets in ${mins}m`;
		}

		// Fallback to calculating from date
		if (date) {
			const now = new Date();
			const diff = date.getTime() - now.getTime();

			if (diff < 0) {
				return "Limit reset";
			}

			const hours = Math.floor(diff / (1000 * 60 * 60));
			const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

			if (hours > 0) {
				return `Resets in ${hours}h ${mins}m`;
			}
			return `Resets in ${mins}m`;
		}

		return "No active window";
	};

	const formatResetDateTime = (date?: Date) => {
		if (!date) return "";
		return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
	};

	return (
		<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
			{/* Header */}
			<div className="flex items-center justify-between mb-3">
				<div className="flex items-center gap-2">
					<span className="text-xl">{colors.icon}</span>
					<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
						Token Usage
					</h3>
					{plan && (
						<span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
							{plan}
						</span>
					)}
				</div>
				<div
					className={`text-sm font-medium ${colors.text} ${colors.textDark}`}
				>
					{percentage.toFixed(1)}%
				</div>
			</div>

			{/* Progress Bar */}
			<div className="relative">
				<div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
					<div
						className={`h-full ${colors.bar} ${colors.barDark} transition-all duration-500 ease-out`}
						style={{ width: `${percentage}%` }}
					>
						<div className="h-full w-full animate-pulse-slow opacity-50 bg-white" />
					</div>
				</div>
			</div>

			{/* Details */}
			{showDetails && (
				<div className="mt-3 space-y-2">
					<div className="flex items-center justify-between text-sm">
						<span className="text-gray-600 dark:text-gray-400">Used:</span>
						<span className="font-medium text-gray-900 dark:text-gray-100">
							{formatNumber(current)} tokens
						</span>
					</div>
					<div className="flex items-center justify-between text-sm">
						<span className="text-gray-600 dark:text-gray-400">Remaining:</span>
						<span
							className={`font-medium ${isOverLimit ? `${colors.text} ${colors.textDark}` : "text-gray-900 dark:text-gray-100"}`}
						>
							{isOverLimit ? "0" : formatNumber(remaining)} tokens
						</span>
					</div>
					<div className="flex items-center justify-between text-sm">
						<span className="text-gray-600 dark:text-gray-400">Limit:</span>
						<span className="font-medium text-gray-900 dark:text-gray-100">
							{formatNumber(limit)} tokens
						</span>
					</div>

					{(resetTime || minutesUntilReset !== undefined) && (
						<div className="flex items-center justify-between text-sm pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
							<span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
								<span>⏰</span>
								<span>5-hour window</span>
							</span>
							<span className="font-medium text-gray-900 dark:text-gray-100">
								{formatResetTime(minutesUntilReset, resetTime)}
								{resetTime && (
									<span className="text-gray-500 dark:text-gray-400 ml-2">
										({formatResetDateTime(resetTime)})
									</span>
								)}
							</span>
						</div>
					)}

					{isOverLimit && (
						<div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs">
							<span className={`${colors.text} ${colors.textDark}`}>
								⚠️ Token limit exceeded. Additional usage may be rate limited.
							</span>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
