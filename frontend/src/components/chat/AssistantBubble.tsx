import { useState } from "react";
import { useAppStore } from "../../store";
import type {
	ContentBlock,
	Message,
	ParallelTaskGroup as ParallelTaskGroupType,
	ToolUseResult,
} from "../../types";
import { formatTimeShort } from "../../utils/formatTime";
import { ParallelTaskGroup } from "./ParallelTaskGroup";
import { TaskSubagent } from "./TaskSubagent";
import { TextContent } from "./TextContent";
import { ThinkingBlock } from "./ThinkingBlock";
import { ToolResultCard } from "./ToolResultCard";
import { ToolUseCard } from "./ToolUseCard";

interface AssistantBubbleProps {
	message: Message;
}

// tool_result から toolUseResult 全体を抽出
const extractToolUseResult = (
	resultText: string | undefined,
): ToolUseResult | undefined => {
	if (!resultText) return undefined;
	try {
		const parsed = JSON.parse(resultText);
		if (parsed.agentId || parsed.status || parsed.totalDurationMs) {
			return {
				status: parsed.status,
				agentId: parsed.agentId,
				totalDurationMs: parsed.totalDurationMs,
				totalTokens: parsed.totalTokens,
				totalToolUseCount: parsed.totalToolUseCount,
				prompt: parsed.prompt,
				content: parsed.content,
			};
		}
		return undefined;
	} catch {
		return undefined;
	}
};

// 並列タスク検出: 連続するTask tool_useを並列グループとして扱う
const detectParallelTasks = (
	blocks: ContentBlock[],
): ParallelTaskGroupType[] => {
	const groups: ParallelTaskGroupType[] = [];
	let currentGroup: ContentBlock[] = [];
	let startIndex = -1;

	blocks.forEach((block, index) => {
		if (block.type === "tool_use" && block.tool_name === "Task") {
			if (currentGroup.length === 0) {
				startIndex = index;
			}
			currentGroup.push(block);
		} else {
			if (currentGroup.length > 1) {
				groups.push({
					tasks: currentGroup,
					startIndex,
					endIndex: index - 1,
				});
			}
			currentGroup = [];
			startIndex = -1;
		}
	});

	// 最後のグループを処理
	if (currentGroup.length > 1) {
		groups.push({
			tasks: currentGroup,
			startIndex,
			endIndex: blocks.length - 1,
		});
	}

	return groups;
};

// モデル名を短くする
const shortenModelName = (model: string | null): string => {
	if (!model) return "";
	if (model.includes("opus")) return "Opus";
	if (model.includes("sonnet")) return "Sonnet";
	if (model.includes("haiku")) return "Haiku";
	return model.split("-")[0];
};

