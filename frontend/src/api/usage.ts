import { useQuery } from "@tanstack/react-query";
import type {
	DailyUsageDetailed,
	MonthlyUsageDetailed,
	SessionUsage,
	UsageFilters,
} from "../types/usage";
import { apiClient } from "./client";

// API Response Types (matching backend responses)
interface UsageSummaryResponse {
	total_input_tokens: number;
	total_output_tokens: number;
	total_cache_creation_tokens: number;
	total_cache_read_tokens: number;
	total_tokens: number;
	total_cost: number;
	entries_count: number;
	date_range: {
		start: string;
		end: string;
	} | null;
	models_used: string[];
}

interface ModelUsageResponse {
	model: string;
	input_tokens: number;
	output_tokens: number;
	cache_creation_tokens: number;
	cache_read_tokens: number;
	total_cost: number;
	usage_count: number;
}

interface SessionBlockResponse {
	session_id: string;
	started_at: string;
	ended_at: string;
	duration_minutes: number;
	model: string | null;
	input_tokens: number;
	output_tokens: number;
	cache_creation_tokens: number;
	cache_read_tokens: number;
	cost_usd: number;
	message_count: number;
}

interface DailyUsageResponse {
	date: string;
	input_tokens: number;
	output_tokens: number;
	cache_creation_tokens: number;
	cache_read_tokens: number;
	total_tokens: number;
	total_cost: number;
	models_used: string[];
	model_breakdowns?: Record<
		string,
		{
			input_tokens: number;
			output_tokens: number;
			cache_creation_tokens: number;
			cache_read_tokens: number;
			cost: number;
		}
	>;
}

interface MonthlyUsageResponse {
	month: string;
	input_tokens: number;
	output_tokens: number;
	cache_creation_tokens: number;
	cache_read_tokens: number;
	total_tokens: number;
	total_cost: number;
	models_used: string[];
	model_breakdowns?: Record<
		string,
		{
			input_tokens: number;
			output_tokens: number;
			cache_creation_tokens: number;
			cache_read_tokens: number;
			cost: number;
		}
	>;
}

// Fetch Functions
export async function fetchUsageSummary(
	filters?: UsageFilters,
): Promise<UsageSummaryResponse> {
	const params = new URLSearchParams();
	if (filters?.projectId) {
		params.append("project_id", filters.projectId.toString());
	}

	const { data } = await apiClient.get<UsageSummaryResponse>(
		`/usage/summary?${params}`,
	);
	return data;
}

export async function fetchDailyUsage(
	filters?: UsageFilters,
): Promise<DailyUsageResponse[]> {
	const params = new URLSearchParams();
	if (filters?.projectId) {
		params.append("project_id", filters.projectId.toString());
	}
	if (filters?.startDate) {
		params.append("start_date", filters.startDate);
	}
	if (filters?.endDate) {
		params.append("end_date", filters.endDate);
	}

	const { data } = await apiClient.get<DailyUsageResponse[]>(
		`/usage/daily?${params}`,
	);
	return data;
}

export async function fetchMonthlyUsage(
	filters?: UsageFilters,
): Promise<MonthlyUsageResponse[]> {
	const params = new URLSearchParams();
	if (filters?.projectId) {
		params.append("project_id", filters.projectId.toString());
	}
	if (filters?.startDate) {
		params.append("start_date", filters.startDate);
	}
	if (filters?.endDate) {
		params.append("end_date", filters.endDate);
	}

	const { data } = await apiClient.get<MonthlyUsageResponse[]>(
		`/usage/monthly?${params}`,
	);
	return data;
}

export async function fetchModelUsage(
	filters?: UsageFilters,
): Promise<ModelUsageResponse[]> {
	const params = new URLSearchParams();
	if (filters?.projectId) {
		params.append("project_id", filters.projectId.toString());
	}

	const { data } = await apiClient.get<ModelUsageResponse[]>(
		`/usage/models?${params}`,
	);
	return data;
}

export async function fetchCurrentSessionUsage(
	filters?: UsageFilters,
): Promise<SessionBlockResponse[]> {
	const params = new URLSearchParams();
	if (filters?.projectId) {
		params.append("project_id", filters.projectId.toString());
	}

	const { data } = await apiClient.get<SessionBlockResponse[]>(
		`/usage/current?${params}`,
	);
	return data;
}

// React Query Hooks
export const useUsageSummary = (filters?: UsageFilters) => {
	return useQuery({
		queryKey: ["usage", "summary", filters],
		queryFn: () => fetchUsageSummary(filters),
		staleTime: 30000, // 30 seconds
	});
};

export const useUsageDaily = (filters?: UsageFilters) => {
	return useQuery({
		queryKey: ["usage", "daily", filters],
		queryFn: () => fetchDailyUsage(filters),
		staleTime: 30000,
	});
};

export const useUsageMonthly = (filters?: UsageFilters) => {
	return useQuery({
		queryKey: ["usage", "monthly", filters],
		queryFn: () => fetchMonthlyUsage(filters),
		staleTime: 30000,
	});
};

