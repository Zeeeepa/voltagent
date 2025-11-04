# Usage

This guide walks through creating an **Airtable trigger** step by step using the [YouTube to Blog example agent](https://voltagent.dev/examples/agents/youtube-blog-agent/). When a new YouTube URL is added to your Airtable base, the trigger fires and the agent converts the video into a blog post. The same workflow applies to other providers (Slack, Gmail, GitHub, Schedule).

:::tip To try this yourself
You'll need [VoltOps Console](https://console.voltagent.dev/) access, the [YouTube to Blog agent](https://voltagent.dev/examples/agents/youtube-blog-agent/#setup) example and an [Airtable](https://airtable.com/) account with a base and Personal Access Token (we'll show you how to create one).
:::

## Step 1: Trigger Connection

To set up a trigger, you first need to select a provider and configure its credentials.

<video autoPlay loop muted playsInline style={{width: '100%', height: 'auto'}}>

  <source src="/img/triggers/credentials.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>

<br/>
<br/>

In [VoltOps Triggers page](https://console.voltagent.dev/triggers), click **Add Trigger**, select Airtable provider, choose **`Record created`** event, and click **New credential** to configure authentication.

- **Connection Name**: Name for this credential ("Airtable credential")

- **Authentication**: Select **Personal access token** (OAuth 2.0 is also supported)

- **Access Token**: Go to [Airtable Token Creation](https://airtable.com/create/tokens) and create a new token with the following scopes:

```
data.records:read
data.records:write
schema.bases:read
```

:::tip Set ACCESS TOKEN SCOPE
![Airtable Credential Modal](/img/triggers/airtable-credential-modal.png)
:::

After pasting the token, click **Save credentials** proceed to trigger options.

## Step 2: Trigger Configuration

After configuring credentials, you need to specify which Airtable base, table, and field to monitor for new records. These settings determine when and how the trigger fires.

<video autoPlay loop muted playsInline style={{width: '100%', height: 'auto'}}>

  <source src="/img/triggers/setting-server.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>

<br/>
<br/>

Set the following trigger options based on your Airtable base structure:

- **Base**: Select your Airtable base
  → `AI Model Experiment Tracker`

- **Table**: Select the table to monitor for new records
  → `Experiments`

- **View**: (Optional) Select a specific view to monitor

- **Trigger Field**: Select the field that indicates when a record was created
  → `createdTime`

- **Poll Interval**: Set how often to check for new records (in seconds)
  → `60` (lower values increase API usage)

Click **Next** to review your settings, then create the binding with **Draft** status. Next, we'll need to add targets next to activate it.

## Step 3: Add Target to Activate Binding

After creating your binding, you need to add targets that will execute when the trigger fires. Targets are the agents or workflows hosted on a server that will process the trigger events.

Click **Add Your First Target** to open the target configuration modal with three tabs: **Target**, **Mapping**, and **Review**.

![trigger](/img/triggers/image.png)

<video autoPlay loop muted playsInline style={{width: '100%', height: 'auto'}}>

  <source src="/img/triggers/activate-binding.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>

<br/>
<br/>

### Target

We'll configure the server and destination here.

- **Agent Server**: First, click **+ New** to add a new server to host your agents and workflows. This opens the **Create Agent Server** modal with the following fields:
  - **Server Name**: Name for your server
    → Example: `Production server`
  - **URL**: Your server URL where agents are hosted
    → In this example, we're running locally with ngrok: `https://your-ngrok-url.ngrok.io`

Click **Create Server** to save and select the server you just created.

:::tip Running locally?
Use ngrok to expose your local server:

```bash
ngrok http 3141
```

Then use the ngrok URL (e.g., `https://abc123.ngrok.io`) as your server URL.
:::

- **Select an Agent**: Choose the agent or workflow you want to trigger. We'll choose `YouTubeToBlogCoordinator` from our example AI Agents.

Click **Next** to proceed to the Mapping tab.

### Mapping

The Mapping tab is where you transform the Airtable trigger payload into the format your agent expects. This involves capturing sample data from Airtable and mapping it to your agent's input structure.

The mapping flow has 3 steps:

##### **1. Capture Sample Data**

To create the mapping, you first need to capture a live payload from Airtable.

Click **Start Test Session**. The system will start listening for Airtable event with a countdown timer.

:::tip Now trigger your Airtable:

1. Go to your Airtable base
2. Add a new record to the table you configured
3. The system automatically captures the payload
   :::

Once captured, you'll see **Sample Captured** with a green checkmark. The **Captured Payload** section displays the data structure:

```json
{
  "provider": "airtable",
  "record": {
    "id": "rec7Nyu70ri1UNIz",
    "createdTime": "2025-10-31T12:52:29.000Z",
    "fields": {
      "Label": "jim morrison",
      "Created": "2025-10-31T12:52:29.000Z"
    },
    "pollAtAt": "2025-10-31T12:53:00.629Z"
  }
}
```

#### **2. Map Fields to Agent Input**

Now you'll map the captured Airtable data to your agent's expected input format.

**Captured Payload** - Shows the Airtable record data you just captured

**Mapping Template** - Shows your agent's input structure

:::tip How to map fields

Click on any property in the Captured Payload (left side), and it will insert `{{ path }}` into the mapping template at your cursor position.

For example, clicking on `"Label": "jim morrison"` in the captured payload inserts `{{record.fields.Label}}` into your template.

```json
{
  "input": {
    "topic": "{{ input.record.fields.Label }}"
  }
}
```

:::

#### **3. Preview and Test**

Review the final transformed payload in the **Preview** tab, then click **Test** to verify the mapping works correctly. The system will send the mapped payload to your agent and show the response.

If the test succeeds, your mapping is correct.

## Step 4: Activate Binding and Test

After adding your target, return to the trigger detail page and click **Activate** to start monitoring.

Test the trigger by adding a new record in your Airtable base:

1. Open your Airtable base and add a new record to the monitored table
2. Fill in the trigger field (e.g., `Label` field) and wait for the poll interval to pass

Go back to VoltOps Console and navigate to the **Agents** section from the sidebar. Click on the agent you connected to the trigger to view executions that were processed by the trigger.

You'll see a chart showing trigger execution history. We can use the **Triggers** and **Add Trigger** buttons to manage and add new triggers to this agent.
