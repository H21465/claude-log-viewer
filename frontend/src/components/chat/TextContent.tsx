import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

interface TextContentProps {
	text: string;
}

export const TextContent = ({ text }: TextContentProps) => {
	return (
		<div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent prose-code:text-orange-600 dark:prose-code:text-orange-400 prose-code:before:content-none prose-code:after:content-none">
			<ReactMarkdown
				components={{
					code(props) {
						const { children, className, ...rest } = props;
						const match = /language-(\w+)/.exec(className || "");
						const inline = !match;
						return !inline && match ? (
							<SyntaxHighlighter
								style={vscDarkPlus as { [key: string]: React.CSSProperties }}
								language={match[1]}
								PreTag="div"
								customStyle={{
									margin: 0,
									borderRadius: "0.5rem",
									fontSize: "0.75rem",
								}}
							>
								{String(children).replace(/\n$/, "")}
							</SyntaxHighlighter>
						) : (
							<code
								className={`px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-sm ${className || ""}`}
								{...rest}
							>
								{children}
							</code>
						);
					},
					a(props) {
						return (
							<a
								{...props}
								className="text-orange-600 dark:text-orange-400 hover:underline"
								target="_blank"
								rel="noopener noreferrer"
							/>
						);
					},
				}}
			>
				{text}
			</ReactMarkdown>
		</div>
	);
};
