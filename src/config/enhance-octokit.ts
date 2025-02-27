import statsd from "./statsd";
import { GitHubAPI } from "probot";
import { metricError, metricHttpRequest } from "./metric-names";
import { getLogger } from "./logger";
import { Octokit } from "@octokit/rest";
import { extractPath } from "../jira/client/axios";

const logger = getLogger("octokit");

export class RateLimitingError extends Error {
	/**
	 * The value of the x-ratelimit-reset header, i.e. the epoch seconds when the rate limit is refreshed.
	 */
	rateLimitReset: number;

	constructor(resetEpochSeconds: number) {
		super("rate limiting error");
		this.rateLimitReset = resetEpochSeconds;
		Object.setPrototypeOf(this, RateLimitingError.prototype);
	}
}

const instrumentRequests = (octokit: GitHubAPI) => {

	octokit.hook.error("request", async (error) => {
		if (error.headers?.["X-RateLimit-Remaining"] == "0" && error.headers?.["X-RateLimit-Reset"]) {
			logger.warn({ err: error }, "rate limiting error");
			const rateLimitReset: number = parseInt(error.headers["X-RateLimit-Reset"]);
			throw new RateLimitingError(rateLimitReset);
		}

		if (error.status === 403 && error.stack?.includes("has an IP allow list enabled")) {
			logger.error({ err: error }, "blocked by GitHub allowlist!");
			statsd.increment(metricError.blockedByGitHubAllowlist);
		}

		throw error;
	});

	octokit.hook.wrap("request", async (request, options) => {
		const requestStart = Date.now();
		let responseStatus: number | string | undefined;
		let response: Octokit.Response<any>;
		let error: any;
		try {
			response = await request(options);
			responseStatus = response.status;
			return response;
		} catch (err) {
			error = err;
			responseStatus = error?.status || error instanceof RateLimitingError ? "rateLimiting" : "none";
			throw error;
		} finally {
			if (error || Number(responseStatus) < 200 || Number(responseStatus) >= 400) {
				logger.warn({ req: request, err: error }, `Octokit error: failed request '${options.method} ${options.url}'`);
			}
			const elapsed = Date.now() - requestStart;
			statsd.histogram(metricHttpRequest.github, elapsed, {
				path: extractPath(options.url),
				method: options.method,
				status: responseStatus?.toString() || "none"
			});
		}
	});
};

/*
 * Customize an Octokit instance behavior.
 *
 * This acts like an Octokit plugin but works on Octokit instances.
 * (Because Probot instantiates the Octokit client for us, we can't use plugins.)
 */
export default (octokit: GitHubAPI): GitHubAPI => {
	instrumentRequests(octokit);
	return octokit;
};
