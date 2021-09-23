import statsd from "../config/statsd";
import { metricWebhooks } from "../config/metric-names";

export const getCurrentTime = () => new Date();

export const calculateProcessingTimeInSeconds = (
	webhookReceivedTime: Date,
	webhookName: string,
	contextLogger: any,
	status?: number
): number => {
	const timeToProcessWebhookEvent =
		getCurrentTime().getTime() - webhookReceivedTime.getTime();
	const webhookStatus = status?.toString() || "none";

	contextLogger.info(
		{ webhookName, status: webhookStatus },
		`Webhook processed in ${timeToProcessWebhookEvent} milliseconds`
	);

	const tags = {
		webhookName,
		status: webhookStatus,
	};

	statsd.histogram(
		metricWebhooks.webhookEvent,
		timeToProcessWebhookEvent,
		tags
	);

	return timeToProcessWebhookEvent;
};
