import { processPush } from "../transforms/push";
import { createInstallationClient } from "~/src/util/get-github-client-config";
import { MessageHandler, PushQueueMessagePayload, SQSMessageContext } from "./sqs.types";

export const pushQueueMessageHandler: MessageHandler<PushQueueMessagePayload> = async (context: SQSMessageContext<PushQueueMessagePayload>) => {
	const { payload } = context;
	const { webhookId, installationId, jiraHost } = payload;
	context.log = context.log.child({
		webhookId,
		jiraHost,
		gitHubInstallationId: installationId
	});
	context.log.info("Handling push message from the SQS queue");
	const metrics = {
		trigger: "webhook",
		subTrigger: "push"
	};
	const gitHubInstallationClient = await createInstallationClient(installationId, jiraHost, metrics, context.log, payload.gitHubAppConfig?.gitHubAppId);
	await processPush(gitHubInstallationClient, payload, context.log);
};
