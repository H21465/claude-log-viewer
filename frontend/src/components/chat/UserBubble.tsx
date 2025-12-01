import { useState } from "react";
import type { Message } from "../../types";

interface UserBubbleProps {
	message: Message;
}

export const UserBubble = ({ message }: UserBubbleProps) => {
	const [copied, setCopied] = useState(false);
	const timestamp = new Date(message.timestamp).toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit",
	});

	const handleCopy = async () => {
		await navigator.clipboard.writeText(message.content);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<div className="flex justify-end mb-3 group">
			<div className="flex items-end gap-2 max-w-[85%]">
				<div className="flex flex-col items-end">
					<div className="rounded-2xl rounded-br-sm px-4 py-2 bg-blue-500 text-white shadow-sm">
						<div className="whitespace-pre-wrap break-words text-sm">
							{message.content}
						</div>
					</div>
					<div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
						<span>{timestamp}</span>
						<button
							type="button"
							onClick={handleCopy}
							className="opacity-0 group-hover:opacity-100 hover:text-blue-500 transition-opacity"
							title="Copy"
						>
							{copied ? "Copied" : "Copy"}
						</button>
					</div>
				</div>
				<div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
					U
				</div>
			</div>
		</div>
	);
};
