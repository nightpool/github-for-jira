import { CustomContext } from "./middleware";
import JiraClient from "../models/jira-client";

export default async (context: CustomContext, _: string, __: JiraClient, util): Promise<void> => {
	const { issue } = context.payload;

	let linkifiedBody;
	try {
		linkifiedBody = await util.unfurl(issue.body);
		if (!linkifiedBody) {
			context.log({ noop: "no_linkified_body_issue" }, "Halting further execution for issue since linkifiedBody is empty");
			return;
		}
	} catch (err) {
		context.log.warn({ err, linkifiedBody, body: issue.body }, "Error while trying to find jira keys in issue body");
	}

	const editedIssue = context.issue({
		body: linkifiedBody,
		id: issue.id
	});

	context.log(`Updating issue in GitHub with issueId: ${issue.id}`);
	await context.github.issues.update(editedIssue);
};
