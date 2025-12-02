import type { ContentBlock, Message } from "../types";
import type { EventType, TimelineEvent } from "../types/timeline";

/**
 * メッセージ配列をタイムラインイベントに変換
 */
export function convertToTimelineEvents(messages: Message[]): TimelineEvent[] {
	const events: TimelineEvent[] = [];
	// 直前のtool_useを追跡（tool_resultの対応付け用）
	const lastToolUseByToolUseId: Map<string, ContentBlock> = new Map();

	for (const message of messages) {
		if (message.role === "user") {
			// ユーザーメッセージの処理
			// content_blocksにtool_resultがある場合は許可/拒否イベント
			const hasToolResult = message.content_blocks?.some(
				(block) => block.type === "tool_result",
			);

			if (hasToolResult && message.content_blocks) {
				// tool_resultを持つユーザーメッセージ = 許可/拒否
				for (let i = 0; i < message.content_blocks.length; i++) {
					const block = message.content_blocks[i];
					if (block.type === "tool_result") {
						const prevToolUse = block.tool_use_id
							? lastToolUseByToolUseId.get(block.tool_use_id)
							: null;
						const isRejected = isRejectionResultText(block.text);
						const toolName = prevToolUse?.tool_name;

						// Taskツールの結果はAGENT_RESULTとして扱う
						if (toolName === "Task") {
							events.push({
								id: `${message.id}-result-${i}`,
								type: "AGENT_RESULT",
								timestamp: message.timestamp,
								messageId: message.id,
								blockIndex: i,
								content: block.text,
								toolUseId: block.tool_use_id,
								toolName: toolName,
								agentId: extractAgentIdFromResult(block.text),
							});
						} else {
							events.push({
								id: `${message.id}-permission-${i}`,
								type: isRejected ? "USER_REJECTION" : "TOOL_RESULT",
								timestamp: message.timestamp,
								messageId: message.id,
								blockIndex: i,
								content: block.text,
								toolUseId: block.tool_use_id,
								permissionType: toolName,
								isAllowed: !isRejected,
								toolName: toolName,
							});
						}
					}
				}
			} else if (message.content && message.content.trim()) {
				// 通常のユーザーメッセージ
				events.push({
					id: `${message.id}-user`,
					type: "USER_MESSAGE",
					timestamp: message.timestamp,
					messageId: message.id,
					content: message.content,
				});
			}
		} else if (message.role === "assistant") {
			// アシスタントメッセージの処理
			if (message.content_blocks && message.content_blocks.length > 0) {
				// ContentBlocksを順次処理
				let pendingToolUse: ContentBlock | null = null;

				for (let i = 0; i < message.content_blocks.length; i++) {
					const block = message.content_blocks[i];
					const event = convertContentBlockToEvent(
						message,
						block,
						i,
						pendingToolUse,
					);

					if (event) {
						// 並列Taskの検出と統合
						if (event.type === "AGENT_SPAWN") {
							// 連続するAGENT_SPAWNを検出してPARALLEL_GROUPにまとめる
							const lastEvent = events[events.length - 1];
							if (lastEvent?.type === "PARALLEL_GROUP") {
								lastEvent.parallelTasks?.push(event);
								continue;
							}
							// 次のブロックも確認
							const nextBlock = message.content_blocks[i + 1];
							if (
								nextBlock?.type === "tool_use" &&
								nextBlock.tool_name === "Task"
							) {
								// 並列グループ開始
								events.push({
									id: `${message.id}-parallel-${i}`,
									type: "PARALLEL_GROUP",
									timestamp: message.timestamp,
									messageId: message.id,
									blockIndex: i,
									parallelTasks: [event],
								});
								continue;
							}
						}
						events.push(event);
					}

					// tool_useを保持（次のtool_resultで使用）
					if (block.type === "tool_use") {
						pendingToolUse = block;
						// tool_use_idでも追跡（別メッセージのtool_result用）
						if (block.tool_use_id) {
							lastToolUseByToolUseId.set(block.tool_use_id, block);
						}
					} else if (block.type === "tool_result") {
						pendingToolUse = null;
					}
				}
			} else if (message.content) {
				// ContentBlocksがない場合はtextとして扱う
				events.push({
					id: `${message.id}-response`,
					type: "AGENT_RESPONSE",
					timestamp: message.timestamp,
					messageId: message.id,
					content: message.content,
					model: message.model || undefined,
				});
			}
		}
	}

	return events;
}

