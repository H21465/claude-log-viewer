import axios from "axios";

export const apiClient = axios.create({
	baseURL: "/api",
	headers: {
		"Content-Type": "application/json",
	},
});

// Request interceptor
apiClient.interceptors.request.use(
	(config) => {
		// Add any auth tokens here if needed
		return config;
	},
	(error) => {
		return Promise.reject(error);
	},
);

// Response interceptor
apiClient.interceptors.response.use(
	(response) => {
		return response;
	},
	(error) => {
		// Handle errors globally
		console.error("API Error:", error);
		return Promise.reject(error);
	},
);

// API functions
import type { SubagentDetail } from "../types";

export async function fetchSubagentMessages(
	agentId: string,
	projectPath: string,
): Promise<SubagentDetail> {
	const { data } = await apiClient.get<SubagentDetail>(
		`/subagents/${agentId}/messages`,
		{
			params: { project_path: projectPath },
		},
	);
	return data;
}
