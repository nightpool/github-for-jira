import transformPullRequest from "../transforms/pull-request";
import issueKeyParser from "jira-issue-key-parser";

import { Context } from "probot/lib/context";
import { isEmpty } from "../jira/util/isEmpty";
import { addTracingInfo, isDiagnosticsEnabled } from "../util/diagnostics";

export default async (context: Context, jiraHost: string, jiraClient, util): Promise<void> => {

	const {
		pull_request,
		repository: {
			id: repositoryId,
			name: repo,
			owner: { login: owner }
		},
		changes
	} = context.payload;

	context.log = addTracingInfo(context.log, { pullRequestUrl: pull_request?.url })

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let reviews: any = {};
	try {
		reviews = await context.github.pulls.listReviews({
			owner: owner,
			repo: repo,
			pull_number: pull_request.number
		});
	} catch (e) {
		context.log.warn({ err: e },
			"Missing Github Permissions: Can't retrieve reviewers"
		);
	}

	const jiraPayload = await transformPullRequest(
		context.log,
		jiraHost,
		pull_request,
		reviews.data
	);

	context.log.info({ jiraPayload }, "transformed pull request");

	// Deletes PR link to jira if ticket id is removed from PR title
	if (!jiraPayload && changes?.title) {
		const issueKeys = issueKeyParser().parse(changes?.title?.from);

		if (!isEmpty(issueKeys)) {
			return jiraClient.devinfo.pullRequest.delete(repositoryId, pull_request.number);
		}
	}

	try {
		const linkifiedBody = await util.unfurl(pull_request.body);
		if (linkifiedBody) {
			const editedPullRequest = context.issue({
				body: linkifiedBody,
				id: pull_request.id
			});
			await context.github.issues.update(editedPullRequest);
		}
	} catch (err) {
		context.log.warn({
			err,
			body: pull_request.body,
		}, "Error while trying to update PR body with links to Jira ticket");

		if (await isDiagnosticsEnabled(jiraHost)) {
			context.log.info({ pullRequestBody: pull_request.body }, "pull request body (see field 'pullRequestBody')");
		}
	}

	if (!jiraPayload) {
		context.log.debug("Halting further execution for pull request since jiraPayload is empty");
		return;
	}

	context.log(`Sending pull request update to Jira ${jiraClient.baseURL}`);
	await jiraClient.devinfo.repository.update(jiraPayload);
};
