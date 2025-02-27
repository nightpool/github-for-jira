/* eslint-disable @typescript-eslint/no-var-requires */
import { createWebhookApp } from "../utils/probot";
import { Application } from "probot";
import { Installation, Subscription } from "../../src/models";

describe("Pull Request Webhook", () => {
	let app: Application;
	const gitHubInstallationId = 1234;

	beforeEach(async () => {
		app = await createWebhookApp();
		const clientKey = "client-key";
		await Installation.create({
			clientKey,
			sharedSecret: "shared-secret",
			jiraHost
		});
		await Subscription.create({
			gitHubInstallationId,
			jiraHost,
			jiraClientKey: clientKey
		});
	});

	afterEach(async () => {
		await Subscription.destroy({ truncate: true });
		await Installation.destroy({ truncate: true });
	});

	it("should have reviewers on pull request action", async () => {
		const fixture = require("../fixtures/pull-request-basic.json");

		githubNock.get("/users/test-pull-request-user-login")
			.reply(200, {
				login: "test-pull-request-author-login",
				avatar_url: "test-pull-request-author-avatar",
				html_url: "test-pull-request-author-url"
			});

		githubNock.get("/repos/test-repo-owner/test-repo-name/pulls/1/reviews")
			.reply(200, [
				{
					id: 80,
					node_id: "MDE3OlB1bGxSZXF1ZXN0UmV2aWV3ODA=",
					user: {
						login: "test-pull-request-reviewer-login",
						id: 1,
						node_id: "MDQ6VXNlcjE=",
						avatar_url: "test-pull-request-reviewer-avatar",
						gravatar_id: "",
						url: "https://api.github.com/users/reviewer",
						html_url: "https://github.com/reviewer",
						followers_url: "https://api.github.com/users/reviewer/followers",
						following_url: "https://api.github.com/users/reviewer/following{/other_user}",
						gists_url: "https://api.github.com/users/reviewer/gists{/gist_id}",
						starred_url: "https://api.github.com/users/reviewer/starred{/owner}{/repo}",
						subscriptions_url: "https://api.github.com/users/reviewer/subscriptions",
						organizations_url: "https://api.github.com/users/reviewer/orgs",
						repos_url: "https://api.github.com/users/reviewer/repos",
						events_url: "https://api.github.com/users/reviewer/events{/privacy}",
						received_events_url: "https://api.github.com/users/reviewer/received_events",
						type: "User",
						site_admin: false
					},
					body: "Here is the body for the review.",
					state: "APPROVED",
					html_url: "https://github.com/test-repo-owner/test-repo-name/pull/1#pullrequestreview-80",
					pull_request_url: "https://api.github.com/repos/test-repo-owner/test-repo-name/pulls/1",
					_links: {
						html: {
							href: "https://github.com/test-repo-owner/test-repo-name/pull/1#pullrequestreview-80"
						},
						pull_request: {
							href: "https://api.github.com/repos/test-repo-owner/test-repo-name/pulls/1"
						}
					},
					submitted_at: "2019-11-17T17:43:43Z",
					commit_id: "ecdd80bb57125d7ba9641ffaa4d7d2c19d3f3091",
					author_association: "COLLABORATOR"
				}
			]);

		githubNock.patch("/repos/test-repo-owner/test-repo-name/issues/1", {
			body: `[TEST-124] body of the test pull request.\n\n[TEST-124]: ${jiraHost}/browse/TEST-124`,
			id: "test-pull-request-id"
		}).reply(200);

		jiraNock
			.get("/rest/api/latest/issue/TEST-124?fields=summary")
			.reply(200, {
				key: "TEST-124",
				fields: {
					summary: "Example Issue"
				}
			});

		jiraNock.post("/rest/devinfo/0.10/bulk", {
			preventTransitions: false,
			repositories: [
				{
					url: "test-pull-request-base-url",
					branches: [
						{
							createPullRequestUrl: "test-pull-request-head-url/pull/new/TEST-321-test-pull-request-head-ref",
							lastCommit: {
								author: {
									avatar: "https://github.com/ghost.png",
									name: "Deleted User",
									email: "deleted@noreply.user.github.com",
									url: "https://github.com/ghost"
								},
								authorTimestamp: "test-pull-request-update-time",
								displayId: "test-p",
								fileCount: 0,
								hash: "test-pull-request-sha",
								id: "test-pull-request-sha",
								issueKeys: ["TEST-123", "TEST-321", "TEST-124"],
								message: "n/a",
								updateSequenceId: 12345678,
								url: "test-pull-request-head-url/commit/test-pull-request-sha"
							},
							id: "TEST-321-test-pull-request-head-ref",
							issueKeys: ["TEST-123", "TEST-321", "TEST-124"],
							name: "TEST-321-test-pull-request-head-ref",
							url: "test-pull-request-head-url/tree/TEST-321-test-pull-request-head-ref",
							updateSequenceId: 12345678
						}
					],
					pullRequests: [
						{
							author: {
								avatar: "test-pull-request-author-avatar",
								name: "test-pull-request-author-login",
								email: "test-pull-request-author-login@noreply.user.github.com",
								url: "test-pull-request-author-url"
							},
							commentCount: "test-pull-request-comment-count",
							destinationBranch: "test-pull-request-base-url/tree/test-pull-request-base-ref",
							displayId: "#1",
							id: 1,
							issueKeys: ["TEST-123", "TEST-321", "TEST-124"],
							lastUpdate: "test-pull-request-update-time",
							reviewers: [
								{
									avatar: "test-pull-request-reviewer-avatar",
									name: "test-pull-request-reviewer-login",
									email: "test-pull-request-reviewer-login@noreply.user.github.com",
									url: "https://github.com/reviewer",
									approvalStatus: "APPROVED"
								}
							],
							sourceBranch: "TEST-321-test-pull-request-head-ref",
							sourceBranchUrl: "test-pull-request-head-url/tree/TEST-321-test-pull-request-head-ref",
							status: "OPEN",
							timestamp: "test-pull-request-update-time",
							title: "[TEST-123] Test pull request.",
							url: "test-pull-request-url",
							updateSequenceId: 12345678
						}
					],
					updateSequenceId: 12345678
				}
			],
			properties: { installationId: 1234 }
		}).reply(200);

		Date.now = jest.fn(() => 12345678);

		await expect(app.receive(fixture)).toResolve();
	});


	it("should delete the reference to a pull request when issue keys are removed from the title", async () => {
		const fixture = require("../fixtures/pull-request-remove-keys.json");
		const { repository, pull_request: pullRequest } = fixture.payload;

		githubNock.get("/repos/test-repo-owner/test-repo-name/pulls/1/reviews")
			.reply(200, [
				{
					id: 80,
					node_id: "MDE3OlB1bGxSZXF1ZXN0UmV2aWV3ODA=",
					user: {
						login: "test-pull-request-reviewer-login",
						id: 1,
						node_id: "MDQ6VXNlcjE=",
						avatar_url: "test-pull-request-reviewer-avatar",
						gravatar_id: "",
						url: "https://api.github.com/users/reviewer",
						html_url: "https://github.com/reviewer",
						followers_url: "https://api.github.com/users/reviewer/followers",
						following_url: "https://api.github.com/users/reviewer/following{/other_user}",
						gists_url: "https://api.github.com/users/reviewer/gists{/gist_id}",
						starred_url: "https://api.github.com/users/reviewer/starred{/owner}{/repo}",
						subscriptions_url: "https://api.github.com/users/reviewer/subscriptions",
						organizations_url: "https://api.github.com/users/reviewer/orgs",
						repos_url: "https://api.github.com/users/reviewer/repos",
						events_url: "https://api.github.com/users/reviewer/events{/privacy}",
						received_events_url: "https://api.github.com/users/reviewer/received_events",
						type: "User",
						site_admin: false
					},
					body: "Here is the body for the review.",
					state: "APPROVED",
					html_url: "https://github.com/test-repo-owner/test-repo-name/pull/1#pullrequestreview-80",
					pull_request_url: "https://api.github.com/repos/test-repo-owner/test-repo-name/pulls/1",
					_links: {
						html: {
							href: "https://github.com/test-repo-owner/test-repo-name/pull/1#pullrequestreview-80"
						},
						pull_request: {
							href: "https://api.github.com/repos/test-repo-owner/test-repo-name/pulls/1"
						}
					},
					submitted_at: "2019-11-17T17:43:43Z",
					commit_id: "ecdd80bb57125d7ba9641ffaa4d7d2c19d3f3091",
					author_association: "COLLABORATOR"
				}
			]);

		jiraNock
			.delete(`/rest/devinfo/0.10/repository/${repository.id}/pull_request/${pullRequest.number}?_updateSequenceId=12345678`)
			.reply(200);

		Date.now = jest.fn(() => 12345678);

		await expect(app.receive(fixture)).toResolve();
	});

	it("should not update the Jira issue if the source repo of a pull_request was deleted", async () => {
		const fixture = require("../fixtures/pull-request-null-repo.json");

		Date.now = jest.fn(() => 12345678);

		await expect(app.receive(fixture)).toResolve();
	});

	it("will not delete references if a branch still has an issue key", async () => {
		const fixture = require("../fixtures/pull-request-test-changes-with-branch.json");

		githubNock.get("/repos/test-repo-owner/test-repo-name/pulls/1/reviews")
			.reply(200, [
				{
					id: 80,
					node_id: "MDE3OlB1bGxSZXF1ZXN0UmV2aWV3ODA=",
					user: {
						login: "test-pull-request-reviewer-login",
						id: 1,
						node_id: "MDQ6VXNlcjE=",
						avatar_url: "test-pull-request-reviewer-avatar",
						gravatar_id: "",
						url: "https://api.github.com/users/reviewer",
						html_url: "https://github.com/reviewer",
						followers_url: "https://api.github.com/users/reviewer/followers",
						following_url: "https://api.github.com/users/reviewer/following{/other_user}",
						gists_url: "https://api.github.com/users/reviewer/gists{/gist_id}",
						starred_url: "https://api.github.com/users/reviewer/starred{/owner}{/repo}",
						subscriptions_url: "https://api.github.com/users/reviewer/subscriptions",
						organizations_url: "https://api.github.com/users/reviewer/orgs",
						repos_url: "https://api.github.com/users/reviewer/repos",
						events_url: "https://api.github.com/users/reviewer/events{/privacy}",
						received_events_url: "https://api.github.com/users/reviewer/received_events",
						type: "User",
						site_admin: false
					},
					body: "Here is the body for the review.",
					state: "APPROVED",
					html_url: "https://github.com/test-repo-owner/test-repo-name/pull/1#pullrequestreview-80",
					pull_request_url: "https://api.github.com/repos/test-repo-owner/test-repo-name/pulls/1",
					_links: {
						html: {
							href: "https://github.com/test-repo-owner/test-repo-name/pull/1#pullrequestreview-80"
						},
						pull_request: {
							href: "https://api.github.com/repos/test-repo-owner/test-repo-name/pulls/1"
						}
					},
					submitted_at: "2019-11-17T17:43:43Z",
					commit_id: "ecdd80bb57125d7ba9641ffaa4d7d2c19d3f3091",
					author_association: "COLLABORATOR"
				}
			]);

		githubNock.get("/users/test-pull-request-user-login")
			.twice()
			.reply(200, {
				login: "test-pull-request-author-login",
				avatar_url: "test-pull-request-author-avatar",
				html_url: "test-pull-request-author-url"
			});

		Date.now = jest.fn(() => 12345678);

		await expect(app.receive(fixture)).toResolve();
	});

	describe("Trigged by Bot", () => {
		let fixture;
		beforeEach(() => fixture = require("../fixtures/pull-request-triggered-by-bot.json"));

		it("should update the Jira issue with the linked GitHub pull_request if PR opened action was triggered by bot", async () => {
			githubNock.get("/users/test-pull-request-user-login")
				.reply(200, {
					login: "test-pull-request-author-login",
					avatar_url: "test-pull-request-author-avatar",
					html_url: "test-pull-request-author-url"
				});

			githubNock.get("/repos/test-repo-owner/test-repo-name/pulls/1/reviews")
				.reply(200, [
					{
						id: 80,
						node_id: "MDE3OlB1bGxSZXF1ZXN0UmV2aWV3ODA=",
						user: {
							login: "test-pull-request-reviewer-login",
							id: 1,
							node_id: "MDQ6VXNlcjE=",
							avatar_url: "test-pull-request-reviewer-avatar",
							gravatar_id: "",
							url: "https://api.github.com/users/reviewer",
							html_url: "https://github.com/reviewer",
							followers_url: "https://api.github.com/users/reviewer/followers",
							following_url: "https://api.github.com/users/reviewer/following{/other_user}",
							gists_url: "https://api.github.com/users/reviewer/gists{/gist_id}",
							starred_url: "https://api.github.com/users/reviewer/starred{/owner}{/repo}",
							subscriptions_url: "https://api.github.com/users/reviewer/subscriptions",
							organizations_url: "https://api.github.com/users/reviewer/orgs",
							repos_url: "https://api.github.com/users/reviewer/repos",
							events_url: "https://api.github.com/users/reviewer/events{/privacy}",
							received_events_url: "https://api.github.com/users/reviewer/received_events",
							type: "User",
							site_admin: false
						},
						body: "Here is the body for the review.",
						state: "APPROVED",
						html_url: "https://github.com/test-repo-owner/test-repo-name/pull/1#pullrequestreview-80",
						pull_request_url: "https://api.github.com/repos/test-repo-owner/test-repo-name/pulls/1",
						_links: {
							html: {
								href: "https://github.com/test-repo-owner/test-repo-name/pull/1#pullrequestreview-80"
							},
							pull_request: {
								href: "https://api.github.com/repos/test-repo-owner/test-repo-name/pulls/1"
							}
						},
						submitted_at: "2019-11-17T17:43:43Z",
						commit_id: "ecdd80bb57125d7ba9641ffaa4d7d2c19d3f3091",
						author_association: "COLLABORATOR"
					}
				]);

			jiraNock
				.get("/rest/api/latest/issue/TEST-124?fields=summary")
				.reply(200, {
					key: "TEST-124",
					fields: {
						summary: "Example Issue"
					}
				});

			jiraNock.post("/rest/devinfo/0.10/bulk", {
				preventTransitions: false,
				repositories:
					[
						{
							url: "test-pull-request-base-url",
							branches:
								[
									{
										createPullRequestUrl: "test-pull-request-head-url/pull/new/TEST-321-test-pull-request-head-ref",
										lastCommit:
											{
												author:
													{
														avatar: "https://github.com/ghost.png",
														name: "Deleted User",
														email: "deleted@noreply.user.github.com",
														url: "https://github.com/ghost"
													},
												authorTimestamp: "test-pull-request-update-time",
												displayId: "test-p",
												fileCount: 0,
												hash: "test-pull-request-sha",
												id: "test-pull-request-sha",
												issueKeys:
													[
														"TEST-123",
														"TEST-321",
														"TEST-124"
													],
												message: "n/a",
												updateSequenceId: 12345678,
												url: "test-pull-request-head-url/commit/test-pull-request-sha"
											},
										id: "TEST-321-test-pull-request-head-ref",
										issueKeys:
											[
												"TEST-123",
												"TEST-321",
												"TEST-124"
											],
										name: "TEST-321-test-pull-request-head-ref",
										url: "test-pull-request-head-url/tree/TEST-321-test-pull-request-head-ref",
										updateSequenceId: 12345678
									}
								],
							pullRequests:
								[
									{
										author:
											{
												avatar: "test-pull-request-author-avatar",
												name: "test-pull-request-author-login",
												email: "test-pull-request-author-login@noreply.user.github.com",
												url: "test-pull-request-author-url"
											},
										commentCount: "test-pull-request-comment-count",
										destinationBranch: "test-pull-request-base-url/tree/test-pull-request-base-ref",
										displayId: "#1",
										id: 1,
										issueKeys:
											[
												"TEST-123",
												"TEST-321",
												"TEST-124"
											],
										lastUpdate: "test-pull-request-update-time",
										reviewers:
											[
												{
													avatar: "test-pull-request-reviewer-avatar",
													name: "test-pull-request-reviewer-login",
													email: "test-pull-request-reviewer-login@noreply.user.github.com",
													url: "https://github.com/reviewer",
													approvalStatus: "APPROVED"
												}
											],
										sourceBranch: "TEST-321-test-pull-request-head-ref",
										sourceBranchUrl: "test-pull-request-head-url/tree/TEST-321-test-pull-request-head-ref",
										status: "OPEN",
										timestamp: "test-pull-request-update-time",
										title: "[TEST-123] Test pull request.",
										url: "test-pull-request-url",
										updateSequenceId: 12345678
									}
								],
							updateSequenceId: 12345678
						}
					],
				properties:
					{
						installationId: 1234
					}
			}).reply(200);

			githubNock
				.patch("/repos/test-repo-owner/test-repo-name/issues/1", {
					body: `[TEST-124] body of the test pull request.\n\n[TEST-124]: ${jiraHost}/browse/TEST-124`,
					id: "test-pull-request-id"
				})
				.reply(200);

			Date.now = jest.fn(() => 12345678);

			await expect(app.receive(fixture[0])).toResolve();
		});

		it("should update the Jira issue with the linked GitHub pull_request if PR closed action was triggered by bot", async () => {
			githubNock.get("/users/test-pull-request-user-login")
				.reply(200, {
					login: "test-pull-request-author-login",
					avatar_url: "test-pull-request-author-avatar",
					html_url: "test-pull-request-author-url"
				});

			githubNock.get("/repos/test-repo-owner/test-repo-name/pulls/1/reviews")
				.reply(200, [
					{
						id: 80,
						node_id: "MDE3OlB1bGxSZXF1ZXN0UmV2aWV3ODA=",
						user: {
							login: "test-pull-request-reviewer-login",
							id: 1,
							node_id: "MDQ6VXNlcjE=",
							avatar_url: "test-pull-request-reviewer-avatar",
							gravatar_id: "",
							url: "https://api.github.com/users/reviewer",
							html_url: "https://github.com/reviewer",
							followers_url: "https://api.github.com/users/reviewer/followers",
							following_url: "https://api.github.com/users/reviewer/following{/other_user}",
							gists_url: "https://api.github.com/users/reviewer/gists{/gist_id}",
							starred_url: "https://api.github.com/users/reviewer/starred{/owner}{/repo}",
							subscriptions_url: "https://api.github.com/users/reviewer/subscriptions",
							organizations_url: "https://api.github.com/users/reviewer/orgs",
							repos_url: "https://api.github.com/users/reviewer/repos",
							events_url: "https://api.github.com/users/reviewer/events{/privacy}",
							received_events_url: "https://api.github.com/users/reviewer/received_events",
							type: "User",
							site_admin: false
						},
						body: "Here is the body for the review.",
						state: "APPROVED",
						html_url: "https://github.com/test-repo-owner/test-repo-name/pull/1#pullrequestreview-80",
						pull_request_url: "https://api.github.com/repos/test-repo-owner/test-repo-name/pulls/1",
						_links: {
							html: {
								href: "https://github.com/test-repo-owner/test-repo-name/pull/1#pullrequestreview-80"
							},
							pull_request: {
								href: "https://api.github.com/repos/test-repo-owner/test-repo-name/pulls/1"
							}
						},
						submitted_at: "2019-11-17T17:43:43Z",
						commit_id: "ecdd80bb57125d7ba9641ffaa4d7d2c19d3f3091",
						author_association: "COLLABORATOR"
					}
				]);

			githubNock.patch("/repos/test-repo-owner/test-repo-name/issues/1", {
				body: `[TEST-124] body of the test pull request.\n\n[TEST-124]: ${jiraHost}/browse/TEST-124`,
				id: "test-pull-request-id"
			}).reply(200);

			jiraNock.get("/rest/api/latest/issue/TEST-124?fields=summary")
				.reply(200, {
					key: "TEST-124",
					fields: {
						summary: "Example Issue"
					}
				});

			jiraNock.post("/rest/devinfo/0.10/bulk", {
				preventTransitions: false,
				repositories: [
					{
						url: "test-pull-request-base-url",
						branches: [],
						pullRequests: [
							{
								author: {
									avatar: "test-pull-request-author-avatar",
									name: "test-pull-request-author-login",
									email: "test-pull-request-author-login@noreply.user.github.com",
									url: "test-pull-request-author-url"
								},
								commentCount: "test-pull-request-comment-count",
								destinationBranch: "test-pull-request-base-url/tree/test-pull-request-base-ref",
								displayId: "#1",
								id: 1,
								issueKeys: ["TEST-123", "TEST-321", "TEST-124"],
								lastUpdate: "test-pull-request-update-time",
								reviewers: [
									{
										avatar: "test-pull-request-reviewer-avatar",
										name: "test-pull-request-reviewer-login",
										email: "test-pull-request-reviewer-login@noreply.user.github.com",
										url: "https://github.com/reviewer",
										approvalStatus: "APPROVED"
									}
								],
								sourceBranch: "TEST-321-test-pull-request-head-ref",
								sourceBranchUrl: "test-pull-request-head-url/tree/TEST-321-test-pull-request-head-ref",
								status: "MERGED",
								timestamp: "test-pull-request-update-time",
								title: "[TEST-123] Test pull request.",
								url: "test-pull-request-url",
								updateSequenceId: 12345678
							}
						],
						updateSequenceId: 12345678
					}
				],
				properties: { installationId: 1234 }
			}).reply(200);

			Date.now = jest.fn(() => 12345678);

			await expect(app.receive(fixture[1])).toResolve();
		});

		it("should update the Jira issue with the linked GitHub pull_request if PR reopened action was triggered by bot", async () => {
			githubNock.get("/users/test-pull-request-user-login")
				.twice()
				.reply(200, {
					login: "test-pull-request-author-login",
					avatar_url: "test-pull-request-author-avatar",
					html_url: "test-pull-request-author-url"
				});

			githubNock.patch("/repos/test-repo-owner/test-repo-name/issues/1", {
				body: `[TEST-124] body of the test pull request.\n\n[TEST-124]: ${jiraHost}/browse/TEST-124`,
				id: "test-pull-request-id"
			}).reply(200);

			githubNock.get("/repos/test-repo-owner/test-repo-name/pulls/1/reviews")
				.reply(200, [
					{
						id: 80,
						node_id: "MDE3OlB1bGxSZXF1ZXN0UmV2aWV3ODA=",
						user: {
							login: "test-pull-request-reviewer-login",
							id: 1,
							node_id: "MDQ6VXNlcjE=",
							avatar_url: "test-pull-request-reviewer-avatar",
							gravatar_id: "",
							url: "https://api.github.com/users/reviewer",
							html_url: "https://github.com/reviewer",
							followers_url: "https://api.github.com/users/reviewer/followers",
							following_url: "https://api.github.com/users/reviewer/following{/other_user}",
							gists_url: "https://api.github.com/users/reviewer/gists{/gist_id}",
							starred_url: "https://api.github.com/users/reviewer/starred{/owner}{/repo}",
							subscriptions_url: "https://api.github.com/users/reviewer/subscriptions",
							organizations_url: "https://api.github.com/users/reviewer/orgs",
							repos_url: "https://api.github.com/users/reviewer/repos",
							events_url: "https://api.github.com/users/reviewer/events{/privacy}",
							received_events_url: "https://api.github.com/users/reviewer/received_events",
							type: "User",
							site_admin: false
						},
						body: "Here is the body for the review.",
						state: "APPROVED",
						html_url: "https://github.com/test-repo-owner/test-repo-name/pull/1#pullrequestreview-80",
						pull_request_url: "https://api.github.com/repos/test-repo-owner/test-repo-name/pulls/1",
						_links: {
							html: {
								href: "https://github.com/test-repo-owner/test-repo-name/pull/1#pullrequestreview-80"
							},
							pull_request: {
								href: "https://api.github.com/repos/test-repo-owner/test-repo-name/pulls/1"
							}
						},
						submitted_at: "2019-11-17T17:43:43Z",
						commit_id: "ecdd80bb57125d7ba9641ffaa4d7d2c19d3f3091",
						author_association: "COLLABORATOR"
					}
				]);

			jiraNock.get("/rest/api/latest/issue/TEST-124?fields=summary")
				.reply(200, {
					key: "TEST-124",
					fields: {
						summary: "Example Issue"
					}
				});

			jiraNock.post("/rest/devinfo/0.10/bulk", {
				preventTransitions: false,
				repositories:
					[
						{
							url: "test-pull-request-base-url",
							branches:
								[
									{
										createPullRequestUrl: "test-pull-request-head-url/pull/new/TEST-321-test-pull-request-head-ref",
										lastCommit:
											{
												author:
													{
														avatar: "test-pull-request-author-avatar",
														name: "test-pull-request-author-login",
														email: "test-pull-request-author-login@noreply.user.github.com",
														url: "test-pull-request-author-url"
													},
												authorTimestamp: "test-pull-request-update-time",
												displayId: "test-p",
												fileCount: 0,
												hash: "test-pull-request-sha",
												id: "test-pull-request-sha",
												issueKeys:
													[
														"TEST-123",
														"TEST-321",
														"TEST-124"
													],
												message: "n/a",
												updateSequenceId: 12345678,
												url: "test-pull-request-head-url/commit/test-pull-request-sha"
											},
										id: "TEST-321-test-pull-request-head-ref",
										issueKeys:
											[
												"TEST-123",
												"TEST-321",
												"TEST-124"
											],
										name: "TEST-321-test-pull-request-head-ref",
										url: "test-pull-request-head-url/tree/TEST-321-test-pull-request-head-ref",
										updateSequenceId: 12345678
									}
								],
							pullRequests:
								[
									{
										author:
											{
												avatar: "test-pull-request-author-avatar",
												name: "test-pull-request-author-login",
												email: "test-pull-request-author-login@noreply.user.github.com",
												url: "test-pull-request-author-url"
											},
										commentCount: "test-pull-request-comment-count",
										destinationBranch: "test-pull-request-base-url/tree/test-pull-request-base-ref",
										displayId: "#1",
										id: 1,
										issueKeys:
											[
												"TEST-123",
												"TEST-321",
												"TEST-124"
											],
										lastUpdate: "test-pull-request-update-time",
										reviewers:
											[
												{
													avatar: "test-pull-request-reviewer-avatar",
													name: "test-pull-request-reviewer-login",
													email: "test-pull-request-reviewer-login@noreply.user.github.com",
													url: "https://github.com/reviewer",
													approvalStatus: "APPROVED"
												}
											],
										sourceBranch: "TEST-321-test-pull-request-head-ref",
										sourceBranchUrl: "test-pull-request-head-url/tree/TEST-321-test-pull-request-head-ref",
										status: "OPEN",
										timestamp: "test-pull-request-update-time",
										title: "[TEST-123] Test pull request.",
										url: "test-pull-request-url",
										updateSequenceId: 12345678
									}
								],
							updateSequenceId: 12345678
						}
					],
				properties:
					{
						installationId: 1234
					}
			}).reply(200);

			Date.now = jest.fn(() => 12345678);

			await expect(app.receive(fixture[2])).toResolve();
		});
	});
});
