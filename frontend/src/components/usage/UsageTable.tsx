import React, { useState } from "react";
import type {
	DailyUsageDetailed,
	MonthlyUsageDetailed,
} from "../../types/usage";

type SortField =
	| "date"
	| "inputTokens"
	| "outputTokens"
	| "cacheCreationTokens"
	| "cacheReadTokens"
	| "totalTokens"
	| "totalCost";
type SortDirection = "asc" | "desc";

interface UsageTableProps {
	dailyData?: DailyUsageDetailed[];
	monthlyData?: MonthlyUsageDetailed[];
}

export function UsageTable({
	dailyData = [],
	monthlyData = [],
}: UsageTableProps) {
	const [viewMode, setViewMode] = useState<"daily" | "monthly">("daily");
	const [sortField, setSortField] = useState<SortField>("date");
	const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
	const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

	const currentData = viewMode === "daily" ? dailyData : monthlyData;

	// Sort data
	const sortedData = [...currentData].sort((a, b) => {
		let aVal: number | string;
		let bVal: number | string;

		if (sortField === "date") {
			aVal =
				viewMode === "daily"
					? (a as DailyUsageDetailed).date
					: (a as MonthlyUsageDetailed).month;
			bVal =
				viewMode === "daily"
					? (b as DailyUsageDetailed).date
					: (b as MonthlyUsageDetailed).month;
		} else {
			aVal = a[sortField];
			bVal = b[sortField];
		}

		if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
		if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
		return 0;
	});

	// Calculate totals
	const totals = currentData.reduce(
		(acc, item) => ({
			inputTokens: acc.inputTokens + item.inputTokens,
			outputTokens: acc.outputTokens + item.outputTokens,
			cacheCreationTokens: acc.cacheCreationTokens + item.cacheCreationTokens,
			cacheReadTokens: acc.cacheReadTokens + item.cacheReadTokens,
			totalTokens: acc.totalTokens + item.totalTokens,
			totalCost: acc.totalCost + item.totalCost,
		}),
		{
			inputTokens: 0,
			outputTokens: 0,
			cacheCreationTokens: 0,
			cacheReadTokens: 0,
			totalTokens: 0,
			totalCost: 0,
		},
	);

	const handleSort = (field: SortField) => {
		if (sortField === field) {
			setSortDirection(sortDirection === "asc" ? "desc" : "asc");
		} else {
			setSortField(field);
			setSortDirection("desc");
		}
	};

	const toggleRowExpansion = (period: string) => {
		const newExpanded = new Set(expandedRows);
		if (newExpanded.has(period)) {
			newExpanded.delete(period);
		} else {
			newExpanded.add(period);
		}
		setExpandedRows(newExpanded);
	};

	const formatNumber = (num: number | undefined | null): string => {
		if (num === undefined || num === null) {
			return "0";
		}
		return num.toLocaleString();
	};

	const formatCurrency = (num: number | undefined | null): string => {
		if (num === undefined || num === null) {
			return "$0.0000";
		}
		return `$${num.toFixed(4)}`;
	};

	const SortIcon = ({ field }: { field: SortField }) => {
		if (sortField !== field) {
			return <span className="text-gray-400">↕</span>;
		}
		return (
			<span className="text-blue-500">
				{sortDirection === "asc" ? "↑" : "↓"}
			</span>
		);
	};

	return (
		<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
			{/* Header with Tab Switcher */}
			<div className="border-b border-gray-200 dark:border-gray-700 p-4">
				<div className="flex items-center justify-between">
					<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
						Usage Details
					</h3>
					<div className="flex gap-2">
						<button
							type="button"
							onClick={() => setViewMode("daily")}
							className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
								viewMode === "daily"
									? "bg-blue-500 text-white"
									: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
							}`}
						>
							Daily
						</button>
						<button
							type="button"
							onClick={() => setViewMode("monthly")}
							className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
								viewMode === "monthly"
									? "bg-blue-500 text-white"
									: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
							}`}
						>
							Monthly
						</button>
					</div>
				</div>
			</div>

			{/* Table */}
			<div className="overflow-x-auto">
				<table className="w-full">
					<thead className="bg-gray-50 dark:bg-gray-700">
						<tr>
							<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-8">
								{/* Expand icon column */}
							</th>
							<th
								className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
								onClick={() => handleSort("date")}
							>
								<div className="flex items-center gap-1">
									{viewMode === "daily" ? "Date" : "Month"}
									<SortIcon field="date" />
								</div>
							</th>
							<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
								Models
							</th>
							<th
								className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
								onClick={() => handleSort("inputTokens")}
							>
								<div className="flex items-center justify-end gap-1">
									Input
									<SortIcon field="inputTokens" />
								</div>
							</th>
							<th
								className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
								onClick={() => handleSort("outputTokens")}
							>
								<div className="flex items-center justify-end gap-1">
									Output
									<SortIcon field="outputTokens" />
								</div>
							</th>
							<th
								className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
								onClick={() => handleSort("cacheCreationTokens")}
							>
								<div className="flex items-center justify-end gap-1">
									Cache Create
									<SortIcon field="cacheCreationTokens" />
								</div>
							</th>
							<th
								className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
								onClick={() => handleSort("cacheReadTokens")}
							>
								<div className="flex items-center justify-end gap-1">
									Cache Read
									<SortIcon field="cacheReadTokens" />
								</div>
							</th>
							<th
								className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
								onClick={() => handleSort("totalTokens")}
							>
								<div className="flex items-center justify-end gap-1">
									Total
									<SortIcon field="totalTokens" />
								</div>
							</th>
							<th
								className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
								onClick={() => handleSort("totalCost")}
							>
								<div className="flex items-center justify-end gap-1">
									Cost
									<SortIcon field="totalCost" />
								</div>
							</th>
						</tr>
					</thead>
					<tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
						{sortedData.length === 0 ? (
							<tr>
								<td
									colSpan={9}
									className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
								>
									No data available for the selected period
								</td>
							</tr>
						) : (
							sortedData.map((item) => {
								const period =
									viewMode === "daily"
										? (item as DailyUsageDetailed).date
										: (item as MonthlyUsageDetailed).month;
								const isExpanded = expandedRows.has(period);
								const hasModelBreakdown =
									item.modelBreakdown &&
									Object.keys(item.modelBreakdown).length > 0;

								return (
									<React.Fragment key={period}>
										<tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
											<td className="px-4 py-3 text-sm">
												{hasModelBreakdown && (
													<button
														type="button"
														onClick={() => toggleRowExpansion(period)}
														className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
													>
														{isExpanded ? "▼" : "▶"}
													</button>
												)}
											</td>
											<td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
												{period}
											</td>
											<td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
												{item.modelsUsed.length === 1 ? (
													item.modelsUsed[0]
												) : (
													<span className="text-xs">
														{item.modelsUsed.length} models
													</span>
												)}
											</td>
											<td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">
												{formatNumber(item.inputTokens)}
											</td>
											<td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">
												{formatNumber(item.outputTokens)}
											</td>
											<td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">
												{formatNumber(item.cacheCreationTokens)}
											</td>
											<td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">
												{formatNumber(item.cacheReadTokens)}
											</td>
											<td className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-gray-100">
												{formatNumber(item.totalTokens)}
											</td>
											<td className="px-4 py-3 text-sm text-right font-medium text-green-600 dark:text-green-400">
												{formatCurrency(item.totalCost)}
											</td>
										</tr>
										{isExpanded && hasModelBreakdown && (
											<tr
												key={`${period}-breakdown`}
												className="bg-gray-50 dark:bg-gray-750"
											>
												<td colSpan={9} className="px-4 py-2">
													<div className="ml-8 space-y-1">
														<div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
															Model Breakdown:
														</div>
														{item.modelBreakdown &&
															Object.entries(item.modelBreakdown).map(
																([model, breakdown]) => (
																	<div
																		key={model}
																		className="grid grid-cols-9 gap-4 text-xs text-gray-600 dark:text-gray-400 py-1"
																	>
																		<div className="col-span-2 pl-4">
																			• {model}
																		</div>
																		<div className="text-right">
																			{formatNumber(breakdown.inputTokens)}
																		</div>
																		<div className="text-right">
																			{formatNumber(breakdown.outputTokens)}
																		</div>
																		<div className="text-right">
																			{formatNumber(
																				breakdown.cacheCreationTokens,
																			)}
																		</div>
																		<div className="text-right">
																			{formatNumber(breakdown.cacheReadTokens)}
																		</div>
																		<div className="text-right font-medium">
																			{formatNumber(
																				breakdown.inputTokens +
																					breakdown.outputTokens +
																					breakdown.cacheCreationTokens +
																					breakdown.cacheReadTokens,
																			)}
																		</div>
																		<div className="text-right font-medium text-green-600 dark:text-green-400">
																			{formatCurrency(breakdown.cost)}
																		</div>
																	</div>
																),
															)}
													</div>
												</td>
											</tr>
										)}
									</React.Fragment>
								);
							})
						)}
						{/* Totals Row */}
						{sortedData.length > 0 && (
							<tr className="bg-blue-50 dark:bg-blue-900/20 font-semibold">
								<td className="px-4 py-3" />
								<td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
									Total
								</td>
								<td className="px-4 py-3" />
								<td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-gray-100">
									{formatNumber(totals.inputTokens)}
								</td>
								<td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-gray-100">
									{formatNumber(totals.outputTokens)}
								</td>
								<td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-gray-100">
									{formatNumber(totals.cacheCreationTokens)}
								</td>
								<td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-gray-100">
									{formatNumber(totals.cacheReadTokens)}
								</td>
								<td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-gray-100">
									{formatNumber(totals.totalTokens)}
								</td>
								<td className="px-4 py-3 text-sm text-right text-green-600 dark:text-green-400">
									{formatCurrency(totals.totalCost)}
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}
