import { incrementCommitCursor } from "../../../src/sync/cursors";

describe("sync/cursors", () => {

	it("increments commit cursor", () => {
		const cursor = "54831cca7fef1f80d721b502e38344462887b1df 2";
		const expectedCursor = "54831cca7fef1f80d721b502e38344462887b1df 7";
		expect(incrementCommitCursor(cursor, 5)).toEqual(expectedCursor);
	});

});
