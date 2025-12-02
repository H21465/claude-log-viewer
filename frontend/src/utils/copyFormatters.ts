import type { Message } from "../types";

/**
 * テキストのみ抽出
 */
export function formatTextOnly(message: Message): string {
	if (message.content_blocks && message.content_blocks.length > 0) {
		return message.content_blocks
			.filter((block) => block.type === "text")
			.map((block) => block.text)
			.filter((text): text is string => text !== undefined)
			.join("\n\n");
	}
	return message.content;
}

/**
 * Markdown形式でフォーマット
 */
export function formatAsMarkdown(message: Message): string {
	const timestamp = new Date(message.timestamp).toLocaleString();

	if (message.role === "user") {
		return `## User

${message.content}

---
*${timestamp}*`;
	}

	// Assistant message
	let result = `## Assistant${message.model ? ` (${message.model})` : ""}\n\n`;

	// テキスト内容を抽出
	const textBlocks = message.content_blocks?.filter(
		(block) => block.type === "text",
	);
	if (textBlocks && textBlocks.length > 0) {
		const textContent = textBlocks
			.map((block) => block.text)
			.filter((text): text is string => text !== undefined)
			.join("\n\n");
		result += `${textContent}\n\n`;
	} else if (message.content) {
		result += `${message.content}\n\n`;
	}

	// Thinking セクション
	const thinkingBlocks = message.content_blocks?.filter(
		(block) => block.type === "thinking",
	);
	if (thinkingBlocks && thinkingBlocks.length > 0) {
		result += "### Thinking\n";
		for (const block of thinkingBlocks) {
			if (block.thinking) {
				const quotedThinking = block.thinking
					.split("\n")
					.map((line) => `> ${line}`)
					.join("\n");
				result += `${quotedThinking}\n\n`;
			}
		}
	}

	// Tool Uses セクション
	const toolUseBlocks = message.content_blocks?.filter(
		(block) => block.type === "tool_use",
	);
	if (toolUseBlocks && toolUseBlocks.length > 0) {
		result += "### Tool Uses\n";
		for (const block of toolUseBlocks) {
			const toolName = block.tool_name || "unknown";
			const summary = generateToolSummary(block.tool_input);
			result += `- **${toolName}**: \`${summary}\`\n`;
		}
		result += "\n";
	}

	result += `---\n*${timestamp}*`;
	return result;
}

/**
 * JSON形式でフォーマット（整形済み）
 */
export function formatAsJson(message: Message): string {
	return JSON.stringify(message, null, 2);
}

/**
 * ツール入力から概要を生成
 */
function generateToolSummary(
	toolInput: Record<string, unknown> | undefined,
): string {
	if (!toolInput) return "";

	// 主要なパラメータを抽出
	const keys = Object.keys(toolInput).filter(
		(k) => !["description", "prompt"].includes(k),
	);
	if (keys.length === 0) return "";

	const firstKey = keys[0];
	const value = toolInput[firstKey];

	if (typeof value === "string") {
		// 長いテキストは切り詰め
		return value.length > 50 ? `${value.substring(0, 50)}...` : value;
	}

	return JSON.stringify(value);
}
