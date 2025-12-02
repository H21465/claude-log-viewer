import { useState } from "react";
import type { ToolInput } from "../../types";

interface ToolUseCardProps {
	toolName: string;
	toolInput: ToolInput;
	toolUseId: string;
}

// Tool configurations
const toolConfig: Record<string, { icon: string; color: string }> = {
	task: { icon: "🔀", color: "blue" },
	bash: { icon: "💻", color: "slate" },
	read: { icon: "📖", color: "emerald" },
	write: { icon: "✏️", color: "amber" },
	edit: { icon: "📝", color: "amber" },
	grep: { icon: "🔍", color: "teal" },
	glob: { icon: "🗂️", color: "indigo" },
	webfetch: { icon: "🌐", color: "sky" },
	websearch: { icon: "🔎", color: "cyan" },
	todowrite: { icon: "✅", color: "lime" },
};

const getToolConfig = (name: string) => {
	const lowerName = name.toLowerCase();
	return toolConfig[lowerName] || { icon: "🔧", color: "gray" };
};

// Get summary of tool input
const getInputSummary = (name: string, input: ToolInput): string => {
	const lowerName = name.toLowerCase();
	if (lowerName === "bash" && input.command) {
		return (
			String(input.command).slice(0, 50) +
			(String(input.command).length > 50 ? "..." : "")
		);
	}
	if ((lowerName === "read" || lowerName === "write") && input.file_path) {
		const path = String(input.file_path);
		return path.split("/").pop() || path;
	}
	if (lowerName === "grep" && input.pattern) {
		return `/${input.pattern}/`;
	}
	if (lowerName === "glob" && input.pattern) {
		return String(input.pattern);
	}
	return "";
};

export const ToolUseCard = ({
	toolName,
	toolInput,
	toolUseId,
}: ToolUseCardProps) => {
	const [expanded, setExpanded] = useState(false);
	const config = getToolConfig(toolName);
	const summary = getInputSummary(toolName, toolInput);

	const formatInput = (input: ToolInput): string => {
		return JSON.stringify(input, null, 2);
	};

	return (
		<div className="my-2 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
			{/* Header */}
			<div className="px-3 py-2.5 bg-gray-50 dark:bg-gray-800 flex items-center justify-between">
				<div className="flex items-center gap-2 flex-1 min-w-0 select-text">
					<span className="text-base flex-shrink-0">{config.icon}</span>
					<span className="text-sm font-medium text-gray-800 dark:text-gray-200 flex-shrink-0">
						{toolName}
					</span>
					{summary && (
						<code className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded font-mono truncate">
							{summary}
						</code>
					)}
				</div>
				<button
					type="button"
					onClick={() => setExpanded(!expanded)}
					className="text-xs px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex-shrink-0 ml-2"
				>
					<span
						className={`text-gray-400 transition-transform duration-200 inline-block ${expanded ? "rotate-90" : ""}`}
					>
						▶
					</span>
				</button>
			</div>

			{/* Input Parameters */}
			<div
				className={`overflow-hidden transition-all duration-300 ease-in-out ${
					expanded ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
				}`}
			>
				<div className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700">
					<div className="text-xs text-gray-500 dark:text-gray-500 mb-1 select-text">
						ID: {toolUseId}
					</div>
					<pre className="text-xs text-gray-700 dark:text-gray-300 overflow-auto whitespace-pre-wrap font-mono max-h-[300px] select-text">
						{formatInput(toolInput)}
					</pre>
				</div>
			</div>
		</div>
	);
};
