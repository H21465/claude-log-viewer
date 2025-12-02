import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConversationList } from "./components/ConversationList";
import { ProjectList } from "./components/ProjectList";
import { SearchBar } from "./components/SearchBar";
import { EventTimeline } from "./components/timeline";
import { UsageDashboard } from "./components/usage";
import { useAppStore } from "./store";

const queryClient = new QueryClient();

function AppHeader() {
	const { darkMode, toggleDarkMode, headerCollapsed, toggleHeaderCollapsed } =
		useAppStore();

	return (
		<header className="h-12 bg-gradient-to-r from-orange-500 to-orange-600 dark:from-orange-600 dark:to-orange-700 flex items-center justify-between px-4 shadow-md">
			<div className="flex items-center gap-2">
				<div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-white font-bold">
					C
				</div>
				<h1 className="text-white font-semibold tracking-tight">
					Claude Log Viewer
				</h1>
			</div>
			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={toggleHeaderCollapsed}
					className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
					title={headerCollapsed ? "ヘッダーを展開" : "ヘッダーを折りたたむ"}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className={`h-4 w-4 transition-transform ${headerCollapsed ? "rotate-180" : ""}`}
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<title>{headerCollapsed ? "展開" : "折りたたむ"}</title>
						<path
							fillRule="evenodd"
							d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
							clipRule="evenodd"
						/>
					</svg>
				</button>
				<button
					type="button"
					onClick={toggleDarkMode}
					className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
					title="Toggle dark mode"
				>
					{darkMode ? (
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-4 w-4"
							viewBox="0 0 20 20"
							fill="currentColor"
							aria-label="Light mode"
						>
							<title>Light mode</title>
							<path
								fillRule="evenodd"
								d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
								clipRule="evenodd"
							/>
						</svg>
					) : (
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-4 w-4"
							viewBox="0 0 20 20"
							fill="currentColor"
							aria-label="Dark mode"
						>
							<title>Dark mode</title>
							<path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
						</svg>
					)}
				</button>
			</div>
		</header>
	);
}

function NavigationBar() {
	const {
		overlayPanel,
		setOverlayPanel,
		selectedProject,
		selectedConversationId,
		currentTab,
		setCurrentTab,
	} = useAppStore();

	return (
		<div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
			{/* Left side - Project and Conversation navigation */}
			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={() =>
						setOverlayPanel(overlayPanel === "projects" ? "none" : "projects")
					}
					className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-2 ${
						overlayPanel === "projects"
							? "bg-orange-500 text-white"
							: "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600"
					}`}
				>
					<span>📁</span>
					<span className="font-medium truncate max-w-32">
						{selectedProject?.name || "Projects"}
					</span>
				</button>
				<span className="text-gray-400">→</span>
				<button
					type="button"
					onClick={() =>
						setOverlayPanel(
							overlayPanel === "conversations" ? "none" : "conversations",
						)
					}
					className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-2 ${
						overlayPanel === "conversations"
							? "bg-orange-500 text-white"
							: "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600"
					}`}
					disabled={!selectedProject}
				>
					<span>💬</span>
					<span className="font-medium truncate max-w-40">
						{selectedConversationId
							? `Session #${selectedConversationId}`
							: "Conversations"}
					</span>
				</button>
			</div>

			{/* Right side - Tab navigation */}
			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={() => setCurrentTab("timeline")}
					className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
						currentTab === "timeline"
							? "bg-orange-500 text-white"
							: "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600"
					}`}
				>
					Timeline
				</button>
				<button
					type="button"
					onClick={() => setCurrentTab("usage")}
					className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
						currentTab === "usage"
							? "bg-orange-500 text-white"
							: "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600"
					}`}
				>
					Usage
				</button>
			</div>
		</div>
	);
}

function OverlayPanel() {
	const { overlayPanel, closeOverlay } = useAppStore();

	if (overlayPanel === "none") return null;

	return (
		<>
			{/* 背景オーバーレイ */}
			<div
				className="fixed inset-0 bg-black/30 z-40"
				onClick={closeOverlay}
				onKeyDown={(e) => e.key === "Escape" && closeOverlay()}
			/>
			{/* パネル */}
			<div className="fixed left-0 top-0 h-full w-80 bg-white dark:bg-gray-800 shadow-2xl z-50 overflow-hidden flex flex-col animate-slide-in">
				<div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
					<h2 className="font-semibold text-gray-900 dark:text-gray-100">
						{overlayPanel === "projects" ? "📁 Projects" : "💬 Conversations"}
					</h2>
					<button
						type="button"
						onClick={closeOverlay}
						className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center text-gray-500"
					>
						✕
					</button>
				</div>
				<div className="flex-1 overflow-y-auto">
					{overlayPanel === "projects" ? (
						<ProjectList />
					) : (
						<ConversationList onSelect={closeOverlay} />
					)}
				</div>
			</div>
		</>
	);
}

function AppContent() {
	const { darkMode, selectedConversationId, headerCollapsed, currentTab } =
		useAppStore();

	return (
		<div className={darkMode ? "dark" : ""}>
			<div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
				<AppHeader />
				<div
					className={`overflow-hidden transition-all duration-200 ${
						headerCollapsed ? "max-h-0" : "max-h-32"
					}`}
				>
					<NavigationBar />
					{currentTab === "timeline" && <SearchBar />}
				</div>
				<div className="flex-1 flex flex-col min-h-0 relative">
					{currentTab === "timeline" ? (
						<EventTimeline conversationId={selectedConversationId} />
					) : (
						<UsageDashboard />
					)}
					<OverlayPanel />
				</div>
			</div>
		</div>
	);
}

function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<AppContent />
		</QueryClientProvider>
	);
}

export default App;
