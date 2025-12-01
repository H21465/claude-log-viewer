import { useEffect } from "react";
import { useMessages, useProjects } from "../hooks/useApi";
import { useAppStore } from "../store";
import { ChatContainer, MessageBubble } from "./chat";

export const MessageTimeline = () => {
	const { selectedProjectId, selectedConversationId, setSelectedProject } =
		useAppStore();
	const { data: projects } = useProjects();
	const { data: messages, isLoading } = useMessages(selectedConversationId);

	// selectedProjectId が変わったら selectedProject を更新
	useEffect(() => {
		if (selectedProjectId && projects) {
			const project = projects.find((p) => p.id === selectedProjectId);
			setSelectedProject(project || null);
		} else {
			setSelectedProject(null);
		}
	}, [selectedProjectId, projects, setSelectedProject]);

	if (!selectedConversationId) {
		return (
			<div className="flex flex-col items-center justify-center h-full bg-gray-50 dark:bg-gray-900/50">
				<div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
					<svg
						className="w-8 h-8 text-gray-400 dark:text-gray-500"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={1.5}
							d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
						/>
					</svg>
				</div>
				<h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
					No conversation selected
				</h3>
				<p className="text-sm text-gray-500 dark:text-gray-400">
					Select a conversation from the list to view messages
				</p>
			</div>
		);
	}

	if (isLoading) {
		return (
			<div className="flex flex-col items-center justify-center h-full bg-gray-50 dark:bg-gray-900/50">
				<div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
					<svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
						<circle
							className="opacity-25"
							cx="12"
							cy="12"
							r="10"
							stroke="currentColor"
							strokeWidth="4"
							fill="none"
						/>
						<path
							className="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						/>
					</svg>
					<span className="text-sm">Loading messages...</span>
				</div>
			</div>
		);
	}

	if (!messages || messages.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center h-full bg-gray-50 dark:bg-gray-900/50">
				<div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
					<svg
						className="w-8 h-8 text-gray-400 dark:text-gray-500"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={1.5}
							d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
						/>
					</svg>
				</div>
				<h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
					No messages
				</h3>
				<p className="text-sm text-gray-500 dark:text-gray-400">
					This conversation has no messages
				</p>
			</div>
		);
	}

	return (
		<ChatContainer>
			{messages.map((message) => (
				<MessageBubble key={message.id} message={message} />
			))}
		</ChatContainer>
	);
};