export const useModelUsage = (filters?: UsageFilters) => {
	return useQuery({
		queryKey: ["usage", "models", filters],
		queryFn: () => fetchModelUsage(filters),
		staleTime: 30000,
	});
};

export const useCurrentSessionUsage = (filters?: UsageFilters) => {
	return useQuery({
		queryKey: ["usage", "current", filters],
		queryFn: () => fetchCurrentSessionUsage(filters),
		staleTime: 10000, // 10 seconds for current session
		refetchInterval: 30000, // Auto-refetch every 30 seconds
	});
};

// Reset time types and fetch function
interface ResetTimeResponse {
	has_active_window: boolean;
	reset_time: string | null;
	minutes_until_reset: number | null;
	window_start: string | null;
	last_activity?: string | null;
	window_tokens?: number;
	window_cost?: number;
}

export async function fetchResetTime(
	filters?: UsageFilters,
): Promise<ResetTimeResponse> {
	const params = new URLSearchParams();
	if (filters?.projectId) {
		params.append("project_id", filters.projectId.toString());
	}

	const { data } = await apiClient.get<ResetTimeResponse>(
		`/usage/reset-time?${params}`,
	);
	return data;
}

export const useResetTime = (filters?: UsageFilters) => {
	return useQuery({
		queryKey: ["usage", "reset-time", filters],
		queryFn: () => fetchResetTime(filters),
		staleTime: 30000, // 30 seconds
		refetchInterval: 60000, // Auto-refetch every minute
	});
};

// Data transformation helpers
export function transformDailyUsageResponse(
	response: DailyUsageResponse[],
): DailyUsageDetailed[] {
	return response.map((item) => {
		const inputTokens = item.input_tokens ?? 0;
		const outputTokens = item.output_tokens ?? 0;
		const cacheCreationTokens = item.cache_creation_tokens ?? 0;
		const cacheReadTokens = item.cache_read_tokens ?? 0;
		// Calculate total_tokens if not provided by API
		const totalTokens =
			item.total_tokens ??
			inputTokens + outputTokens + cacheCreationTokens + cacheReadTokens;

		return {
			date: item.date,
			inputTokens,
			outputTokens,
			cacheCreationTokens,
			cacheReadTokens,
			totalTokens,
			totalCost: item.total_cost ?? 0,
			modelsUsed: item.models_used ?? [],
			modelBreakdown: item.model_breakdowns
				? Object.entries(item.model_breakdowns).reduce(
						(acc, [model, data]) => {
							acc[model] = {
								inputTokens: data.input_tokens ?? 0,
								outputTokens: data.output_tokens ?? 0,
								cacheCreationTokens: data.cache_creation_tokens ?? 0,
								cacheReadTokens: data.cache_read_tokens ?? 0,
								cost: data.cost ?? 0,
							};
							return acc;
						},
						{} as Record<
							string,
							{
								inputTokens: number;
								outputTokens: number;
								cacheCreationTokens: number;
								cacheReadTokens: number;
								cost: number;
							}
						>,
					)
				: undefined,
		};
	});
}

export function transformMonthlyUsageResponse(
	response: MonthlyUsageResponse[],
): MonthlyUsageDetailed[] {
	return response.map((item) => {
		const inputTokens = item.input_tokens ?? 0;
		const outputTokens = item.output_tokens ?? 0;
		const cacheCreationTokens = item.cache_creation_tokens ?? 0;
		const cacheReadTokens = item.cache_read_tokens ?? 0;
		// Calculate total_tokens if not provided by API
		const totalTokens =
			item.total_tokens ??
			inputTokens + outputTokens + cacheCreationTokens + cacheReadTokens;

		return {
			month: item.month,
			inputTokens,
			outputTokens,
			cacheCreationTokens,
			cacheReadTokens,
			totalTokens,
			totalCost: item.total_cost ?? 0,
			modelsUsed: item.models_used ?? [],
			modelBreakdown: item.model_breakdowns
				? Object.entries(item.model_breakdowns).reduce(
						(acc, [model, data]) => {
							acc[model] = {
								inputTokens: data.input_tokens ?? 0,
								outputTokens: data.output_tokens ?? 0,
								cacheCreationTokens: data.cache_creation_tokens ?? 0,
								cacheReadTokens: data.cache_read_tokens ?? 0,
								cost: data.cost ?? 0,
							};
							return acc;
						},
						{} as Record<
							string,
							{
								inputTokens: number;
								outputTokens: number;
								cacheCreationTokens: number;
								cacheReadTokens: number;
								cost: number;
							}
						>,
					)
				: undefined,
		};
	});
}

export function transformSessionUsageResponse(
	response: SessionBlockResponse[],
): SessionUsage[] {
	return response.map((item) => ({
		sessionId: item.session_id,
		startedAt: item.started_at,
		endedAt: item.ended_at,
		tokens:
			item.input_tokens +
			item.output_tokens +
			item.cache_creation_tokens +
			item.cache_read_tokens,
		cost: item.cost_usd,
		messageCount: item.message_count,
		isActive: item.session_id === "current",
	}));
}
