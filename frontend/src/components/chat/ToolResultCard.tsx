import { useState } from "react";

interface ToolResultCardProps {
	toolUseId: string;
	result: string;
	isError?: boolean;
}

export const ToolResultCard = ({
	toolUseId: _toolUseId,
	result,
	isError = false,
}: ToolResultCardProps) => {
	const [expanded, setExpanded] = useState(false);
	const [copied, setCopied] = useState(false);

	const handleCopy = async () => {
		await navigator.clipboard.writeText(result);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	// Count lines for display
	const lineCount = result.split("\n").length;
	const charCount = result.length;

	// Collapse if more than 300 chars or 10 lines
	const isLongResult = charCount > 300 || lineCount > 10;
	const shouldCollapse = isLongResult && !expanded;

	// Display truncated result
	const displayResult = shouldCollapse
		? result.split("\n").slice(0, 6).join("\n") + (lineCount > 6 ? "\n..." : "")
		: result;

	return (
		<div
			className={`my-2 rounded-lg overflow-hidden border ${
				isError
					? "border-red-200 dark:border-red-800"
					: "border-gray-200 dark:border-gray-700"
			}`}
		>
			{/* Header */}
			<div
				className={`px-3 py-2 flex items-center justify-between ${
					isError
						? "bg-red-50 dark:bg-red-900/20"
						: "bg-gray-50 dark:bg-gray-800"
				}`}
			>
				<div className="flex items-center gap-2">
					{isError ? (
						<span className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
							<svg
								className="w-3 h-3 text-red-500"
								fill="currentColor"
								viewBox="0 0 20 20"
							>
								<path
									fillRule="evenodd"
									d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
									clipRule="evenodd"
								/>
							</svg>
						</span>
					) : (
						<span className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
							<svg
								className="w-3 h-3 text-green-500"
								fill="currentColor"
								viewBox="0 0 20 20"
							>
								<path
									fillRule="evenodd"
									d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
									clipRule="evenodd"
								/>
							</svg>
						</span>
					)}
					<span
						className={`text-xs font-medium ${isError ? "text-red-700 dark:text-red-300" : "text-gray-600 dark:text-gray-400"}`}
					>
						{isError ? "Error" : "Result"}
					</span>
					<span className="text-xs text-gray-400 dark:text-gray-500">
						{lineCount} line{lineCount !== 1 ? "s" : ""}
					</span>
				</div>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={handleCopy}
						className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400 transition-colors"
					>
						{copied ? "Copied!" : "Copy"}
					</button>
					{isLongResult && (
						<button
							type="button"
							onClick={() => setExpanded(!expanded)}
							className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400 transition-colors"
						>
							{expanded ? "Collapse" : "Expand"}
						</button>
					)}
				</div>
			</div>

			{/* Result Content */}
			<div
				className={`overflow-hidden transition-all duration-300 ease-in-out ${
					shouldCollapse ? "max-h-[200px]" : "max-h-[600px]"
				}`}
			>
				<div
					className={`px-3 py-2 overflow-auto ${isError ? "bg-red-50/50 dark:bg-red-900/10" : "bg-white dark:bg-gray-900"}`}
				>
					<pre
						className={`text-xs whitespace-pre-wrap font-mono leading-relaxed ${isError ? "text-red-700 dark:text-red-300" : "text-gray-700 dark:text-gray-300"}`}
					>
						{displayResult}
					</pre>
				</div>
			</div>
		</div>
	);
};