/**
 * ContentBlockをTimelineEventに変換
 */
function convertContentBlockToEvent(
	message: Message,
	block: ContentBlock,
	blockIndex: number,
	prevToolUse: ContentBlock | null,
): TimelineEvent | null {
	const baseEvent = {
		timestamp: message.timestamp,
		messageId: message.id,
		blockIndex,
	};

	switch (block.type) {
		case "thinking":
			return {
				...baseEvent,
				id: `${message.id}-thinking-${blockIndex}`,
				type: "THINKING",
				content: block.thinking || "",
			};

		case "text":
			return {
				...baseEvent,
				id: `${message.id}-text-${blockIndex}`,
				type: "AGENT_RESPONSE",
				content: block.text || "",
				model: message.model || undefined,
			};

		case "tool_use": {
			const isTaskTool = block.tool_name === "Task";
			return {
				...baseEvent,
				id: `${message.id}-tool-${blockIndex}`,
				type: isTaskTool ? "AGENT_SPAWN" : "TOOL_USE",
				toolName: block.tool_name,
				toolInput: block.tool_input as Record<string, unknown> | undefined,
				toolUseId: block.tool_use_id,
				agentType: isTaskTool ? block.tool_input?.subagent_type : undefined,
				agentId: isTaskTool
					? ((block.tool_input as Record<string, unknown> | undefined)
							?.agent_id as string | undefined)
					: undefined,
				content: isTaskTool ? block.tool_input?.prompt : undefined,
			};
		}

		case "tool_result": {
			const isTaskResult = prevToolUse?.tool_name === "Task";
			return {
				...baseEvent,
				id: `${message.id}-result-${blockIndex}`,
				type: isTaskResult ? "AGENT_RESULT" : "TOOL_RESULT",
				content: block.text,
				toolUseId: prevToolUse?.tool_use_id,
				toolName: prevToolUse?.tool_name,
				agentId: isTaskResult
					? extractAgentIdFromResult(block.text)
					: undefined,
			};
		}

		default:
			return null;
	}
}

/**
 * AGENT_RESULT (Task tool result) からagentIdを抽出
 */
function extractAgentIdFromResult(
	content: string | undefined,
): string | undefined {
	if (!content) return undefined;
	try {
		// JSON形式の場合
		const parsed = JSON.parse(content);
		if (parsed.agentId) return parsed.agentId;
	} catch {
		// JSONでない場合、パターンマッチを試す
		// "agentId": "8d19d637" のようなパターン
		const match = content.match(
			/["']?agentId["']?\s*[:=]\s*["']([a-f0-9-]+)["']/i,
		);
		if (match) return match[1];
	}
	return undefined;
}

/**
 * tool_resultのテキストが拒否かどうか判定
 */
function isRejectionResultText(text: string | undefined): boolean {
	if (!text) return false;
	const lower = text.toLowerCase();
	return (
		lower.includes("user rejected") ||
		lower.includes("permission denied") ||
		lower.includes("user did not approve") ||
		lower.includes("cancelled") ||
		lower.includes("aborted")
	);
}

/**
 * イベントタイプ別のカウントを取得
 */
export function countEventTypes(
	events: TimelineEvent[],
): Record<EventType, number> {
	const counts: Record<EventType, number> = {
		USER_MESSAGE: 0,
		USER_PERMISSION: 0,
		USER_REJECTION: 0,
		THINKING: 0,
		AGENT_RESPONSE: 0,
		TOOL_USE: 0,
		TOOL_RESULT: 0,
		AGENT_SPAWN: 0,
		AGENT_RESULT: 0,
		PARALLEL_GROUP: 0,
	};

	for (const event of events) {
		counts[event.type]++;
	}

	return counts;
}
