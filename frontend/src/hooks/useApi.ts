import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, fetchSubagentMessages } from "../api/client";
import type {
	Conversation,
	Message,
	Project,
	SearchQuery,
	SearchResult,
} from "../types";

// Projects
export const useProjects = () => {
	return useQuery({
		queryKey: ["projects"],
		queryFn: async () => {
			const { data } = await apiClient.get<Project[]>("/projects/");
			return data;
		},
	});
};

export const useAddProject = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (path: string) => {
			const { data } = await apiClient.post<Project>("/projects", { path });
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["projects"] });
		},
	});
};

export const useSyncProject = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (projectId: number) => {
			await apiClient.post(`/projects/${projectId}/sync`);
		},
		onSuccess: (_, projectId) => {
			queryClient.invalidateQueries({ queryKey: ["projects"] });
			queryClient.invalidateQueries({ queryKey: ["conversations", projectId] });
		},
	});
};

// Conversations (5秒ごとに自動更新)
export const useConversations = (projectId: number | null) => {
	return useQuery({
		queryKey: ["conversations", projectId],
		queryFn: async () => {
			if (!projectId) return [];
			const { data } = await apiClient.get<Conversation[]>(
				`/projects/${projectId}/conversations`,
			);
			return data;
		},
		enabled: !!projectId,
		refetchInterval: 5000,
	});
};

// Messages (2秒ごとに自動更新)
export const useMessages = (conversationId: number | null) => {
	return useQuery({
		queryKey: ["messages", conversationId],
		queryFn: async () => {
			if (!conversationId) return [];
			const { data } = await apiClient.get<Message[]>(
				`/conversations/${conversationId}/messages`,
			);
			return data;
		},
		enabled: !!conversationId,
		refetchInterval: 2000,
	});
};

// Search
export const useSearch = (query: string) => {
	return useQuery({
		queryKey: ["search", query],
		queryFn: async () => {
			if (!query || query.length < 2) return [];
			const searchQuery: SearchQuery = { query };
			const { data } = await apiClient.post<SearchResult[]>(
				"/search",
				searchQuery,
			);
			return data;
		},
		enabled: query.length >= 2,
	});
};

// Subagent Messages
export const useSubagentMessages = (
	agentId: string | null,
	projectPath: string | null,
) => {
	return useQuery({
		queryKey: ["subagentMessages", agentId, projectPath],
		queryFn: async () => {
			if (!agentId || !projectPath) return null;
			return fetchSubagentMessages(agentId, projectPath);
		},
		enabled: !!agentId && !!projectPath,
	});
};