export const AssistantBubble = ({ message }: AssistantBubbleProps) => {
	const [copied, setCopied] = useState(false);
	const { selectedProject, expandThinkingByDefault } = useAppStore();
	const timestamp = formatTimeShort(message.timestamp);

	const handleCopy = async () => {
		const textToCopy = message.content_blocks
			? message.content_blocks
					.filter((block) => block.type === "text" && block.text)
					.map((block) => block.text)
					.join("\n\n")
			: message.content;

		await navigator.clipboard.writeText(textToCopy);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	// 並列タスクグループを検出
	const parallelGroups = message.content_blocks
		? detectParallelTasks(message.content_blocks)
		: [];

	// 並列グループに含まれるブロックのインデックスを記録
	const groupedIndices = new Set<number>();
	for (const group of parallelGroups) {
		for (let i = group.startIndex; i <= group.endIndex; i++) {
			groupedIndices.add(i);
		}
	}

	// tool_resultをMapに変換
	const toolResults = new Map<string, string>();
	const taskToolUseIds = new Set<string>();

	if (message.content_blocks) {
		for (const block of message.content_blocks) {
			if (block.type === "tool_result" && block.tool_use_id && block.text) {
				toolResults.set(block.tool_use_id, block.text);
			}
			if (
				block.type === "tool_use" &&
				block.tool_name === "Task" &&
				block.tool_use_id
			) {
				taskToolUseIds.add(block.tool_use_id);
			}
		}
	}

	const modelName = shortenModelName(message.model);

	return (
		<div className="flex justify-start mb-3 group">
			<div className="flex items-start gap-2 max-w-[85%]">
				<div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
					C
				</div>
				<div className="flex flex-col">
					<div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700">
						{/* Model badge and metadata */}
						{(modelName ||
							message.is_sidechain ||
							message.uuid ||
							message.parent_uuid) && (
							<div className="mb-2 flex items-center gap-2 flex-wrap">
								{modelName && (
									<span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300">
										{modelName}
									</span>
								)}
								{message.is_sidechain && (
									<span className="px-1.5 py-0.5 text-xs font-medium rounded bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
										Sidechain
									</span>
								)}
								{message.uuid && (
									<span
										className="text-xs text-gray-400 dark:text-gray-500 font-mono"
										title={message.uuid}
									>
										{message.uuid.substring(0, 8)}
									</span>
								)}
								{message.parent_uuid && (
									<a
										href={`#message-${message.parent_uuid}`}
										className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
										title={`Parent: ${message.parent_uuid}`}
									>
										↑ Parent
									</a>
								)}
							</div>
						)}

						{/* Content */}
						{message.content_blocks && message.content_blocks.length > 0 ? (
							<div className="space-y-3">
								{message.content_blocks.map((block, index) => {
									const key = `${message.id}-${block.type}-${index}`;

									// 並列グループの最初のブロックの場合
									const currentGroup = parallelGroups.find(
										(g) => g.startIndex === index,
									);
									if (currentGroup) {
										const groupKey = currentGroup.tasks
											.map((t) => t.tool_use_id)
											.filter(Boolean)
											.join("-");
										return (
											<ParallelTaskGroup
												key={`group-${groupKey || index}`}
												tasks={currentGroup.tasks}
												results={toolResults}
												projectPath={selectedProject?.path}
											/>
										);
									}

									if (groupedIndices.has(index)) {
										return null;
									}

									if (block.type === "thinking" && block.thinking) {
										return (
											<ThinkingBlock
												key={key}
												thinking={block.thinking}
												defaultExpanded={expandThinkingByDefault}
											/>
										);
									}
									if (block.type === "text" && block.text) {
										return <TextContent key={key} text={block.text} />;
									}
									if (
										block.type === "tool_use" &&
										block.tool_name &&
										block.tool_input &&
										block.tool_use_id
									) {
										if (
											block.tool_name === "Task" &&
											block.tool_input.subagent_type
										) {
											const result = toolResults.get(block.tool_use_id);
											const toolUseResult = extractToolUseResult(result);
											return (
												<TaskSubagent
													key={key}
													toolUseId={block.tool_use_id}
													subagentType={
														block.tool_input.subagent_type as string
													}
													description={
														(block.tool_input.description as string) || ""
													}
													prompt={(block.tool_input.prompt as string) || ""}
													result={result}
													agentId={toolUseResult?.agentId}
													projectPath={selectedProject?.path}
													toolUseResult={toolUseResult}
												/>
											);
										}

										return (
											<ToolUseCard
												key={key}
												toolName={block.tool_name}
												toolInput={block.tool_input}
												toolUseId={block.tool_use_id}
											/>
										);
									}
									if (
										block.type === "tool_result" &&
										block.tool_use_id &&
										block.text
									) {
										if (taskToolUseIds.has(block.tool_use_id)) {
											return null;
										}

										const isError =
											block.text.toLowerCase().includes("error") ||
											block.text.toLowerCase().includes("failed") ||
											block.text.toLowerCase().includes("exception");
										return (
											<ToolResultCard
												key={key}
												toolUseId={block.tool_use_id}
												result={block.text}
												isError={isError}
											/>
										);
									}
									return null;
								})}
							</div>
						) : (
							<TextContent text={message.content} />
						)}
					</div>

					{/* Timestamp and actions */}
					<div className="flex items-center gap-2 mt-1 ml-1 text-xs text-gray-500 dark:text-gray-400">
						<span>{timestamp}</span>
						<button
							type="button"
							onClick={handleCopy}
							className="opacity-0 group-hover:opacity-100 hover:text-orange-500 transition-opacity"
							title="Copy"
						>
							{copied ? "Copied" : "Copy"}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};
