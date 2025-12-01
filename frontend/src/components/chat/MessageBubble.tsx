import type { Message } from "../../types";
import { AssistantBubble } from "./AssistantBubble";
import { UserBubble } from "./UserBubble";

interface MessageBubbleProps {
	message: Message;
}

export const MessageBubble = ({ message }: MessageBubbleProps) => {
	if (message.role === "user") {
		return <UserBubble message={message} />;
	}

	return <AssistantBubble message={message} />;
};
