import { useEffect, useRef, useState } from "react";
import { useSearch } from "../hooks/useApi";
import { useAppStore } from "../store";

export const SearchBar = () => {
	const [query, setQuery] = useState("");
	const [showResults, setShowResults] = useState(false);
	const { data: results, isLoading } = useSearch(query);
	const inputRef = useRef<HTMLInputElement>(null);
	const resultsRef = useRef<HTMLDivElement>(null);

	// Focus on "/" key
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey) {
				if (document.activeElement !== inputRef.current) {
					e.preventDefault();
					inputRef.current?.focus();
				}
			}
			if (e.key === "Escape") {
				setShowResults(false);
				inputRef.current?.blur();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	// Close results when clicking outside
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (
				resultsRef.current &&
				!resultsRef.current.contains(e.target as Node) &&
				!inputRef.current?.contains(e.target as Node)
			) {
				setShowResults(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const handleQueryChange = (value: string) => {
		setQuery(value);
		setShowResults(value.length >= 2);
	};

	const handleResultClick = (result: NonNullable<typeof results>[number]) => {
		const { setSelectedProjectId, setSelectedConversationId } =
			useAppStore.getState();
		setSelectedProjectId(result.project.id);
		setSelectedConversationId(result.conversation.id);
		setShowResults(false);
		setQuery("");
	};

	return (
		<div className="p-3 bg-gray-50 dark:bg-gray-850 border-b border-gray-200 dark:border-gray-700 relative">
			<div className="relative">
				<div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
					<svg
						className="h-4 w-4 text-gray-400"
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path
							fillRule="evenodd"
							d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
							clipRule="evenodd"
						/>
					</svg>
				</div>
				<input
					ref={inputRef}
					type="text"
					placeholder='Search messages... (press "/" to focus)'
					className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-shadow"
					value={query}
					onChange={(e) => handleQueryChange(e.target.value)}
					onFocus={() => query.length >= 2 && setShowResults(true)}
				/>
				<div className="absolute inset-y-0 right-3 flex items-center">
					<kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded">
						/
					</kbd>
				</div>
			</div>

			{showResults && (
				<div
					ref={resultsRef}
					className="absolute top-full left-3 right-3 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-96 overflow-y-auto z-50"
				>
					{isLoading ? (
						<div className="p-4 text-center text-gray-500 dark:text-gray-400">
							<div className="inline-flex items-center gap-2">
								<svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
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
								Searching...
							</div>
						</div>
					) : results && results.length > 0 ? (
						<div>
							{results.map((result, index) => (
								<div
									key={`${result.message.id}-${index}`}
									onClick={() => handleResultClick(result)}
									className="p-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0 cursor-pointer hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
								>
									<div className="flex items-center justify-between mb-1">
										<div className="text-sm font-medium text-gray-900 dark:text-gray-100">
											{result.project.name}
											<span className="mx-1.5 text-gray-400">/</span>
											<span className="text-gray-500 dark:text-gray-400 font-normal">
												{result.conversation.session_id.slice(0, 8)}...
											</span>
										</div>
										<div className="text-xs text-gray-400">
											{new Date(result.message.timestamp).toLocaleDateString()}
										</div>
									</div>
									<div className="text-sm text-gray-600 dark:text-gray-400">
										<span
											className={`inline-block px-1.5 py-0.5 rounded text-xs mr-2 ${
												result.message.role === "user"
													? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
													: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300"
											}`}
										>
											{result.message.role === "user" ? "User" : "Claude"}
										</span>
										<span
											dangerouslySetInnerHTML={{ __html: result.highlight }}
										/>
									</div>
								</div>
							))}
						</div>
					) : query.length >= 2 ? (
						<div className="p-4 text-center text-gray-500 dark:text-gray-400">
							No results found for "{query}"
						</div>
					) : null}
				</div>
			)}
		</div>
	);
};
