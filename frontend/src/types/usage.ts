export interface UsageStats {
	totalTokens: number;
	totalCost: number;
	messageCount: number;
	sessionCount: number;
}

export interface SessionUsage {
	sessionId: string;
	startedAt: string;
	endedAt?: string;
	tokens: number;
	cost: number;
	messageCount: number;
	isActive: boolean;
}

export interface DailyUsage {
	date: string;
	tokens: number;
	cost: number;
	messageCount: number;
	sessionCount: number;
}

export interface TokenBreakdown {
	inputTokens: number;
	outputTokens: number;
	cacheCreationTokens: number;
	cacheReadTokens: number;
}

export interface DailyUsageDetailed extends TokenBreakdown {
	date: string;
	totalTokens: number;
	totalCost: number;
	modelsUsed: string[];
	modelBreakdown?: Record<string, TokenBreakdown & { cost: number }>;
}

export interface MonthlyUsageDetailed extends TokenBreakdown {
	month: string;
	totalTokens: number;
	totalCost: number;
	modelsUsed: string[];
	modelBreakdown?: Record<string, TokenBreakdown & { cost: number }>;
}

export interface ModelUsage {
	model: string;
	tokens: number;
	cost: number;
	messageCount: number;
	percentage: number;
}

export interface UsageSummary {
	overall: UsageStats;
	daily: DailyUsage[];
	sessions: SessionUsage[];
	byModel: ModelUsage[];
	period: {
		start: string;
		end: string;
	};
}

export interface UsageFilters {
	projectId?: number;
	startDate?: string;
	endDate?: string;
	model?: string;
}

export type PlanType = "Max" | "Pro" | "Free";

export interface TokenUsageLimit {
	current: number;
	limit: number;
	plan: PlanType;
	resetTime?: Date;
}
