import supertest from "supertest";
import express, { Express } from "express";
import healthcheck from "../../../src/frontend/healthcheck";
import setupFrontend from "../../../src/frontend/app";
import { booleanFlag, BooleanFlags } from "../../../src/config/feature-flags";
import { when } from "jest-when";
import {getLogger} from "../../../src/config/logger";

jest.mock("../../../src/config/feature-flags");

describe("Maintenance", () => {
	let app: Express;

	const whenMaintenanceMode = (value: boolean, jiraHost?: string) =>
		when(booleanFlag).calledWith(
			BooleanFlags.MAINTENANCE_MODE,
			expect.anything(),
			jiraHost
		).mockResolvedValue(Promise.resolve(value));

	beforeEach(() => {
		// Defaults maintenance mode to true
		whenMaintenanceMode(true);
		app = express();
		app.use((request, _, next) => {
			request.log = getLogger('test');
			next();
		});
	});

	describe("Healthcheck", () => {
		beforeEach(() => app.use("/", healthcheck));

		it("should still work in maintenance mode", () =>
			supertest(app)
				.get("/healthcheck")
				.expect(200));

		it("deepcheck should still work in maintenance mode", () =>
			supertest(app)
				.get("/deepcheck")
				.expect(200)
		);
	});

	describe("Frontend", () => {
		beforeEach(() => {
			app.use("/", setupFrontend({
				getSignedJsonWebToken: () => "",
				getInstallationAccessToken: async () => ""
			}));
		});

		describe("Atlassian Connect", () => {
			it("should return Atlassian Connect JSON in maintenance mode", () =>
				supertest(app)
					.get("/jira/atlassian-connect.json")
					.expect(200)
					.then(response => {
						// removing keys that changes for every test run
						delete response.body.baseUrl;
						delete response.body.name;
						delete response.body.key;
						expect(response.body).toMatchSnapshot();
					}));
		});

		describe("Admin API", () => {
			beforeEach(() =>
				githubNock
					.post("/graphql")
					.reply(200, {
						data: {
							viewer: {
								login: "monalisa",
								organization: {
									viewerCanAdminister: true
								}
							}
						}
					})
			);

			it("should still work in maintenance mode", () =>
				supertest(app)
					.get("/api")
					.set("Authorization", "Bearer xxx")
					.expect(200)
			);
		});

		describe("Maintenance", () => {
			it("should return maintenance page on '/maintenance' even if maintenance mode is off", () => {
				whenMaintenanceMode(false);

				return supertest(app)
					.get("/maintenance")
					.expect(503)
					.then(response => {
						expect(response.body).toMatchSnapshot();
					});
			});

			it("should return 503 for any frontend routes to a jira host in maintenance mode", () =>
				supertest(app)
					.get("/github/setup")
					.expect(503)
			);

			it("should return expected page when maintenance mode is off", () => {
				whenMaintenanceMode(false);
				return supertest(app)
					.get("/github/setup")
					.then(response => {
						expect(response.status).toBeGreaterThanOrEqual(200);
						expect(response.status).toBeLessThan(400);
					});
			});

			it("should still be able to get static assets in maintenance mode", () =>
				supertest(app)
					.get("/public/maintenance.svg")
					.set("Accept", "image/svg+xml")
					.expect("Content-Type", "image/svg+xml")
					.expect(200)
					.then(response => {
						expect(response.body).toMatchSnapshot();
					})
			);
		});
	});
});
