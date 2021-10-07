import { LoggerWithTarget } from "probot/lib/wrap-logger";
import { booleanFlag, BooleanFlags } from "../config/feature-flags";

export interface Trace {
	webhookId?: string,
	webhookType?: string,
	repositoryName?: string,
	organizationName?: string,
	installationId?: number,
	jiraHost?: string,
	issueKeys?: string[],
	jiraResponseCode?: number,
	pullRequestUrl?: string,
}

/**
 * Adds some structured tracing information to the logger.
 */
export const addTracingInfo = (logger: LoggerWithTarget, trace: Trace): LoggerWithTarget => {
	return logger.child({ ...trace });
}

/**
 * Returns true if the diagnostics feature flag is enabled for the given Jira host.
 */
export const isDiagnosticsEnabled = async (jiraHost: string): Promise<boolean> => {
	return await booleanFlag(BooleanFlags.DIAGNOSTICS_ENABLED, true, jiraHost);
}
