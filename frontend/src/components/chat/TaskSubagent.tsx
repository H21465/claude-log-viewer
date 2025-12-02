import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useSubagentMessages } from "../../hooks/useApi";

interface TaskSubagentProps {
	toolUseId: string;
	subagentType: string;
	description: string;
	prompt: string;
	result?: string;
	isExpanded?: boolean;
	agentId?: string;
	projectPath?: string;
	toolUseResult?: {
		status?: string;
		agentId?: string;
		totalDurationMs?: number;
		totalTokens?: number;
		totalToolUseCount?: number;
	};
}

// Tool icon mapping
const getToolIcon = (toolName: string): string => {
	const lowerName = toolName.toLowerCase();
	if (lowerName === "read") return "📖";
	if (lowerName === "write") return "✍️";
	if (lowerName === "edit") return "✏️";
	if (lowerName === "bash") return "💻";
	if (lowerName === "grep") return "🔍";
	if (lowerName === "glob") return "📁";
	if (lowerName === "task") return "📋";
	return "🔧";
};

// Subagent type styles
const getSubagentStyles = (type: string) => {
	const lowerType = type.toLowerCase();

	if (lowerType === "architect") {
		return {
			icon: "🏗️",
			label: "Architect",
			border: "border-purple-300 dark:border-purple-700",
			bg: "bg-purple-50 dark:bg-purple-900/20",
			header: "bg-purple-100 dark:bg-purple-900/40",
			text: "text-purple-800 dark:text-purple-300",
			textAlt: "text-purple-700 dark:text-purple-400",
			accent: "purple",
		};
	}

	if (lowerType === "implementer") {
		return {
			icon: "⚙️",
			label: "Implementer",
			border: "border-green-300 dark:border-green-700",
			bg: "bg-green-50 dark:bg-green-900/20",
			header: "bg-green-100 dark:bg-green-900/40",
			text: "text-green-800 dark:text-green-300",
			textAlt: "text-green-700 dark:text-green-400",
			accent: "green",
		};
	}

	if (lowerType === "reviewer") {
		return {
			icon: "👁️",
			label: "Reviewer",
			border: "border-orange-300 dark:border-orange-700",
			bg: "bg-orange-50 dark:bg-orange-900/20",
			header: "bg-orange-100 dark:bg-orange-900/40",
			text: "text-orange-800 dark:text-orange-300",
			textAlt: "text-orange-700 dark:text-orange-400",
			accent: "orange",
		};
	}

	if (lowerType === "debugger") {
		return {
			icon: "🐛",
			label: "Debugger",
			border: "border-red-300 dark:border-red-700",
			bg: "bg-red-50 dark:bg-red-900/20",
			header: "bg-red-100 dark:bg-red-900/40",
			text: "text-red-800 dark:text-red-300",
			textAlt: "text-red-700 dark:text-red-400",
			accent: "red",
		};
	}

	if (lowerType === "explorer" || lowerType === "explore") {
		return {
			icon: "🔭",
			label: "Explorer",
			border: "border-blue-300 dark:border-blue-700",
			bg: "bg-blue-50 dark:bg-blue-900/20",
			header: "bg-blue-100 dark:bg-blue-900/40",
			text: "text-blue-800 dark:text-blue-300",
			textAlt: "text-blue-700 dark:text-blue-400",
			accent: "blue",
		};
	}

	if (lowerType === "search") {
		return {
			icon: "🔎",
			label: "Search",
			border: "border-cyan-300 dark:border-cyan-700",
			bg: "bg-cyan-50 dark:bg-cyan-900/20",
			header: "bg-cyan-100 dark:bg-cyan-900/40",
			text: "text-cyan-800 dark:text-cyan-300",
			textAlt: "text-cyan-700 dark:text-cyan-400",
			accent: "cyan",
		};
	}

	if (lowerType === "doc-writer") {
		return {
			icon: "📝",
			label: "Doc Writer",
			border: "border-amber-300 dark:border-amber-700",
			bg: "bg-amber-50 dark:bg-amber-900/20",
			header: "bg-amber-100 dark:bg-amber-900/40",
			text: "text-amber-800 dark:text-amber-300",
			textAlt: "text-amber-700 dark:text-amber-400",
			accent: "amber",
		};
	}

	// Default
	return {
		icon: "🤖",
		label: type,
		border: "border-gray-300 dark:border-gray-700",
		bg: "bg-gray-50 dark:bg-gray-900/20",
		header: "bg-gray-100 dark:bg-gray-900/40",
		text: "text-gray-800 dark:text-gray-300",
		textAlt: "text-gray-700 dark:text-gray-400",
		accent: "gray",
	};
};

