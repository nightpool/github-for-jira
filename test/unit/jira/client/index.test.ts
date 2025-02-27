import { Installation, Subscription } from "../../../../src/models";
import SubscriptionClass from "../../../../src/models/subscription";
import getJiraClient from "../../../../src/jira/client";

describe("Test getting a jira client", () => {
	const gitHubInstallationId = Math.round(Math.random() * 10000);
	let subscription: SubscriptionClass;
	let client;

	beforeEach(async () => {
		await Installation.install({
			host: jiraHost,
			sharedSecret: "shared-secret",
			clientKey: "client-key"
		});
		subscription = await Subscription.create({
			jiraHost,
			gitHubInstallationId
		});
		client = await getJiraClient(jiraHost, gitHubInstallationId);
	});

	afterEach(async () => {
		await Installation.destroy({ truncate: true });
		await Subscription.destroy({ truncate: true });
	});

	it("Installation exists", async () => {
		expect(client).toMatchSnapshot();
	});

	it("Installation does not exist", async () => {
		expect(await getJiraClient("https://non-existing-url.atlassian.net", gitHubInstallationId)).not.toBeDefined();
	});

	it("Should truncate issueKeys if over the limit", async () => {
		jiraNock.post("/rest/devinfo/0.10/bulk").reply(200);

		await client.devinfo.repository.update({
			commits: [
				{
					author: {
						email: "blarg@email.com",
						name: "foo"
					},
					authorTimestamp: "Tue Oct 19 2021 11:52:08 GMT+1100",
					displayId: "oajfojwe",
					fileCount: 3,
					hash: "hashihashhash",
					id: "id",
					issueKeys: Array.from(new Array(125)).map((_, i) => `TEST-${i}`),
					message: "commit message",
					url: "some-url",
					updateSequenceId: 1234567890
				}
			]
		});
		await subscription.reload();
		expect(subscription.syncWarning).toEqual("Exceeded issue key reference limit. Some issues may not be linked.");
	});
});
