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

	// Preview of thinking content
	const preview = thinking.slice(0, 100).replace(/\n/g, " ");

	return (
		<div className="my-2 rounded-lg overflow-hidden border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20">
			<div className="px-3 py-2.5 bg-violet-100 dark:bg-violet-900/40 text-sm font-medium text-violet-800 dark:text-violet-300 flex items-center justify-between">
				<div className="flex items-center gap-2 flex-1 min-w-0 select-text">
					<span className="text-base flex-shrink-0">💭</span>
					<span className="flex-shrink-0">Thinking</span>
					{!expanded && (
						<span className="text-xs text-violet-500 dark:text-violet-400 font-normal truncate">
							— {preview}...
						</span>
					)}
				</div>
				<button
					type="button"
					onClick={() => setExpanded(!expanded)}
					className="text-xs px-2 py-1 rounded hover:bg-violet-200 dark:hover:bg-violet-800 transition-colors flex-shrink-0 ml-2"
				>
					<span
						className={`transition-transform duration-200 inline-block ${expanded ? "rotate-90" : ""}`}
					>
						▶
					</span>
				</button>
			</div>
			<div
				className={`overflow-hidden transition-all duration-300 ease-in-out ${
					expanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
				}`}
			>
				<div className="px-3 py-2 bg-white dark:bg-gray-900 max-h-[450px] overflow-y-auto">
					<pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap font-mono leading-relaxed select-text">
						{thinking}
					</pre>
				</div>
			</div>
		</div>
	);
};
