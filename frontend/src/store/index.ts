import { create } from "zustand";
import type { Project } from "../types";

interface AppState {
	selectedProjectId: number | null;
	selectedProject: Project | null;
	selectedConversationId: number | null;
	searchQuery: string;
	darkMode: boolean;
	// オーバーレイパネル状態
	overlayPanel: "none" | "projects" | "conversations";
	// Thinking展開設定（デフォルトで展開するか）
	expandThinkingByDefault: boolean;
	// ヘッダー折りたたみ状態
	headerCollapsed: boolean;
	setSelectedProjectId: (id: number | null) => void;
	setSelectedProject: (project: Project | null) => void;
	setSelectedConversationId: (id: number | null) => void;
	setSearchQuery: (query: string) => void;
	toggleDarkMode: () => void;
	setOverlayPanel: (panel: "none" | "projects" | "conversations") => void;
	closeOverlay: () => void;
	toggleExpandThinkingByDefault: () => void;
	toggleHeaderCollapsed: () => void;
}

export const useAppStore = create<AppState>((set) => ({
	selectedProjectId: null,
	selectedProject: null,
	selectedConversationId: null,
	searchQuery: "",
	darkMode: window.matchMedia("(prefers-color-scheme: dark)").matches,
	overlayPanel: "none",
	expandThinkingByDefault: true, // デフォルトで展開
	headerCollapsed: false,

	setSelectedProjectId: (id) => set({ selectedProjectId: id }),
	setSelectedProject: (project) => set({ selectedProject: project }),
	setSelectedConversationId: (id) => set({ selectedConversationId: id }),
	setSearchQuery: (query) => set({ searchQuery: query }),
	toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
	setOverlayPanel: (panel) => set({ overlayPanel: panel }),
	closeOverlay: () => set({ overlayPanel: "none" }),
	toggleExpandThinkingByDefault: () =>
		set((state) => ({ expandThinkingByDefault: !state.expandThinkingByDefault })),
	toggleHeaderCollapsed: () =>
		set((state) => ({ headerCollapsed: !state.headerCollapsed })),
}));
