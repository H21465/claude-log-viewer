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
	const [copied, setCopied] = useState(false);
	const config = getToolConfig(toolName);
	const summary = getInputSummary(toolName, toolInput);

	const formatInput = (input: ToolInput): string => {
		return JSON.stringify(input, null, 2);
	};

	const handleCopy = async (e: React.MouseEvent) => {
		e.stopPropagation();
		const text = `${toolName}\n${formatInput(toolInput)}`;
		await navigator.clipboard.writeText(text);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<div className="my-2 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
			{/* Header */}
			<button
				type="button"
				onClick={() => setExpanded(!expanded)}
				className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 text-left transition-colors duration-200"
			>
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<span className="text-base">{config.icon}</span>
						<span className="text-sm font-medium text-gray-800 dark:text-gray-200">
							{toolName}
						</span>
						{summary && (
							<code className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded font-mono truncate max-w-[200px]">
								{summary}
							</code>
						)}
					</div>
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={handleCopy}
							className="text-xs px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
						>
							{copied ? "Copied!" : "Copy"}
						</button>
						<span
							className={`text-xs text-gray-400 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
						>
							▶
						</span>
					</div>
				</div>
			</button>

			{/* Input Parameters */}
			<div
				className={`overflow-hidden transition-all duration-300 ease-in-out ${
					expanded ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
				}`}
			>
				<div className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700">
					<div className="text-xs text-gray-500 dark:text-gray-500 mb-1">
						ID: {toolUseId}
					</div>
					<pre className="text-xs text-gray-700 dark:text-gray-300 overflow-auto whitespace-pre-wrap font-mono max-h-[300px]">
						{formatInput(toolInput)}
					</pre>
				</div>
			</div>
		</div>
	);
};
