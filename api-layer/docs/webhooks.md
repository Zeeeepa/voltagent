# Webhook Integration Guide

This guide explains how to use webhooks with the Workflow Orchestration API to receive real-time notifications about workflow events.

## Overview

Webhooks allow you to receive real-time notifications when specific events occur in the workflow orchestration system. When an event occurs, the system sends an HTTP POST request to the URL you specified when registering the webhook.

## Registering a Webhook

To register a webhook, make a POST request to the `/api/webhooks` endpoint:

```http
POST /api/webhooks
Content-Type: application/json
Authorization: Bearer your-jwt-token

{
  "url": "https://example.com/webhook",
  "events": ["workflow.execution.completed", "task.execution.failed"],
  "secret": "your-webhook-secret"
}
```

### Request Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `url` | string | The URL to which the webhook will send HTTP POST requests |
| `events` | array | Array of event types to subscribe to |
| `secret` | string | (Optional) A secret string used to sign the webhook payload |

### Response

```json
{
  "id": "1",
  "url": "https://example.com/webhook",
  "events": ["workflow.execution.completed", "task.execution.failed"],
  "secret": "your-webhook-secret",
  "active": true,
  "createdAt": "2025-05-21T21:26:58.211Z"
}
```

## Supported Event Types

The following event types are supported:

### Workflow Definition Events

- `workflow.definition.created`: A new workflow definition has been created
- `workflow.definition.updated`: A workflow definition has been updated
- `workflow.definition.deleted`: A workflow definition has been deleted

### Workflow Execution Events

- `workflow.execution.started`: A workflow execution has started
- `workflow.execution.completed`: A workflow execution has completed successfully
- `workflow.execution.failed`: A workflow execution has failed
- `workflow.execution.cancelled`: A workflow execution has been cancelled

### Task Execution Events

- `task.execution.started`: A task execution has started
- `task.execution.completed`: A task execution has completed successfully
- `task.execution.failed`: A task execution has failed
- `task.execution.cancelled`: A task execution has been cancelled

### Progress Tracking Events

- `progress.updated`: Progress has been updated for a workflow execution
- `blocker.detected`: A blocker has been detected in a workflow execution
- `blocker.resolved`: A blocker has been resolved in a workflow execution
- `milestone.achieved`: A milestone has been achieved in a workflow execution

### Resource Management Events

- `resource.allocated`: Resources have been allocated for a task execution
- `resource.released`: Resources have been released after a task execution
- `resource.shortage`: A resource shortage has been detected

### Synchronization Events

- `synchronization.point.reached`: A synchronization point has been reached
- `synchronization.point.completed`: A synchronization point has been completed
- `synchronization.point.failed`: A synchronization point has failed

### System Events

- `system.error`: A system error has occurred
- `system.warning`: A system warning has occurred
- `system.info`: A system information event has occurred

## Webhook Payload

When an event occurs, the system sends an HTTP POST request to the URL you specified. The request body contains a JSON payload with the following structure:

```json
{
  "event": "workflow.execution.completed",
  "timestamp": "2025-05-21T21:27:09.442Z",
  "payload": {
    "id": "1",
    "workflowDefinitionId": "1",
    "status": "COMPLETED",
    "startTime": "2025-05-21T21:26:58.211Z",
    "endTime": "2025-05-21T21:27:09.442Z"
  }
}
```

### Webhook Headers

The following headers are included in the webhook request:

| Header | Description |
|--------|-------------|
| `Content-Type` | Always set to `application/json` |
| `X-Webhook-Event` | The type of event that triggered the webhook |
| `X-Webhook-Timestamp` | The timestamp of the event in milliseconds since the Unix epoch |
| `X-Webhook-Signature` | (If a secret was provided) A signature of the request body |

## Webhook Signature Verification

If you provided a secret when registering the webhook, the system signs the request body using HMAC-SHA256 and includes the signature in the `X-Webhook-Signature` header. You can use this signature to verify that the request came from the workflow orchestration system.

Here's an example of how to verify the signature in Node.js:

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(requestBody, signature, secret) {
  const computedSignature = crypto
    .createHmac('sha256', secret)
    .update(requestBody)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(computedSignature)
  );
}

// In your webhook handler
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const secret = 'your-webhook-secret';
  const requestBody = JSON.stringify(req.body);
  
  if (!verifyWebhookSignature(requestBody, signature, secret)) {
    return res.status(401).send('Invalid signature');
  }
  
  // Process the webhook
  const event = req.body.event;
  const payload = req.body.payload;
  
  console.log(`Received webhook event: ${event}`);
  console.log('Payload:', payload);
  
  res.status(200).send('Webhook received');
});
```

## Testing Webhooks

You can test a webhook by making a POST request to the `/api/webhooks/test` endpoint:

```http
POST /api/webhooks/test
Content-Type: application/json
Authorization: Bearer your-jwt-token

{
  "url": "https://example.com/webhook",
  "event": "workflow.execution.completed",
  "payload": {
    "id": "1",
    "status": "COMPLETED"
  },
  "secret": "your-webhook-secret"
}
```

### Request Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `url` | string | The URL to which the test webhook will be sent |
| `event` | string | The event type to simulate |
| `payload` | object | The payload to include in the webhook |
| `secret` | string | (Optional) The secret to use for signing the webhook |

### Response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Webhook delivered successfully"
}
```

## Managing Webhooks

### Get All Webhooks

```http
GET /api/webhooks
Authorization: Bearer your-jwt-token
```

### Update a Webhook

```http
PUT /api/webhooks/{id}
Content-Type: application/json
Authorization: Bearer your-jwt-token

{
  "url": "https://example.com/updated-webhook",
  "events": ["workflow.execution.completed", "workflow.execution.failed"],
  "active": true
}
```

### Delete a Webhook

```http
DELETE /api/webhooks/{id}
Authorization: Bearer your-jwt-token
```

## Best Practices

1. **Implement Idempotency**: Webhooks may be delivered more than once in rare cases. Design your webhook handler to be idempotent.

2. **Respond Quickly**: Your webhook handler should respond with a 2xx status code as quickly as possible. If processing takes time, acknowledge the webhook and process it asynchronously.

3. **Implement Retry Logic**: If your webhook handler is temporarily unavailable, the system will retry delivery with exponential backoff. Ensure your handler can handle retries.

4. **Use a Secret**: Always use a secret to verify webhook signatures and ensure the webhook came from the workflow orchestration system.

5. **Monitor Webhook Deliveries**: Monitor webhook deliveries and failures to ensure your integration is working correctly.

6. **Handle Errors Gracefully**: If your webhook handler encounters an error, log it and respond with an appropriate status code.

7. **Test Webhooks**: Use the webhook test endpoint to test your webhook handler before registering it.

## Troubleshooting

### Webhook Not Receiving Events

1. Check that the webhook URL is accessible from the internet
2. Verify that the webhook is active in the webhook management UI
3. Check that you're subscribed to the correct event types
4. Check your server logs for any errors in the webhook handler

### Invalid Signature Errors

1. Ensure you're using the correct secret
2. Verify that you're calculating the signature correctly
3. Check that you're using the raw request body for signature verification

### Webhook Timeouts

1. Ensure your webhook handler responds quickly (within a few seconds)
2. Consider implementing asynchronous processing for time-consuming tasks
3. Check for any performance issues in your webhook handler

