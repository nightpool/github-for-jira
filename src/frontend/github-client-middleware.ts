import GithubAPI from "../config/github-api";
import { NextFunction, Request, RequestHandler, Response } from "express";
import { App } from "@octokit/app";
import Logger from "bunyan";

export default (octokitApp: App): RequestHandler => async (req: Request, res: Response, next: NextFunction): Promise<void> => {
	// If githubToken isn't set, this GithubAPI will be unauthed
	res.locals.github = GithubAPI();

	res.locals.client = GithubAPI({
		auth: octokitApp.getSignedJsonWebToken()
	});

	res.locals.isAdmin = isAdmin(res, req.log);

	next();
};


// TODO: change function name as we're not looking for admin, but those that can install app in orga
export const isAdmin = (res: Response, logger: Logger) =>
	async (args: { org: string, username: string, type: string }): Promise<boolean> => {
		const { org, username, type } = args;

		// If this is a user installation, the "admin" is the user that owns the repo
		if (type === "User") {
			return org === username;
		}

		// Otherwise this is an Organization installation and we need to ask GitHub for role of the logged in user
		try {
			const {
				data: { role }
			} = await res.locals.github.orgs.getMembership({ org, username });

			logger.info(`isAdmin: User ${username} has ${role} role for org ${org}`);

			return role === "admin";
		} catch (err) {
			logger.warn({ err, org, username }, `could not determine admin status of user ${username} in org ${org}`);
			return false;
		}
	};
