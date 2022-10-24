import { Installation } from "models/installation";
import express, { Express, NextFunction, Request, Response } from "express";
import { RootRouter } from "routes/router";
import supertest from "supertest";
import { getLogger } from "config/logger";
import { encodeSymmetric } from "atlassian-jwt";
import { GitHubServerApp } from "models/github-server-app";

describe("PUT /jira/connect/enterprise/app/:uuid", () => {
	let app: Express;
	let installation: Installation;
	let jwt: string;
	const uuid = "4c74e9ce-faf9-489e-821f-e7a8006e473a";

	beforeEach(async () => {
		installation = await Installation.install({
			host: jiraHost,
			sharedSecret: "shared-secret",
			clientKey: "client-key"
		});

		app = express();
		app.use((req: Request, res: Response, next: NextFunction) => {
			res.locals = { installation };
			req.log = getLogger("test");
			req.session = { jiraHost };
			req.params = { uuid };
			next();
		});
		app.use(RootRouter);

		jwt = encodeSymmetric({
			qsh: "context-qsh",
			iss: jiraHost
		}, await installation.decrypt("encryptedSharedSecret"));
	});

	it("should return 202 when correct uuid and installation id are passed", async () => {
		await GitHubServerApp.create({
			uuid,
			appId: 1,
			gitHubAppName: "my awesome app",
			gitHubBaseUrl: "http://myinternalinstance.com",
			gitHubClientId: "lvl.1n23j12389wndd",
			gitHubClientSecret: "secret",
			webhookSecret: "anothersecret",
			privateKey: "privatekey",
			installationId: installation.id
		});

		const payload ={
			gitHubAppName: "my-app",
			webhookSecret: `secret`,
			appId: "1",
			gitHubClientId: "Iv1.msdnf2893rwhdbf",
			gitHubClientSecret: "secret",
			uuid,
			gitHubBaseUrl: "http://testserver.com",
			privateKey: "privatekeycontents",
			jiraHost
		};

		await supertest(app)
			.put(`/jira/connect/enterprise/app/${uuid}`)
			.query({
				jwt
			})
			.send(payload)
			.expect(202);
	});

	it("should return 202 when correct uuid and installation id are passed, with partial data", async () => {
		await GitHubServerApp.create({
			uuid,
			appId: 1,
			gitHubAppName: "my awesome app",
			gitHubBaseUrl: "http://myinternalinstance.com",
			gitHubClientId: "lvl.1n23j12389wndd",
			gitHubClientSecret: "secret",
			webhookSecret: "anothersecret",
			privateKey: "privatekey",
			installationId: installation.id
		});

		const payload ={
			gitHubAppName: "newName",
			webhookSecret: "newSecret",
			gitHubClientId: "Iv1.msdnf2893rwhdbf",
			gitHubClientSecret: "secret",
			uuid,
			jiraHost
		};

		await supertest(app)
			.put(`/jira/connect/enterprise/app/${uuid}`)
			.query({
				jwt
			})
			.send(payload)
			.expect(202);

		const restoredApp = (await GitHubServerApp.findForUuid(uuid))!;

		expect(restoredApp.gitHubAppName).toEqual('newName');
		expect(await restoredApp.getDecryptedWebhookSecret()).toEqual('newSecret');
		expect(await restoredApp.getDecryptedPrivateKey()).toEqual('privatekey');
		expect(await restoredApp.getDecryptedGitHubClientSecret()).toEqual('secret');
	});

	it("should return 404 when wrong uuid param is passed", async () => {
		await GitHubServerApp.create({
			uuid,
			appId: 1,
			gitHubAppName: "my awesome app",
			gitHubBaseUrl: "http://myinternalinstance.com",
			gitHubClientId: "lvl.1n23j12389wndd",
			gitHubClientSecret: "secret",
			webhookSecret: "anothersecret",
			privateKey: "privatekey",
			installationId: installation.id
		});

		const payload ={
			gitHubAppName: "my-app",
			webhookSecret: "secret",
			appId: "1",
			gitHubClientId: "Iv1.msdnf2893rwhdbf",
			gitHubClientSecret: "secret",
			uuid,
			gitHubBaseUrl: "http://testserver.com",
			privateKey: "privatekeycontents",
			jiraHost
		};

		const incorrectUUID = "4c74e9ce-faf9-489e-821f-e7a8006e473b";

		const res = await supertest(app)
			.put(`/jira/connect/enterprise/app/${incorrectUUID}`)
			.query({
				jwt
			})
			.send(payload)
			.expect(404);
		expect(res.body.message).toEqual("No GitHub App found. Cannot update.");

	});

	it("should return 404 when wrong installationId is passed", async () => {
		await GitHubServerApp.create({
			uuid,
			appId: 1,
			gitHubAppName: "my awesome app",
			gitHubBaseUrl: "http://myinternalinstance.com",
			gitHubClientId: "lvl.1n23j12389wndd",
			gitHubClientSecret: "secret",
			webhookSecret: "anothersecret",
			privateKey: "privatekey",
			installationId: 42
		});

		const payload ={
			gitHubAppName: "my-app",
			webhookSecret: "secret",
			appId: "1",
			gitHubClientId: "Iv1.msdnf2893rwhdbf",
			gitHubClientSecret: "secret",
			uuid,
			gitHubBaseUrl: "http://testserver.com",
			privateKey: "privatekeycontents",
			jiraHost
		};

		const res = await supertest(app)
			.put(`/jira/connect/enterprise/app/${uuid}`)
			.query({
				jwt
			})
			.send(payload)
			.expect(404);
		expect(res.body.message).toEqual("No GitHub App found. Cannot update.");
	});
});
