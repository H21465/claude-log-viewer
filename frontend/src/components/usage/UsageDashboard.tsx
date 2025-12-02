import { useState } from "react";
import {
	transformDailyUsageResponse,
	transformMonthlyUsageResponse,
	useModelUsage,
	useResetTime,
	useUsageDaily,
	useUsageMonthly,
	useUsageSummary,
} from "../../api/usage";
import { useWebSocket } from "../../hooks/useWebSocket";
import type { PlanType } from "../../types/usage";
import { TokenProgressBar } from "./TokenProgressBar";
import { UsageTable } from "./UsageTable";

// Default token limits by plan
const TOKEN_LIMITS: Record<PlanType, number> = {
	Max: 5_000_000,
	Pro: 1_000_000,
	Free: 100_000,
};

type PeriodType = "1d" | "1w" | "all";

export function UsageDashboard() {
	// All hooks must be called at the top, before any conditional returns
	const {
		data: summaryData,
		isLoading: summaryLoading,
		error: summaryError,
	} = useUsageSummary();
	const {
		data: dailyData,
		isLoading: dailyLoading,
		error: dailyError,
	} = useUsageDaily();
	const {
		data: monthlyData,
		isLoading: monthlyLoading,
		error: monthlyError,
	} = useUsageMonthly();
	const {
		data: modelData,
		isLoading: modelLoading,
		error: modelError,
	} = useModelUsage();

	// Reset time data
	const { data: resetTimeData } = useResetTime();

	// WebSocket for real-time usage updates
	const { isConnected } = useWebSocket({
		projectId: "all",
	});

	// Fixed plan (Max)
	const plan: PlanType = "Max";

	// Period filter state
	const [period, setPeriod] = useState<PeriodType>("1d");

	const isLoading =
		summaryLoading || dailyLoading || monthlyLoading || modelLoading;
	const hasError = summaryError || dailyError || monthlyError || modelError;

	// Transform API responses to frontend types
	const transformedDaily = dailyData
		? transformDailyUsageResponse(dailyData)
		: [];
	const transformedMonthly = monthlyData
		? transformMonthlyUsageResponse(monthlyData)
		: [];

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-900">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4" />
					<p className="text-gray-600 dark:text-gray-400">
						Loading usage data...
					</p>
				</div>
			</div>
		);
	}

	if (hasError) {
		return (
			<div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-900">
				<div className="text-center">
					<p className="text-red-600 dark:text-red-400 mb-2">
						Failed to load usage data
					</p>
					<p className="text-sm text-gray-500 dark:text-gray-400">
						Please check if the backend server is running
					</p>
				</div>
			</div>
		);
	}

	// Get date range for filtering
	const today = new Date().toISOString().split("T")[0];
	const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
		.toISOString()
		.split("T")[0];

	// Get filtered daily data based on period
	const getFilteredDailyData = () => {
		if (period === "1d") {
			return transformedDaily.filter((d) => d.date === today);
		}
		if (period === "1w") {
			return transformedDaily.filter((d) => d.date >= oneWeekAgo);
		}
		return transformedDaily;
	};

	const filteredDailyData = getFilteredDailyData();

	// Calculate period summary from filtered daily data
	const periodSummary = {
		totalTokens: filteredDailyData.reduce(
			(sum, d) => sum + (d.totalTokens ?? 0),
			0,
		),
		totalCost: filteredDailyData.reduce(
			(sum, d) => sum + (d.totalCost ?? 0),
			0,
		),
		modelsUsed: [
			...new Set(filteredDailyData.flatMap((d) => d.modelsUsed ?? [])),
		],
	};

	// 5-hour window token limit (Max plan)
	const windowTokenLimit = TOKEN_LIMITS[plan];
	// Current window tokens from API (for progress bar)
	const windowTokens = resetTimeData?.window_tokens ?? 0;

	// Get period label for display
	const getPeriodLabel = () => {
		if (period === "1d") return "Today";
		if (period === "1w") return "This Week";
		return "All Time";
	};

	return (
		<div className="flex flex-col h-full bg-gray-100 dark:bg-gray-900 overflow-y-auto">
			<div className="p-4 space-y-6">
				{/* Header */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
							Usage Dashboard
						</h2>
						{/* Real-time connection indicator */}
						<span
							className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
								isConnected
									? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
									: "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
							}`}
						>
							<span
								className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-gray-400"}`}
							/>
							{isConnected ? "Live" : "Offline"}
						</span>
					</div>
					<div className="flex items-center gap-4">
						{/* Period Selector */}
						<div className="flex items-center gap-2">
							<span className="text-sm text-gray-500 dark:text-gray-400">
								Period:
							</span>
							<div className="flex gap-1">
								{(
									[
										{ key: "1d", label: "1 Day" },
										{ key: "1w", label: "1 Week" },
										{ key: "all", label: "All" },
									] as const
								).map(({ key, label }) => (
									<button
										key={key}
										type="button"
										onClick={() => setPeriod(key)}
										className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
											period === key
												? "bg-blue-500 text-white"
												: "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
										}`}
									>
										{label}
									</button>
								))}
							</div>
						</div>
						{/* Plan Display */}
						<div className="flex items-center gap-2">
							<span className="text-sm text-gray-500 dark:text-gray-400">
								Plan:
							</span>
							<span className="px-3 py-1 text-xs font-medium rounded-lg bg-orange-500 text-white">
								{plan}
							</span>
						</div>
						<div className="text-sm text-gray-500 dark:text-gray-400">
							{period === "1d" && today}
							{period === "1w" && `${oneWeekAgo} - ${today}`}
							{period === "all" &&
								summaryData?.date_range &&
								`${new Date(summaryData.date_range.start).toLocaleDateString()} - ${new Date(summaryData.date_range.end).toLocaleDateString()}`}
						</div>
					</div>
				</div>

				{/* Summary Cards */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
					<SummaryCard
						title={`${getPeriodLabel()} Tokens`}
						value={periodSummary.totalTokens.toLocaleString()}
						icon="📊"
						color="blue"
					/>
					<SummaryCard
						title={`${getPeriodLabel()} Cost`}
						value={`$${periodSummary.totalCost.toFixed(2)}`}
						icon="💰"
						color="green"
					/>
					<SummaryCard
						title="Days"
						value={filteredDailyData.length.toString()}
						icon="📅"
						color="purple"
					/>
					<SummaryCard
						title="Models Used"
						value={periodSummary.modelsUsed.length.toString()}
						icon="🤖"
						color="orange"
					/>
				</div>

				{/* Token Progress Bar (5-hour window) */}
				<TokenProgressBar
					current={windowTokens}
					limit={windowTokenLimit}
					plan={plan}
					showDetails={true}
					resetTime={
						resetTimeData?.reset_time
							? new Date(resetTimeData.reset_time)
							: undefined
					}
					minutesUntilReset={resetTimeData?.minutes_until_reset ?? undefined}
				/>

				{/* Model Usage Breakdown */}
				{modelData && modelData.length > 0 && (
					<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
						<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
							Usage by Model
						</h3>
						<div className="space-y-3">
							{modelData.map((model) => (
								<div
									key={model.model}
									className="flex items-center justify-between"
								>
									<div className="flex-1">
										<div className="flex items-center justify-between mb-1">
											<span className="text-sm font-medium text-gray-700 dark:text-gray-300">
												{model.model}
											</span>
											<span className="text-sm text-gray-500 dark:text-gray-400">
												{model.usage_count} calls · $
												{model.total_cost.toFixed(2)}
											</span>
										</div>
										<div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
											<div
												className="h-full bg-blue-500 dark:bg-blue-600 transition-all duration-300"
												style={{
													width: `${
														summaryData?.total_cost
															? (model.total_cost / summaryData.total_cost) *
																100
															: 0
													}%`,
												}}
											/>
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Usage Tables */}
				<UsageTable
					dailyData={transformedDaily}
					monthlyData={transformedMonthly}
				/>

				{/* Token Breakdown Details */}
				{summaryData && (
					<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
						<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
							Token Breakdown
						</h3>
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
							<TokenBreakdownItem
								label="Input Tokens"
								value={summaryData.total_input_tokens}
								color="blue"
							/>
							<TokenBreakdownItem
								label="Output Tokens"
								value={summaryData.total_output_tokens}
								color="green"
							/>
							<TokenBreakdownItem
								label="Cache Creation"
								value={summaryData.total_cache_creation_tokens}
								color="yellow"
							/>
							<TokenBreakdownItem
								label="Cache Read"
								value={summaryData.total_cache_read_tokens}
								color="purple"
							/>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

// Helper Components
interface SummaryCardProps {
	title: string;
	value: string;
	icon: string;
	color: "blue" | "green" | "purple" | "orange";
}

function SummaryCard({ title, value, icon, color }: SummaryCardProps) {
	const colorClasses = {
		blue: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
		green:
			"bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
		purple:
			"bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800",
		orange:
			"bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800",
	};

	return (
		<div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
			<div className="flex items-center gap-2 mb-2">
				<span className="text-xl">{icon}</span>
				<span className="text-sm text-gray-600 dark:text-gray-400">
					{title}
				</span>
			</div>
			<div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
				{value}
			</div>
		</div>
	);
}

interface TokenBreakdownItemProps {
	label: string;
	value: number;
	color: "blue" | "green" | "yellow" | "purple";
}

function TokenBreakdownItem({ label, value, color }: TokenBreakdownItemProps) {
	const colorClasses = {
		blue: "text-blue-600 dark:text-blue-400",
		green: "text-green-600 dark:text-green-400",
		yellow: "text-yellow-600 dark:text-yellow-400",
		purple: "text-purple-600 dark:text-purple-400",
	};

	return (
		<div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
			<div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
				{label}
			</div>
			<div className={`text-lg font-semibold ${colorClasses[color]}`}>
				{value.toLocaleString()}
			</div>
		</div>
	);
}
