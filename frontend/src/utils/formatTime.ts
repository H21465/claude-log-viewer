/**
 * タイムスタンプをDateオブジェクトに変換
 * バックエンドからのタイムスタンプはUTCだがタイムゾーン情報がないため補正
 */
function parseTimestamp(timestamp: string): Date {
	// タイムゾーン情報がない場合はUTCとして扱う
	if (!timestamp.endsWith("Z") && !timestamp.includes("+") && !timestamp.includes("-", 10)) {
		return new Date(timestamp + "Z");
	}
	return new Date(timestamp);
}

/**
 * タイムスタンプを日本時間（JST）でフォーマット
 */
export function formatTime(timestamp: string): string {
	try {
		const date = parseTimestamp(timestamp);
		return date.toLocaleTimeString("ja-JP", {
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
			timeZone: "Asia/Tokyo",
		});
	} catch {
		return "";
	}
}

/**
 * タイムスタンプを日本時間（JST）で短くフォーマット（秒なし）
 */
export function formatTimeShort(timestamp: string): string {
	try {
		const date = parseTimestamp(timestamp);
		return date.toLocaleTimeString("ja-JP", {
			hour: "2-digit",
			minute: "2-digit",
			timeZone: "Asia/Tokyo",
		});
	} catch {
		return "";
	}
}
