# CDK EventBridge Slack

A simple CDK app which creates an AWS EventBridge bus and API destination for sending messages to Slack.

The motivation behind this project is to be a simple, generic solution for sending messages to Slack from AWS.
Applications within AWS can simply send messages to the custom event bus with a payload targeting a specific Slack channel.

## Install

This project requires Node v18+.

```
npm install
```

## Setup

This typically needs to be done **once** per Slack workspace.

### 1. Create an app in Slack

First [create an app](https://api.slack.com/apps?new_app=1) in Slack.

The app must be configured with a Bot user with the `chat:write` scope.
This can be found under the **OAuth & Permissions** menu in your app's settings.

![Scopes UI](/images/slack-scopes.png)

### 2. Store bot token in AWS Secrets Manager

From the **OAuth & Permissions** page in your app's settings copy the **Bot User OAuth Token**.
The value must then be stored as plain text in AWS Secrets Manager prefixed with the word `Bearer ` e.g.

```
Bearer xoxb-9999999999999-4687200055635-HX6YDjXm0hz2YL3EsCDaIYDK
```

The `arn` of this secret must be supplied as the `botOauthTokenSecretArn` property passed to the `SlackStack` constructor.

## Configuration

Simply instantiate and configure your `SlackStack` in `bin/cdk-eventbridge-slack.ts`.

```typescript
new SlackStack(app, "SlackStack", {
  workspaceName: "My Workspace",
  botOauthTokenSecretArn:
    "arn:aws:secretsmanager:ap-southeast-2:999999999999:secret:slack-bot-token-QmBx39",
  organisationId: 'o-abcde12345' // optional
});
```

Note `workspaceName` is used to derive the name of the event bus. 
The workspace name is converted to kebab-case with '-slack' appended.
For example, the above stack instance will create an event bus named `my-workspace-slack`.

To allow publishing to the event bus cross-account within the same AWS Organisation, set `organisationId`.
This field is otherwise optional.
For more information see [Sending and receiving Amazon EventBridge events between AWS accounts](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-cross-account.html).

### Enabling channels (IMPORTANT!)

In order to post messages Slack app must be added to the receiving Slack channel.
This can be achieved by typing `/add` in the respective channel.

![Dialog for adding app to channel](images/add-app-to-channel.png)

## Deployment

```
npm run cdk -- deploy SlackStack
```

## Usage

Events sent to the EventBus created by `SlackStack` MUST contain a `message` object inside the `Detail` field.
The contents of the `message` object must be compatible with Slack's [postMessage API](https://api.slack.com/methods/chat.postMessage).
At a minimum this requires specifing a channel id in the `channel` field.
A channel's id can be found in Slack by right-clicking on a channel and selecting **View channel details**.
You will find the channel's id at the bottom of channel details dialog box.

The event MUST also have `DetailType` set to `slack-message` in order for the event to match the EventBridge rule created by `SlackStack`.

```json
{
  "message": {
      "channel": "C04KSNT9ABC",
      "text": "Hello world!"
  }
}
```

### Sending event via AWS CLI

```json
[
  {
    "EventBusName": "cdk-eventbridge-slack",
    "DetailType": "slack-message",
    "Detail": "{\"message\":{\"channel\":\"C04KSNT9ABC\",\"text\":\"Hello world!\"}}"
  }
]
```

```bash
aws events put-events --entries file://events.json
```

## Known issues

If you need to update the Slack token, it's best to redeploy your `SlackStack` instances.
EventBridge will copy the token value from the secret you provide to [a secret it creates itself](https://docs.aws.amazon.com/secretsmanager/latest/userguide/integrating_how-services-use-secrets_events.html).
Updating the token secret and redeploying `SlackStack` does not cause the EventBridge secret to be updated.

## References
https://serverlessland.com/patterns/eventbridge-api-destinations-slack