// Markdown renderer for results
const MarkdownResult = ({ content }: { content: string }) => {
	return (
		<div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold prose-headings:text-base prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent prose-code:text-sm">
			<ReactMarkdown
				components={{
					code(props) {
						const { children, className, ...rest } = props;
						const match = /language-(\w+)/.exec(className || "");
						const inline = !match;
						return !inline && match ? (
							<SyntaxHighlighter
								style={vscDarkPlus as { [key: string]: React.CSSProperties }}
								language={match[1]}
								PreTag="div"
								customStyle={{
									margin: 0,
									borderRadius: "0.375rem",
									fontSize: "0.75rem",
								}}
							>
								{String(children).replace(/\n$/, "")}
							</SyntaxHighlighter>
						) : (
							<code
								className={`px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-xs ${className || ""}`}
								{...rest}
							>
								{children}
							</code>
						);
					},
				}}
			>
				{content}
			</ReactMarkdown>
		</div>
	);
};

export const TaskSubagent = ({
	toolUseId: _toolUseId,
	subagentType,
	description,
	prompt,
	result,
	isExpanded: _isExpanded = false,
	agentId,
	projectPath,
	toolUseResult,
}: TaskSubagentProps) => {
	const [promptExpanded, setPromptExpanded] = useState(true); // Default expanded
	const [resultExpanded, setResultExpanded] = useState(true); // Default expanded
	const [thinkingExpanded, setThinkingExpanded] = useState(false);
	const [toolUsesExpanded, setToolUsesExpanded] = useState(false);
	const [expandedThinkingIndexes, setExpandedThinkingIndexes] = useState<
		Set<number>
	>(new Set());
	const [expandedToolIndexes, setExpandedToolIndexes] = useState<Set<number>>(
		new Set(),
	);
	const [copiedSection, setCopiedSection] = useState<string | null>(null);

	const handleCopySection = async (
		e: React.MouseEvent,
		section: string,
		content: string,
	) => {
		e.stopPropagation();
		await navigator.clipboard.writeText(content);
		setCopiedSection(section);
		setTimeout(() => setCopiedSection(null), 2000);
	};

	const styles = getSubagentStyles(subagentType);

	// Fetch subagent details if agentId and projectPath are provided
	const { data: subagentDetail, isLoading: isLoadingSubagent } =
		useSubagentMessages(agentId || null, projectPath || null);

	// Extract thinking blocks and tool uses from subagent messages
	const thinkingBlocks =
		subagentDetail?.messages.flatMap((msg) =>
			(msg.content_blocks || [])
				.filter((block) => block.type === "thinking")
				.map((block) => block.thinking || ""),
		) || [];

	const toolUses =
		subagentDetail?.messages.flatMap((msg) =>
			(msg.content_blocks || [])
				.filter((block) => block.type === "tool_use")
				.map((block) => ({
					name: block.tool_name || "Unknown",
					input: block.tool_input || {},
				})),
		) || [];

	const toggleThinking = (index: number) => {
		const newSet = new Set(expandedThinkingIndexes);
		if (newSet.has(index)) {
			newSet.delete(index);
		} else {
			newSet.add(index);
		}
		setExpandedThinkingIndexes(newSet);
	};

	const toggleToolUse = (index: number) => {
		const newSet = new Set(expandedToolIndexes);
		if (newSet.has(index)) {
			newSet.delete(index);
		} else {
			newSet.add(index);
		}
		setExpandedToolIndexes(newSet);
	};

	// Status badge
	const getStatusBadge = (): { text: string; color: string; icon: string } => {
		if (!result) {
			return {
				text: "Running",
				color: "bg-blue-500 dark:bg-blue-600",
				icon: "⏳",
			};
		}
		if (
			result.toLowerCase().includes("error") ||
			result.toLowerCase().includes("failed")
		) {
			return {
				text: "Error",
				color: "bg-red-500 dark:bg-red-600",
				icon: "❌",
			};
		}
		return {
			text: "Complete",
			color: "bg-green-500 dark:bg-green-600",
			icon: "✅",
		};
	};

	const status = getStatusBadge();

	return (
		<div
			className={`my-3 rounded-xl overflow-hidden border-2 ${styles.border} ${styles.bg} shadow-md`}
		>
			{/* Header */}
			<div className={`px-4 py-3 ${styles.header}`}>
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<span className="text-2xl">{styles.icon}</span>
						<div>
							<div className="flex items-center gap-2">
								<span className={`text-base font-bold ${styles.text}`}>
									{styles.label}
								</span>
								<span
									className={`px-2 py-0.5 rounded-full text-xs text-white font-medium ${status.color} flex items-center gap-1`}
								>
									<span>{status.icon}</span>
									{status.text}
								</span>
							</div>
							<div className={`text-sm mt-0.5 ${styles.textAlt}`}>
								{description}
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Agent ID Section */}
			{(agentId || toolUseResult?.agentId) && (
				<div className="border-t border-gray-200 dark:border-gray-700 px-4 py-2 bg-gray-50 dark:bg-gray-800/30">
					<button
						type="button"
						onClick={() => {
							const effectiveAgentId = toolUseResult?.agentId || agentId;
							if (effectiveAgentId) {
								console.log("Agent ID clicked:", effectiveAgentId);
								// TODO: Open detail panel
							}
						}}
						className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors flex items-center gap-2 group"
					>
						<span>Agent ID:</span>
						<span className="font-mono font-semibold text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">
							{toolUseResult?.agentId || agentId}
						</span>
						<span className="text-blue-500 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
							[Click for details]
						</span>
					</button>
				</div>
			)}

			{/* Input/Prompt Section */}
			<div className="border-t-2 border-gray-200 dark:border-gray-700">
				<button
					type="button"
					onClick={() => setPromptExpanded(!promptExpanded)}
					className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30 text-left transition-all flex items-center justify-between"
				>
					<div className="flex items-center gap-2">
						<span className="text-lg">📥</span>
						<span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
							Input (Prompt to Subagent)
						</span>
						<span className="text-xs text-blue-500 dark:text-blue-400">
							{prompt.length} chars
						</span>
					</div>
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={(e) => handleCopySection(e, "prompt", prompt)}
							className="text-xs px-1.5 py-0.5 rounded bg-blue-200 dark:bg-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-300 dark:hover:bg-blue-700 transition-colors"
						>
							{copiedSection === "prompt" ? "Copied!" : "Copy"}
						</button>
						<span
							className={`text-blue-500 transition-transform duration-200 ${promptExpanded ? "rotate-90" : ""}`}
						>
							▶
						</span>
					</div>
				</button>
				<div
					className={`overflow-hidden transition-all duration-300 ease-in-out ${
						promptExpanded ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
					}`}
				>
					<div className="px-4 py-3 bg-white dark:bg-gray-900 max-h-[550px] overflow-y-auto border-l-4 border-blue-400 dark:border-blue-600">
						<pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-mono leading-relaxed">
							{prompt}
						</pre>
					</div>
				</div>
			</div>

			{/* Thinking Blocks Section */}
			{agentId && projectPath && thinkingBlocks.length > 0 && (
				<div className="border-t-2 border-gray-200 dark:border-gray-700">
					<button
						type="button"
						onClick={() => setThinkingExpanded(!thinkingExpanded)}
						className="w-full px-4 py-2.5 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 hover:from-purple-100 hover:to-pink-100 dark:hover:from-purple-900/30 dark:hover:to-pink-900/30 text-left transition-all flex items-center justify-between"
					>
						<div className="flex items-center gap-2">
							<span className="text-lg">💭</span>
							<span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
								Thinking Blocks
							</span>
							<span className="text-xs text-purple-500 dark:text-purple-400">
								{thinkingBlocks.length}{" "}
								{thinkingBlocks.length === 1 ? "block" : "blocks"}
							</span>
						</div>
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={(e) =>
									handleCopySection(e, "thinking", thinkingBlocks.join("\n\n---\n\n"))
								}
								className="text-xs px-1.5 py-0.5 rounded bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-300 dark:hover:bg-purple-700 transition-colors"
							>
								{copiedSection === "thinking" ? "Copied!" : "Copy"}
							</button>
							<span
								className={`text-purple-500 transition-transform duration-200 ${thinkingExpanded ? "rotate-90" : ""}`}
							>
								▶
							</span>
						</div>
					</button>
					<div
						className={`overflow-hidden transition-all duration-300 ease-in-out ${
							thinkingExpanded
								? "max-h-[600px] opacity-100"
								: "max-h-0 opacity-0"
						}`}
					>
						<div className="px-4 py-3 bg-white dark:bg-gray-900 max-h-[550px] overflow-y-auto border-l-4 border-purple-400 dark:border-purple-600">
							<div className="space-y-2">
								{thinkingBlocks.map((thinking, index) => {
									const isExpanded = expandedThinkingIndexes.has(index);
									const preview =
										thinking.length > 50
											? `${thinking.slice(0, 50)}...`
											: thinking;
									return (
										<div
											key={`thinking-${
												// biome-ignore lint/suspicious/noArrayIndexKey: index is stable for thinking blocks
												index
											}`}
											className="border border-purple-200 dark:border-purple-700 rounded-lg overflow-hidden"
										>
											<button
												type="button"
												onClick={() => toggleThinking(index)}
												className="w-full px-3 py-2 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 text-left flex items-center justify-between"
											>
												<div className="flex items-center gap-2 flex-1 min-w-0">
													<span className="text-purple-600 dark:text-purple-400 text-xs font-mono">
														[💭 #{index + 1}]
													</span>
													<span className="text-xs text-purple-500 dark:text-purple-400">
														{thinking.length} chars
													</span>
													{!isExpanded && (
														<span className="text-xs text-gray-600 dark:text-gray-400 truncate">
															{preview}
														</span>
													)}
												</div>
												<span
													className={`text-purple-500 transition-transform duration-200 ml-2 ${isExpanded ? "rotate-90" : ""}`}
												>
													▶
												</span>
											</button>
											{isExpanded && (
												<div className="px-3 py-2 bg-white dark:bg-gray-900">
													<pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
														{thinking}
													</pre>
												</div>
											)}
										</div>
									);
								})}
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Tool Uses Section */}
			{agentId && projectPath && toolUses.length > 0 && (
				<div className="border-t-2 border-gray-200 dark:border-gray-700">
					<button
						type="button"
						onClick={() => setToolUsesExpanded(!toolUsesExpanded)}
						className="w-full px-4 py-2.5 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 hover:from-orange-100 hover:to-red-100 dark:hover:from-orange-900/30 dark:hover:to-red-900/30 text-left transition-all flex items-center justify-between"
					>
						<div className="flex items-center gap-2">
							<span className="text-lg">🔧</span>
							<span className="text-sm font-semibold text-orange-700 dark:text-orange-300">
								Tool Uses
							</span>
							<span className="text-xs text-orange-500 dark:text-orange-400">
								{toolUses.length} {toolUses.length === 1 ? "call" : "calls"}
							</span>
						</div>
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={(e) =>
									handleCopySection(
										e,
										"tools",
										toolUses
											.map((t) => `${t.name}\n${JSON.stringify(t.input, null, 2)}`)
											.join("\n\n---\n\n"),
									)
								}
								className="text-xs px-1.5 py-0.5 rounded bg-orange-200 dark:bg-orange-800 text-orange-700 dark:text-orange-300 hover:bg-orange-300 dark:hover:bg-orange-700 transition-colors"
							>
								{copiedSection === "tools" ? "Copied!" : "Copy"}
							</button>
							<span
								className={`text-orange-500 transition-transform duration-200 ${toolUsesExpanded ? "rotate-90" : ""}`}
							>
								▶
							</span>
						</div>
					</button>
					<div
						className={`overflow-hidden transition-all duration-300 ease-in-out ${
							toolUsesExpanded
								? "max-h-[600px] opacity-100"
								: "max-h-0 opacity-0"
						}`}
					>
						<div className="px-4 py-3 bg-white dark:bg-gray-900 max-h-[550px] overflow-y-auto border-l-4 border-orange-400 dark:border-orange-600">
							<div className="space-y-2">
								{toolUses.map((tool, index) => {
									const isExpanded = expandedToolIndexes.has(index);
									const toolIcon = getToolIcon(tool.name);
									// Get a display string for the tool input
									const getInputDisplay = () => {
										if (tool.input.file_path)
											return tool.input.file_path as string;
										if (tool.input.command) return tool.input.command as string;
										if (tool.input.pattern) return tool.input.pattern as string;
										if (tool.input.description)
											return tool.input.description as string;
										return "";
									};
									const inputDisplay = getInputDisplay();
									return (
										<div
											key={`tool-${
												// biome-ignore lint/suspicious/noArrayIndexKey: index is stable for tool uses
												index
											}`}
											className="border border-orange-200 dark:border-orange-700 rounded-lg overflow-hidden"
										>
											<button
												type="button"
												onClick={() => toggleToolUse(index)}
												className="w-full px-3 py-2 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 text-left flex items-center justify-between"
											>
												<div className="flex items-center gap-2 flex-1 min-w-0">
													<span className="text-orange-600 dark:text-orange-400 text-xs">
														[{toolIcon} {tool.name}]
													</span>
													{inputDisplay && (
														<span className="text-xs text-gray-600 dark:text-gray-400 truncate">
															{inputDisplay}
														</span>
													)}
												</div>
												<span
													className={`text-orange-500 transition-transform duration-200 ml-2 ${isExpanded ? "rotate-90" : ""}`}
												>
													▶
												</span>
											</button>
											{isExpanded && (
												<div className="px-3 py-2 bg-white dark:bg-gray-900">
													<pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
														{JSON.stringify(tool.input, null, 2)}
													</pre>
												</div>
											)}
										</div>
									);
								})}
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Output/Result Section */}
			{result && (
				<div className="border-t-2 border-gray-200 dark:border-gray-700">
					<button
						type="button"
						onClick={() => setResultExpanded(!resultExpanded)}
						className="w-full px-4 py-2.5 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 hover:from-green-100 hover:to-emerald-100 dark:hover:from-green-900/30 dark:hover:to-emerald-900/30 text-left transition-all flex items-center justify-between"
					>
						<div className="flex items-center gap-2">
							<span className="text-lg">📤</span>
							<span className="text-sm font-semibold text-green-700 dark:text-green-300">
								Output (Subagent Response)
							</span>
							<span className="text-xs text-green-500 dark:text-green-400">
								{result.length} chars
							</span>
						</div>
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={(e) => handleCopySection(e, "result", result)}
								className="text-xs px-1.5 py-0.5 rounded bg-green-200 dark:bg-green-800 text-green-700 dark:text-green-300 hover:bg-green-300 dark:hover:bg-green-700 transition-colors"
							>
								{copiedSection === "result" ? "Copied!" : "Copy"}
							</button>
							<span
								className={`text-green-500 transition-transform duration-200 ${resultExpanded ? "rotate-90" : ""}`}
							>
								▶
							</span>
						</div>
					</button>
					<div
						className={`overflow-hidden transition-all duration-300 ease-in-out ${
							resultExpanded ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
						}`}
					>
						<div className="px-4 py-3 bg-white dark:bg-gray-900 max-h-[750px] overflow-y-auto border-l-4 border-green-400 dark:border-green-600">
							<MarkdownResult content={result} />
						</div>
					</div>
				</div>
			)}

			{/* Stats Footer */}
			{(toolUseResult || (agentId && projectPath && subagentDetail)) && (
				<div className="border-t-2 border-gray-200 dark:border-gray-700 px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50">
					<div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
						{/* Duration - prefer toolUseResult */}
						{(toolUseResult?.totalDurationMs !== undefined &&
							toolUseResult.totalDurationMs !== null) ||
						subagentDetail?.stats.total_duration_ms !== null ? (
							<div className="flex items-center gap-1.5">
								<span>⏱️</span>
								<span className="font-mono">
									{toolUseResult?.totalDurationMs !== undefined &&
									toolUseResult.totalDurationMs !== null
										? (toolUseResult.totalDurationMs / 1000).toFixed(1)
										: subagentDetail?.stats?.total_duration_ms != null
											? (subagentDetail.stats.total_duration_ms / 1000).toFixed(
													1,
												)
											: "0.0"}
									s
								</span>
							</div>
						) : null}

						{/* Tokens - prefer toolUseResult */}
						{(toolUseResult?.totalTokens !== undefined &&
							toolUseResult.totalTokens !== null) ||
						subagentDetail?.stats.total_tokens !== null ? (
							<div className="flex items-center gap-1.5">
								<span>🔢</span>
								<span className="font-mono">
									{toolUseResult?.totalTokens !== undefined &&
									toolUseResult.totalTokens !== null
										? toolUseResult.totalTokens.toLocaleString()
										: subagentDetail?.stats?.total_tokens != null
											? subagentDetail.stats.total_tokens.toLocaleString()
											: "0"}{" "}
									tokens
								</span>
							</div>
						) : null}

						{/* Tool count - prefer toolUseResult */}
						{(toolUseResult?.totalToolUseCount !== undefined &&
							toolUseResult.totalToolUseCount !== null) ||
						toolUses.length > 0 ? (
							<div className="flex items-center gap-1.5">
								<span>🔧</span>
								<span className="font-mono">
									{toolUseResult?.totalToolUseCount !== undefined &&
									toolUseResult.totalToolUseCount !== null
										? toolUseResult.totalToolUseCount
										: toolUses.length}{" "}
									{(toolUseResult?.totalToolUseCount !== undefined &&
									toolUseResult.totalToolUseCount !== null
										? toolUseResult.totalToolUseCount
										: toolUses.length) === 1
										? "tool"
										: "tools"}
								</span>
							</div>
						) : null}
					</div>
				</div>
			)}

			{/* Loading state */}
			{agentId && projectPath && isLoadingSubagent && (
				<div className="border-t-2 border-gray-200 dark:border-gray-700 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
					<span>⏳</span>
					<span>Loading subagent details...</span>
				</div>
			)}

			{/* Note about thinking (fallback for old data) */}
			{!result && !agentId && (
				<div className="px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 text-xs text-yellow-700 dark:text-yellow-300 flex items-center gap-2">
					<span>💭</span>
					<span>
						Subagent is processing... (thinking blocks are not captured in logs)
					</span>
				</div>
			)}
		</div>
	);
};
