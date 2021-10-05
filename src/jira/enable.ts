import { Installation } from "../models";
import verifyInstallation from "./verify-installation";
import { Request, Response } from "express";

/**
 * Handle the enable webhook from Jira
 */
export default async (req: Request, res: Response): Promise<void> => {
	const jiraHost = req.body.baseUrl;

	const installation = await Installation.getPendingHost(jiraHost);
	if (!installation) {
		req.log.info("No pending installation found");
		res.sendStatus(422);
		return;
	}

	req.log.info("Received installation enabled request");

	res.on("finish", verifyInstallation(installation, req.log));
	res.sendStatus(204);
};
