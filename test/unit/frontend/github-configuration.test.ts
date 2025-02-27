import supertest from "supertest";
import { Installation, Subscription } from "../../../src/models";
import SubscriptionClass from "../../../src/models/subscription";
import FrontendApp from "../../../src/frontend/app";
import { getLogger } from "../../../src/config/logger";
import express, { Application } from "express";
import { getSignedCookieHeader } from "../util/cookies";

describe("Github Configuration", () => {
	let frontendApp: Application;
	let sub: SubscriptionClass;

	const authenticatedUserResponse = { login: "test-user" };
	const adminUserResponse = { login: "admin-user" };
	const organizationMembershipResponse = { role: "member" };
	const organizationAdminResponse = { role: "admin" };
	const userInstallationsResponse = {
		total_count: 2,
		installations: [
			{
				account: {
					login: "test-org"
				},
				id: 1,
				target_type: "Organization"
			},
			{
				id: 3
			}
		]
	};

	beforeEach(async () => {
		sub = Subscription.create({
			gitHubInstallationId: 15,
			jiraHost,
			jiraClientKey: "myClientKey"
		});

		Installation.create({
			jiraHost,
			clientKey: "abc123",
			secrets: "def234",
			sharedSecret: "ghi345"
		});

		frontendApp = express();
		frontendApp.use((request, _, next) => {
			request.log = getLogger("test");
			next();
		});
		frontendApp.use(FrontendApp({
			getSignedJsonWebToken: () => "",
			getInstallationAccessToken: async () => "access-token"
		}));
	});

	afterEach(async () => {
		await Installation.destroy({ truncate: true });
		await Subscription.destroy({ truncate: true });
	});

	describe("Github Token Validation", () => {
		it("should return redirect to github oauth flow for GET request if token is missing", async () =>
			supertest(frontendApp)
				.get("/github/configuration")
				.set(
					"Cookie",
					getSignedCookieHeader({
						jiraHost
					})
				)
				.expect(res => {
					expect(res.status).toBe(302);
					expect(res.headers.location).toContain("github.com/login/oauth/authorize");
				}));

		it("should return redirect to github oauth flow for GET request if token is invalid", async () => {
			githubNock
				.get("/")
				.matchHeader("Authorization", /^Bearer .+$/)
				.reply(403);

			return supertest(frontendApp)
				.get("/github/configuration")
				.set(
					"Cookie",
					getSignedCookieHeader({
						jiraHost,
						githubToken: "token"
					})
				)
				.expect(res => {
					expect(res.status).toBe(302);
					expect(res.headers.location).toContain("github.com/login/oauth/authorize");
				});
		});

		it("should return 401 if doing a POST request with a missing github token", async () =>
			supertest(frontendApp)
				.post("/github/configuration")
				.set(
					"Cookie",
					getSignedCookieHeader({
						jiraHost
					})
				)
				.expect(401));

		it("should return 401 if doing a POST request with an invalid github token", async () => {
			githubNock
				.get("/")
				.matchHeader("Authorization", /^Bearer .+$/)
				.reply(403);

			return supertest(frontendApp)
				.post("/github/configuration")
				.set(
					"Cookie",
					getSignedCookieHeader({
						jiraHost,
						githubToken: "token"
					})
				)
				.expect(401);
		});
	});

	// TODO: try to figure out why this keeps giving a JSON web token decode error
	describe.skip("#GET", () => {
		it("should return 200 when calling with valid Github Token", async () => {
			// This is for github token validation check
			githubNock
				.get("/")
				.matchHeader("Authorization", /^(Bearer|token) .+$/i)
				.reply(200);

			githubNock
				.get("/user")
				.reply(200, { login: "test-user" });

			githubNock
				.post(`/app/installations/${sub.gitHubInstallationId}/access_tokens`)
				.reply(200, {
					token: "token",
					expires_at: new Date().getTime() + 999999
				});

			githubNock
				.get(`/app/installations/${sub.gitHubInstallationId}`)
				.reply(200, { login: "test-user" });

			githubNock
				.get(`/user/installations`)
				.reply(200, {
					installations: [{
						id: sub.gitHubInstallationId,
						account: {
							login: "test-org"
						},
						target_type: "Organization"
					}]
				});

			githubNock
				.get(`/orgs/test-org/memberships/test-user`)
				.reply(200, {
					role: "admin"
				});

			githubNock
				.get(`/app`)
				.reply(200, {
					html_url: "https://github.com/apps/jira"
				});

			return supertest(frontendApp)
				.get("/github/configuration")
				.set(
					"Cookie",
					getSignedCookieHeader({
						jiraHost,
						githubToken: "token"
					})
				)
				.expect(200);
		});
	});

	describe("#POST", () => {
		it("should return a 401 if no GitHub token present in session", () =>
			supertest(frontendApp)
				.post("/github/configuration")
				.send({})
				.set(
					"Cookie",
					getSignedCookieHeader({ jiraHost })
				)
				.expect(401));

		it("should return a 401 if no Jira host present in session", () =>
			supertest(frontendApp)
				.post("/github/configuration")
				.send({})
				.set(
					"Cookie",
					getSignedCookieHeader({
						githubToken: "test-github-token"
					})
				)
				.expect(401));

		it("should return a 401 if the user doesn't have access to the requested installation ID", () => {
			// This is for github token validation check
			githubNock
				.get("/")
				.matchHeader("Authorization", /^(Bearer|token) .+$/i)
				.reply(200);

			githubNock
				.get("/user/installations")
				.reply(200, userInstallationsResponse);
			return supertest(frontendApp)
				.post("/github/configuration")
				.send({
					installationId: 2
				})
				.type("form")
				.set(
					"Cookie",
					getSignedCookieHeader({
						githubToken: "test-github-token",
						jiraHost
					})
				)
				.expect(401);
		});

		it("should return a 401 if the user is not an admin of the Org", () => {
			// This is for github token validation check
			githubNock
				.get("/")
				.matchHeader("Authorization", /^(Bearer|token) .+$/i)
				.reply(200);

			githubNock
				.get("/user/installations")
				.reply(200, userInstallationsResponse);
			githubNock
				.get("/user")
				.reply(200, authenticatedUserResponse);
			githubNock
				.get("/orgs/test-org/memberships/test-user")
				.reply(200, organizationMembershipResponse);
			return supertest(frontendApp)
				.post("/github/configuration")
				.send({
					installationId: 1
				})
				.type("form")
				.set(
					"Cookie",
					getSignedCookieHeader({
						githubToken: "test-github-token",
						jiraHost
					})
				)
				.expect(401);
		});

		it("should return a 400 if no installationId is present in the body", () => {
			// This is for github token validation check
			githubNock
				.get("/")
				.matchHeader("Authorization", /^(Bearer|token) .+$/i)
				.reply(200);
			return supertest(frontendApp)
				.post("/github/configuration")
				.send({})
				.set(
					"Cookie",
					getSignedCookieHeader({
						githubToken: "test-github-token",
						jiraHost
					})
				)
				.expect(400);
		});

		it("should return a 200 and install a Subscription", async () => {
			const jiraHost = "test-jira-host";

			// This is for github token validation check
			githubNock
				.get("/")
				.matchHeader("Authorization", /^(Bearer|token) .+$/i)
				.reply(200);

			githubNock
				.get("/user/installations")
				.reply(200, userInstallationsResponse);
			githubNock
				.get("/user")
				.reply(200, adminUserResponse);
			githubNock
				.get("/orgs/test-org/memberships/admin-user")
				.reply(200, organizationAdminResponse);

			const jiraClientKey = "a-unique-client-key";

			await supertest(frontendApp)
				.post("/github/configuration")
				.send({
					installationId: 1,
					clientKey: jiraClientKey
				})
				.type("form")
				.set(
					"Cookie",
					getSignedCookieHeader({
						githubToken: "test-github-token",
						jiraHost
					})
				)
				.expect(200);
		});
	});
});
