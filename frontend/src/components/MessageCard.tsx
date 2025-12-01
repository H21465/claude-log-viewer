import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { Message } from "../types";

interface MessageCardProps {
	message: Message;
}

export const MessageCard = ({ message }: MessageCardProps) => {
	const [copied, setCopied] = useState(false);

	const handleCopy = async () => {
		await navigator.clipboard.writeText(message.content);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const isUser = message.role === "user";
	const timestamp = new Date(message.timestamp).toLocaleString();

	return (
		<div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
			<div
				className={`max-w-[80%] rounded-lg p-4 ${
					isUser
						? "bg-gray-200 dark:bg-gray-700"
						: "bg-blue-100 dark:bg-blue-900"
				}`}
			>
				<div className="flex items-center justify-between mb-2">
					<span className="text-sm font-semibold">
						{isUser ? "User" : "Assistant"}
						{message.model && ` (${message.model})`}
					</span>
					<button
						onClick={handleCopy}
						className="ml-4 px-2 py-1 text-xs bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
						title="Copy message"
					>
						{copied ? "Copied!" : "Copy"}
					</button>
				</div>

				<div className="prose dark:prose-invert max-w-none">
					<ReactMarkdown
						components={{
							code(props) {
								const { children, className, ...rest } = props;
								const match = /language-(\w+)/.exec(className || "");
								const inline = !match;
								return !inline && match ? (
									<SyntaxHighlighter
										style={
											vscDarkPlus as { [key: string]: React.CSSProperties }
										}
										language={match[1]}
										PreTag="div"
									>
										{String(children).replace(/\n$/, "")}
									</SyntaxHighlighter>
								) : (
									<code className={className} {...rest}>
										{children}
									</code>
								);
							},
						}}
					>
						{message.content}
					</ReactMarkdown>
				</div>

				<div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
					{timestamp}
				</div>
			</div>
		</div>
	);
};
