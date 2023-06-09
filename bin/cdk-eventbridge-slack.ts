#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { SlackStack } from '../lib/slack-stack';

const app = new cdk.App();

new SlackStack(app, 'SlackStack', {
  description: 'Delivers messages to Slack via EventBridge API Destinations',
  env: {
    account: '999999999999',
    region: 'us-east-1',
  },
  workspaceName: 'Acme.inc',
  botOauthTokenSecretArn: `arn:aws:secretsmanager:ap-southeast-2:999999999999:secret:flybuys/slack/bot-token-ws9w0N`,
});
