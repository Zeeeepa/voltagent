import { Application } from 'express';
import axios from 'axios';
import crypto from 'crypto';
import { logger } from '../common/logger';

// Interface for webhook registration
interface WebhookRegistration {
  id: string;
  url: string;
  events: string[];
  secret?: string;
  active: boolean;
  createdAt: Date;
}

// In-memory store for webhook registrations (would be replaced with a database in production)
const webhooks: WebhookRegistration[] = [];

/**
 * Setup webhook routes and handlers
 */
export const setupWebhooks = (app: Application) => {
  // Webhook test endpoint
  app.post('/api/webhooks/test', async (req, res) => {
    try {
      const { url, event, payload, secret } = req.body;
      
      if (!url || !event || !payload) {
        return res.status(400).json({ message: 'Missing required fields: url, event, payload' });
      }
      
      logger.info(`Testing webhook: ${url} for event: ${event}`);
      
      const result = await sendWebhook(url, event, payload, secret);
      
      res.json({
        success: result.success,
        statusCode: result.statusCode,
        message: result.message
      });
    } catch (error) {
      logger.error('Error testing webhook:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
};

/**
 * Register a new webhook
 */
export const registerWebhook = (registration: Omit<WebhookRegistration, 'id' | 'createdAt'>): WebhookRegistration => {
  const webhook: WebhookRegistration = {
    id: crypto.randomUUID(),
    url: registration.url,
    events: registration.events,
    secret: registration.secret,
    active: registration.active,
    createdAt: new Date()
  };
  
  webhooks.push(webhook);
  logger.info(`Registered webhook: ${webhook.id} for URL: ${webhook.url}`);
  
  return webhook;
};

/**
 * Update an existing webhook
 */
export const updateWebhook = (id: string, updates: Partial<Omit<WebhookRegistration, 'id' | 'createdAt'>>): WebhookRegistration | null => {
  const index = webhooks.findIndex(webhook => webhook.id === id);
  
  if (index === -1) {
    logger.warn(`Webhook not found: ${id}`);
    return null;
  }
  
  const webhook = webhooks[index];
  
  webhooks[index] = {
    ...webhook,
    ...updates
  };
  
  logger.info(`Updated webhook: ${id}`);
  
  return webhooks[index];
};

/**
 * Delete a webhook
 */
export const deleteWebhook = (id: string): boolean => {
  const index = webhooks.findIndex(webhook => webhook.id === id);
  
  if (index === -1) {
    logger.warn(`Webhook not found: ${id}`);
    return false;
  }
  
  webhooks.splice(index, 1);
  logger.info(`Deleted webhook: ${id}`);
  
  return true;
};

/**
 * Get all webhooks
 */
export const getWebhooks = (): WebhookRegistration[] => {
  return [...webhooks];
};

/**
 * Trigger webhooks for a specific event
 */
export const triggerWebhooks = async (event: string, payload: any): Promise<void> => {
  const matchingWebhooks = webhooks.filter(webhook => 
    webhook.active && webhook.events.includes(event)
  );
  
  logger.info(`Triggering ${matchingWebhooks.length} webhooks for event: ${event}`);
  
  const promises = matchingWebhooks.map(webhook => 
    sendWebhook(webhook.url, event, payload, webhook.secret)
  );
  
  await Promise.allSettled(promises);
};

/**
 * Send a webhook to a specific URL
 */
export const sendWebhook = async (
  url: string, 
  event: string, 
  payload: any, 
  secret?: string
): Promise<{ success: boolean; statusCode?: number; message: string }> => {
  try {
    const timestamp = Date.now().toString();
    const body = JSON.stringify({
      event,
      timestamp,
      payload
    });
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Event': event,
      'X-Webhook-Timestamp': timestamp
    };
    
    // Add signature if secret is provided
    if (secret) {
      const signature = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex');
      
      headers['X-Webhook-Signature'] = signature;
    }
    
    const response = await axios.post(url, body, { headers });
    
    logger.info(`Webhook sent successfully to ${url} for event: ${event}, status: ${response.status}`);
    
    return {
      success: true,
      statusCode: response.status,
      message: 'Webhook delivered successfully'
    };
  } catch (error) {
    const statusCode = error.response?.status;
    const errorMessage = error.response?.data?.message || error.message;
    
    logger.error(`Error sending webhook to ${url} for event: ${event}`, {
      statusCode,
      error: errorMessage
    });
    
    return {
      success: false,
      statusCode,
      message: `Failed to deliver webhook: ${errorMessage}`
    };
  }
};

