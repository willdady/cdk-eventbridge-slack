import { SecretValue, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { paramCase } from 'change-case';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';

export interface SlackStackProps extends StackProps {
  /**
   * The name of the Slack workspace
   */
  workspaceName: string;
  /**
   * AWS Secrets Manager arn containing a bot-user OAuth token
   */
  botOauthTokenSecretArn: string;
  /**
   * Grant PutEvents permission to AWS Organisation
   */
  organisationId?: string;
}

export class SlackStack extends Stack {
  constructor(scope: Construct, id: string, props: SlackStackProps) {
    super(scope, id, props);

    const eventBus = new events.EventBus(this, 'SlackEventBus', {
      eventBusName: `${paramCase(props.workspaceName)}-slack`,
    });
    if (props.organisationId) {
      eventBus.addToResourcePolicy(
        new iam.PolicyStatement({
          sid: 'GrantPutEventsOrgWide',
          principals: [new iam.OrganizationPrincipal(props.organisationId)],
          actions: ['events:PutEvents'],
          resources: ['*'],
        }),
      );
    }

    const connection = new events.Connection(this, 'Connection', {
      authorization: events.Authorization.apiKey(
        'Authorization',
        SecretValue.secretsManager(props.botOauthTokenSecretArn),
      ),
      description: `API connection to '${props.workspaceName}' Slack workspace`,
    });

    const destination = new events.ApiDestination(this, 'Destination', {
      connection,
      endpoint: 'https://slack.com/api/chat.postMessage',
      description: `Slack chat.postMessage endpoint`,
      rateLimitPerSecond: 10,
    });

    new events.Rule(this, 'Rule', {
      ruleName: 'slack-message',
      eventBus,
      eventPattern: {
        detailType: ['slack-message'],
      },
      targets: [
        new targets.ApiDestination(destination, {
          event: events.RuleTargetInput.fromEventPath('$.detail.message'),
        }),
      ],
    });
  }
}
