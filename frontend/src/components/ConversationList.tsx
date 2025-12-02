import { useConversations } from "../hooks/useApi";
import { useAppStore } from "../store";
import { formatTimeShort } from "../utils/formatTime";

interface ConversationListProps {
	onSelect?: () => void;
}

export const ConversationList = ({ onSelect }: ConversationListProps) => {
	const {
		selectedProjectId,
		selectedConversationId,
		setSelectedConversationId,
	} = useAppStore();
	const { data: conversations, isLoading } =
		useConversations(selectedProjectId);

	// Group conversations by date
	const groupedConversations =
		conversations?.reduce(
			(groups, conversation) => {
				const date = new Date(conversation.started_at).toLocaleDateString();
				if (!groups[date]) {
					groups[date] = [];
				}
				groups[date].push(conversation);
				return groups;
			},
			{} as Record<string, typeof conversations>,
		) || {};

	if (!selectedProjectId) {
		return (
			<div className="flex flex-col h-full">
				<div className="p-4 border-b border-gray-200 dark:border-gray-700">
					<h2 className="text-lg font-bold">Conversations</h2>
				</div>
				<div className="flex flex-col items-center justify-center flex-1 p-4 text-center">
					<svg
						className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3"
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
					<p className="text-gray-500 dark:text-gray-400 text-sm">
						Select a project
					</p>
					<p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
						Choose a project to view conversations
					</p>
				</div>
			</div>
		);
	}

	if (isLoading) {
		return (
			<div className="flex flex-col h-full">
				<div className="p-4 border-b border-gray-200 dark:border-gray-700">
					<h2 className="text-lg font-bold">Conversations</h2>
				</div>
				<div className="p-4 space-y-4">
					{[1, 2, 3, 4].map((i) => (
						<div key={i} className="space-y-2">
							<div className="flex justify-between">
								<div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
								<div className="h-3 w-12 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
							</div>
							<div className="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
							<div className="h-3 w-2/3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
						</div>
					))}
				</div>
			</div>
		);
	}

	const dates = Object.keys(groupedConversations).sort(
		(a, b) => new Date(b).getTime() - new Date(a).getTime(),
	);

	return (
		<div className="flex flex-col h-full">
			<div className="p-4 border-b border-gray-200 dark:border-gray-700">
				<h2 className="text-lg font-bold">Conversations</h2>
			</div>

			<div className="flex-1 overflow-y-auto">
				{dates.length === 0 ? (
					<div className="flex flex-col items-center justify-center h-full p-4 text-center">
						<svg
							className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3"
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
						<p className="text-gray-500 dark:text-gray-400 text-sm">
							No conversations yet
						</p>
						<p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
							Sync the project to load logs
						</p>
					</div>
				) : (
					dates.map((date) => (
						<div key={date} className="mb-4">
							<div className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-sm font-semibold sticky top-0">
								{date}
							</div>
							{groupedConversations[date].map((conversation) => {
								const startTime = formatTimeShort(conversation.started_at);
								const updateTime = formatTimeShort(conversation.updated_at);

								return (
									<div
										key={conversation.id}
										onClick={() => {
											setSelectedConversationId(conversation.id);
											onSelect?.();
										}}
										onKeyDown={(e) => {
											if (e.key === "Enter" || e.key === " ") {
												setSelectedConversationId(conversation.id);
												onSelect?.();
											}
										}}
										role="button"
										tabIndex={0}
										className={`p-4 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
											selectedConversationId === conversation.id
												? "bg-blue-50 dark:bg-blue-900 border-l-4 border-l-blue-500"
												: ""
										}`}
									>
										<div className="flex items-start justify-between mb-1">
											<span className="text-sm font-medium">
												Session {conversation.session_id.slice(0, 8)}...
											</span>
											<span className="text-xs text-gray-500 dark:text-gray-500">
												{startTime}
											</span>
										</div>

										{conversation.preview && (
											<p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
												{conversation.preview}
											</p>
										)}

										<div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-500">
											<span>{conversation.message_count} messages</span>
											<span>Updated: {updateTime}</span>
										</div>
									</div>
								);
							})}
						</div>
					))
				)}
			</div>
		</div>
	);
};
