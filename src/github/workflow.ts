import transformWorkflow from "../transforms/workflow";
import { Context } from "probot/lib/context";

export default async (context: Context, _: string, jiraClient): Promise<void> => {
	const jiraPayload = await transformWorkflow(context);

	if (!jiraPayload) {
		context.log({noop: "no_jira_payload_workflow_run"}, "Halting further execution for workflow since jiraPayload is empty");
		return;
	}

	context.log(`Sending workflow event to Jira: ${jiraHost}`)
	await jiraClient.workflow.submit(jiraPayload);
};
