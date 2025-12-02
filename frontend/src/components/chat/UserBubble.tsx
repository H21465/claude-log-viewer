import type { Message } from "../../types";
import { formatTimeShort } from "../../utils/formatTime";

interface UserBubbleProps {
	message: Message;
}

export const UserBubble = ({ message }: UserBubbleProps) => {
	const timestamp = formatTimeShort(message.timestamp);

	return (
		<div className="flex justify-end mb-3">
			<div className="flex items-end gap-2 max-w-[85%]">
				<div className="flex flex-col items-end">
					<div className="rounded-2xl rounded-br-sm px-4 py-2 bg-blue-500 text-white shadow-sm">
						<div className="whitespace-pre-wrap break-words text-sm select-text">
							{message.content}
						</div>
					</div>
					<div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
						<span>{timestamp}</span>
					</div>
				</div>
				<div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
					U
				</div>
			</div>
		</div>
	);
};
