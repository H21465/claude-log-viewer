import type { ContentBlock, ToolUseResult } from "../../types";
import { TaskSubagent } from "./TaskSubagent";
import { ToolUseCard } from "./ToolUseCard";

interface ParallelTaskGroupProps {
	tasks: ContentBlock[];
	results?: Map<string, string>;
	projectPath?: string;
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

export const ParallelTaskGroup = ({
	tasks,
	results,
	projectPath,
}: ParallelTaskGroupProps) => {
	if (tasks.length === 0) {
		return null;
	}

	if (tasks.length === 1) {
		// 単一タスクの場合は通常のToolUseCardまたはTaskSubagentを表示
		const task = tasks[0];
		if (task.tool_name && task.tool_input && task.tool_use_id) {
			// Task toolの場合はTaskSubagentを使用
			if (task.tool_name === "Task" && task.tool_input.subagent_type) {
				const result = results?.get(task.tool_use_id);
				const toolUseResult = extractToolUseResult(result);
				return (
					<TaskSubagent
						toolUseId={task.tool_use_id}
						subagentType={task.tool_input.subagent_type as string}
						description={(task.tool_input.description as string) || ""}
						prompt={(task.tool_input.prompt as string) || ""}
						result={result}
						agentId={toolUseResult?.agentId}
						projectPath={projectPath}
						toolUseResult={toolUseResult}
					/>
				);
			}

			// その他のツールは通常のToolUseCardを使用
			return (
				<ToolUseCard
					toolName={task.tool_name}
					toolInput={task.tool_input}
					toolUseId={task.tool_use_id}
				/>
			);
		}
		return null;
	}

	// 並列タスクグループの表示
	return (
		<div className="my-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10 p-3">
			<div className="flex items-center gap-2 mb-3">
				<div className="flex items-center gap-1.5">
					<svg
						className="w-4 h-4 text-blue-500"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M4 6h16M4 12h16m-7 6h7"
						/>
					</svg>
					<span className="text-sm font-medium text-blue-700 dark:text-blue-300">
						Parallel Execution
					</span>
				</div>
				<span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 text-xs font-medium rounded-full">
					{tasks.length} tasks
				</span>
			</div>
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
				{tasks.map((task, index) => {
					if (task.tool_name && task.tool_input && task.tool_use_id) {
						// Task toolの場合はTaskSubagentを使用
						if (task.tool_name === "Task" && task.tool_input.subagent_type) {
							const result = results?.get(task.tool_use_id);
							const toolUseResult = extractToolUseResult(result);
							return (
								<TaskSubagent
									key={task.tool_use_id || index}
									toolUseId={task.tool_use_id}
									subagentType={task.tool_input.subagent_type as string}
									description={(task.tool_input.description as string) || ""}
									prompt={(task.tool_input.prompt as string) || ""}
									result={result}
									agentId={toolUseResult?.agentId}
									projectPath={projectPath}
									toolUseResult={toolUseResult}
								/>
							);
						}

						// その他のツールは通常のToolUseCardを使用
						return (
							<ToolUseCard
								key={task.tool_use_id || index}
								toolName={task.tool_name}
								toolInput={task.tool_input}
								toolUseId={task.tool_use_id}
							/>
						);
					}
					return null;
				})}
			</div>
		</div>
	);
};
