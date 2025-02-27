import Queue, { QueueOptions } from "bull";
import getRedisInfo from "../config/redis-info";
import Redis from "ioredis";
import * as Sentry from "@sentry/node";
import statsd from "../config/statsd";
import { getLogger } from "../config/logger";
import {metricError, redisQueueMetrics} from "../config/metric-names";
import envVars from "../config/env";

const client = new Redis(getRedisInfo("client"));
const subscriber = new Redis(getRedisInfo("subscriber"));
const logger = getLogger("queues");

function measureElapsedTime(job: Queue.Job, tags) {
	statsd.histogram(redisQueueMetrics.jobDuration, Number(job.finishedOn) - Number(job.processedOn), tags);
}

const getQueueOptions = (timeout: number): QueueOptions => {
	return {
		defaultJobOptions: {
			attempts: 5,
			timeout: timeout,
			backoff: {
				type: "exponential",
				delay: 3 * 60 * 1000
			},
			removeOnComplete: true,
			removeOnFail: true
		},
		prefix: envVars.BULL_QUEUE_PREFIX,
		settings: {
			// lockDuration must be greater than the timeout, so that it doesn't get processed again prematurely
			lockDuration: timeout + 500
		},
		redis: getRedisInfo("bull"),
		createClient: (type, redisOpts = {}) => {
			let redisInfo;
			switch (type) {
				case "client":
					return client;
				case "subscriber":
					return subscriber;
				default:
					redisInfo = Object.assign({}, redisOpts);
					redisInfo.connectionName = "bclient";
					return new Redis(redisInfo);
			}
		}
	};
}

// Setup queues
export const queues: { [key: string]: Queue.Queue } = {
	discovery: new Queue("Content discovery", getQueueOptions(60 * 1000)),
	installation: new Queue("Initial sync", getQueueOptions(10 * 60 * 1000)),
	push: new Queue("Push transformation", getQueueOptions(60 * 1000)),
	metrics: new Queue("Metrics", getQueueOptions(60 * 1000))
};

// Setup error handling for queues
Object.keys(queues).forEach((name) => {
	const queue = queues[name];
	// On startup, clean any failed jobs older than 10s
	queue.clean(10000, "failed");

	// TODO: need ability to remove these listeners, especially for testing
	queue.on("active", (job: Queue.Job) => {
		logger.info({ job, queue: name }, "Job started");
	});

	queue.on("completed", (job) => {
		logger.info({ job, queue: name }, "Job completed");
		measureElapsedTime(job, { queue: name, status: "completed" });
	});

	queue.on("failed", async (job) => {
		const failedReason = job.failedReason || "failed";
		logger.error({ job, queue: name, failedReason }, "Job failed");
		measureElapsedTime(job, { queue: name, status: "failed" });

		const tags = [`queue:${name}`];
		statsd.increment(metricError.queueFailed, tags);
	});

	queue.on("error", (err) => {
		logger.error({ queue: name, err }, "Job Errored");

		Sentry.setTag("queue", name);
		Sentry.captureException(err);

		const tags = [`queue:${name}`];
		statsd.increment(metricError.queueError, tags);
	});
});
