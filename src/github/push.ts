import { enqueuePush } from "../transforms/push";
import issueKeyParser from "jira-issue-key-parser";
import { Context } from "probot/lib/context";
import { getCurrentTime } from "../util/webhooks";
import _ from "lodash";

export default async (context: Context, jiraClient): Promise<void> => {
	const webhookReceived = getCurrentTime();

	// Copy the shape of the context object for processing
	// but filter out any commits that don't have issue keys
	// so we don't have to process them.
	const payload = {
		webhookId: context.id,
		webhookReceived,
		repository: context.payload?.repository,
		// TODO: use reduce instead
		commits: context.payload?.commits?.map((commit) => {
			const issueKeys = issueKeyParser().parse(commit.message);

			if (!_.isEmpty(issueKeys)) {
				return commit;
			}
		})
			.filter((commit) => !!commit),
		installation: context.payload?.installation
	};

	if (!payload.commits?.length) {
		context.log(
			{ noop: "no_commits" },
			"Halting further execution for push since no commits were found for the payload"
		);
		return;
	}

	context.log("Enqueueing push event");
	await enqueuePush(payload, jiraClient.baseURL);

};
