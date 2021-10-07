import transformDeployment from "../transforms/deployment";
import { Context } from "probot/lib/context";

export default async (context: Context, jiraHost: string, jiraClient): Promise<void> => {
	const jiraPayload = await transformDeployment(context);

	if (!jiraPayload) {
		context.log({ noop: "no_jira_payload_deployment" }, "Halting further execution for deployment since jiraPayload is empty");
		return;
	}

	context.log(`Sending deployment info to Jira: ${jiraHost}`)
	await jiraClient.deployment.submit(jiraPayload);
};
