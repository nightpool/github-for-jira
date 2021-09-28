const commitCursorRegex = new RegExp("^([^ ]+) ([0-9]+)$");

export const incrementCommitCursor = (cursor: string, increment: number): string => {
	const parsedCursor = commitCursorRegex.exec(cursor);
	const cursorId = parsedCursor[1];
	const cursorNumber = parseInt(parsedCursor[2]);
	return `${cursorId} ${cursorNumber + increment}`;
}

export const incrementPullCursor = (cursor: number, increment: number): number => {
	return cursor + increment;
}

export const incrementCursor = (cursor: string | number, increment: number, task: "commit" | "pull"): string => {
	switch (task) {
		case "commit":
			return incrementCommitCursor(cursor as string, increment);
		case "pull":
			return incrementPullCursor(cursor as number, increment).toString();
	}
}
