import { useEffect, useRef, useState } from "react";

export interface CopyOption {
	label: string;
	icon: string; // 絵文字
	action: () => Promise<void>;
}

interface CopyDropdownProps {
	options: CopyOption[];
	accentColor: "blue" | "orange";
}

export const CopyDropdown = ({ options, accentColor }: CopyDropdownProps) => {
	const [isOpen, setIsOpen] = useState(false);
	const [copied, setCopied] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	const accentClass =
		accentColor === "blue"
			? "hover:text-blue-500 dark:hover:text-blue-400"
			: "hover:text-orange-500 dark:hover:text-orange-400";

	// ドロップダウン外クリックで閉じる
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
			}
		};

		if (isOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isOpen]);

	const handleOptionClick = async (option: CopyOption) => {
		try {
			await option.action();
			setCopied(true);
			setIsOpen(false);
			setTimeout(() => setCopied(false), 2000);
		} catch (error) {
			console.error("Copy action failed:", error);
			setIsOpen(false);
		}
	};

	return (
		<div className="relative" ref={dropdownRef}>
			<button
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				className={`text-gray-400 dark:text-gray-500 ${accentClass} transition-colors`}
				title="Copy options"
			>
				{copied ? "Copied!" : "Copy ▼"}
			</button>

			{isOpen && (
				<div className="absolute left-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
					{options.map((option, index) => (
						<button
							key={`${option.label}-${index}`}
							type="button"
							onClick={() => handleOptionClick(option)}
							className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 first:rounded-t-lg last:rounded-b-lg transition-colors"
						>
							<span className="text-base">{option.icon}</span>
							<span className="text-gray-700 dark:text-gray-200">
								{option.label}
							</span>
						</button>
					))}
				</div>
			)}
		</div>
	);
};
