import { useState } from "react";
import { useAddProject, useProjects, useSyncProject } from "../hooks/useApi";
import { useAppStore } from "../store";

export const ProjectList = () => {
	const { data: projects, isLoading } = useProjects();
	const addProject = useAddProject();
	const syncProject = useSyncProject();
	const {
		selectedProjectId,
		setSelectedProjectId,
		setSelectedProject,
		setOverlayPanel,
	} = useAppStore();
	const [showAddDialog, setShowAddDialog] = useState(false);
	const [newProjectPath, setNewProjectPath] = useState("");
	const [searchQuery, setSearchQuery] = useState("");

	const handleAddProject = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newProjectPath.trim()) return;

		try {
			await addProject.mutateAsync(newProjectPath);
			setNewProjectPath("");
			setShowAddDialog(false);
		} catch (error) {
			console.error("Failed to add project:", error);
		}
	};

	const handleSync = async (projectId: number, e: React.MouseEvent) => {
		e.stopPropagation();
		try {
			await syncProject.mutateAsync(projectId);
		} catch (error) {
			console.error("Failed to sync project:", error);
		}
	};

	const filteredProjects =
		projects?.filter(
			(project) =>
				project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				project.path.toLowerCase().includes(searchQuery.toLowerCase()),
		) || [];

	if (isLoading) {
		return (
			<div className="flex flex-col h-full">
				<div className="p-4 border-b border-gray-200 dark:border-gray-700">
					<div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
				</div>
				<div className="p-4 space-y-3">
					{[1, 2, 3].map((i) => (
						<div key={i} className="space-y-2">
							<div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
							<div className="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
						</div>
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col h-full">
			<div className="p-4 border-b border-gray-200 dark:border-gray-700">
				<div className="flex items-center justify-between mb-2">
					<h2 className="text-lg font-bold">Projects</h2>
					<button
						onClick={() => setShowAddDialog(true)}
						className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
						title="Add project"
					>
						+
					</button>
				</div>
				<input
					type="text"
					placeholder="Search projects..."
					className="w-full mt-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
				/>
			</div>

			<div className="flex-1 overflow-y-auto">
				{filteredProjects.length === 0 ? (
					<div className="flex flex-col items-center justify-center h-full p-4 text-center">
						<svg
							className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3"
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={1.5}
								d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
							/>
						</svg>
						<p className="text-gray-500 dark:text-gray-400 text-sm">
							No projects found
						</p>
						<p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
							Add a project to get started
						</p>
					</div>
				) : (
					filteredProjects.map((project) => (
						<div
							key={project.id}
							onClick={() => {
								setSelectedProjectId(project.id);
								setSelectedProject(project);
								setOverlayPanel("conversations");
							}}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									setSelectedProjectId(project.id);
									setSelectedProject(project);
									setOverlayPanel("conversations");
								}
							}}
							role="button"
							tabIndex={0}
							className={`p-4 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
								selectedProjectId === project.id
									? "bg-blue-50 dark:bg-blue-900 border-l-4 border-l-blue-500"
									: ""
							}`}
						>
							<div className="flex items-start justify-between">
								<div className="flex-1 min-w-0">
									<h3 className="font-semibold truncate">{project.name}</h3>
									<p className="text-sm text-gray-600 dark:text-gray-400 truncate">
										{project.path}
									</p>
									{project.conversation_count !== undefined && (
										<div className="mt-1 text-xs text-gray-500 dark:text-gray-500">
											{project.conversation_count} conversations
											{project.message_count !== undefined && (
												<> · {project.message_count} messages</>
											)}
										</div>
									)}
									{project.last_activity && (
										<div className="text-xs text-gray-500 dark:text-gray-500">
											Last:{" "}
											{new Date(project.last_activity).toLocaleDateString()}
										</div>
									)}
								</div>
								<button
									onClick={(e) => handleSync(project.id, e)}
									disabled={syncProject.isPending}
									className="ml-2 px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded disabled:opacity-50 transition-colors"
									title="Sync project"
								>
									{syncProject.isPending ? "..." : "↻"}
								</button>
							</div>
						</div>
					))
				)}
			</div>

			{showAddDialog && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 max-w-full mx-4">
						<h3 className="text-lg font-bold mb-4">Add Project</h3>
						<form onSubmit={handleAddProject}>
							<input
								type="text"
								placeholder="Project path..."
								className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
								value={newProjectPath}
								onChange={(e) => setNewProjectPath(e.target.value)}
								autoFocus
							/>
							<div className="flex gap-2 mt-4">
								<button
									type="submit"
									disabled={addProject.isPending}
									className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded disabled:opacity-50 transition-colors"
								>
									{addProject.isPending ? "Adding..." : "Add"}
								</button>
								<button
									type="button"
									onClick={() => setShowAddDialog(false)}
									className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition-colors"
								>
									Cancel
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
};
