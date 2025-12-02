import type { Message } from "../../types";
import {
	formatAsJson,
	formatAsMarkdown,
	formatTextOnly,
} from "../../utils/copyFormatters";
import { formatTimeShort } from "../../utils/formatTime";
import { CopyDropdown } from "./CopyDropdown";

interface UserBubbleProps {
	message: Message;
}

export const UserBubble = ({ message }: UserBubbleProps) => {
	const timestamp = formatTimeShort(message.timestamp);

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
						<CopyDropdown
							accentColor="blue"
							options={[
								{
									label: "Copy Text",
									icon: "📋",
									action: async () => {
										await navigator.clipboard.writeText(
											formatTextOnly(message),
										);
									},
								},
								{
									label: "Copy as Markdown",
									icon: "📄",
									action: async () => {
										await navigator.clipboard.writeText(
											formatAsMarkdown(message),
										);
									},
								},
								{
									label: "Copy Full",
									icon: "📦",
									action: async () => {
										await navigator.clipboard.writeText(formatAsJson(message));
									},
								},
							]}
						/>
					</div>
				</div>
				<div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
					U
				</div>
			</div>
		</div>
	);
};
