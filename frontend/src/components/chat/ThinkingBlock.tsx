import { useState } from "react";

interface ThinkingBlockProps {
	thinking: string;
	defaultExpanded?: boolean;
}

export const ThinkingBlock = ({
	thinking,
	defaultExpanded = false,
}: ThinkingBlockProps) => {
	const [expanded, setExpanded] = useState(defaultExpanded);
	const [copied, setCopied] = useState(false);

	const handleCopy = async (e: React.MouseEvent) => {
		e.stopPropagation();
		await navigator.clipboard.writeText(thinking);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	// Preview of thinking content
	const preview = thinking.slice(0, 100).replace(/\n/g, " ");

	return (
		<div className="my-2 rounded-lg overflow-hidden border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20">
			<button
				type="button"
				onClick={() => setExpanded(!expanded)}
				className="w-full px-3 py-2.5 bg-violet-100 dark:bg-violet-900/40 hover:bg-violet-200 dark:hover:bg-violet-900/60 text-left text-sm font-medium text-violet-800 dark:text-violet-300 flex items-center justify-between transition-all duration-200"
			>
				<div className="flex items-center gap-2">
					<span className="text-base">💭</span>
					<span>Thinking</span>
					{!expanded && (
						<span className="text-xs text-violet-500 dark:text-violet-400 font-normal truncate max-w-[200px]">
							— {preview}...
						</span>
					)}
				</div>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={handleCopy}
						className="text-xs px-1.5 py-0.5 rounded bg-violet-200 dark:bg-violet-800 text-violet-700 dark:text-violet-300 hover:bg-violet-300 dark:hover:bg-violet-700 transition-colors"
					>
						{copied ? "Copied!" : "Copy"}
					</button>
					<span
						className={`text-xs transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
					>
						▶
					</span>
				</div>
			</button>
			<div
				className={`overflow-hidden transition-all duration-300 ease-in-out ${
					expanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
				}`}
			>
				<div className="px-3 py-2 bg-white dark:bg-gray-900 max-h-[450px] overflow-y-auto">
					<pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap font-mono leading-relaxed">
						{thinking}
					</pre>
				</div>
			</div>
		</div>
	);
};
