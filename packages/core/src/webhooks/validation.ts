/**
 * Webhook Validation System
 * Provides secure validation for different webhook sources
 */

import { createHmac, timingSafeEqual } from "crypto";
import type { WebhookValidationConfig, WebhookPayload } from "./types";

/**
 * Webhook validation error
 */
export class WebhookValidationError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "WebhookValidationError";
  }
}

/**
 * Webhook validator class
 */
export class WebhookValidator {
  /**
   * Validate a webhook payload
   */
  static async validate(
    payload: string,
    headers: Record<string, string>,
    config: WebhookValidationConfig
  ): Promise<boolean> {
    switch (config.method) {
      case "hmac-sha256":
        return this.validateHmacSha256(payload, headers, config);
      case "hmac-sha1":
        return this.validateHmacSha1(payload, headers, config);
      case "secret":
        return this.validateSecret(headers, config);
      case "none":
        return true;
      default:
        throw new WebhookValidationError(
          `Unsupported validation method: ${config.method}`,
          "UNSUPPORTED_METHOD"
        );
    }
  }

  /**
   * Validate HMAC-SHA256 signature (GitHub style)
   */
  private static validateHmacSha256(
    payload: string,
    headers: Record<string, string>,
    config: WebhookValidationConfig
  ): boolean {
    if (!config.secret) {
      throw new WebhookValidationError(
        "Secret is required for HMAC-SHA256 validation",
        "MISSING_SECRET"
      );
    }

    const signatureHeader = config.signatureHeader || "x-hub-signature-256";
    const signature = headers[signatureHeader] || headers[signatureHeader.toLowerCase()];

    if (!signature) {
      throw new WebhookValidationError(
        `Missing signature header: ${signatureHeader}`,
        "MISSING_SIGNATURE"
      );
    }

    // GitHub format: sha256=<signature>
    const expectedSignature = signature.startsWith("sha256=") 
      ? signature.slice(7) 
      : signature;

    const hmac = createHmac("sha256", config.secret);
    hmac.update(payload, "utf8");
    const computedSignature = hmac.digest("hex");

    try {
      return timingSafeEqual(
        Buffer.from(expectedSignature, "hex"),
        Buffer.from(computedSignature, "hex")
      );
    } catch (error) {
      throw new WebhookValidationError(
        "Invalid signature format",
        "INVALID_SIGNATURE_FORMAT"
      );
    }
  }

  /**
   * Validate HMAC-SHA1 signature
   */
  private static validateHmacSha1(
    payload: string,
    headers: Record<string, string>,
    config: WebhookValidationConfig
  ): boolean {
    if (!config.secret) {
      throw new WebhookValidationError(
        "Secret is required for HMAC-SHA1 validation",
        "MISSING_SECRET"
      );
    }

    const signatureHeader = config.signatureHeader || "x-hub-signature";
    const signature = headers[signatureHeader] || headers[signatureHeader.toLowerCase()];

    if (!signature) {
      throw new WebhookValidationError(
        `Missing signature header: ${signatureHeader}`,
        "MISSING_SIGNATURE"
      );
    }

    // GitHub format: sha1=<signature>
    const expectedSignature = signature.startsWith("sha1=") 
      ? signature.slice(5) 
      : signature;

    const hmac = createHmac("sha1", config.secret);
    hmac.update(payload, "utf8");
    const computedSignature = hmac.digest("hex");

    try {
      return timingSafeEqual(
        Buffer.from(expectedSignature, "hex"),
        Buffer.from(computedSignature, "hex")
      );
    } catch (error) {
      throw new WebhookValidationError(
        "Invalid signature format",
        "INVALID_SIGNATURE_FORMAT"
      );
    }
  }

  /**
   * Validate using a simple secret
   */
  private static validateSecret(
    headers: Record<string, string>,
    config: WebhookValidationConfig
  ): boolean {
    if (!config.secret) {
      throw new WebhookValidationError(
        "Secret is required for secret validation",
        "MISSING_SECRET"
      );
    }

    const secretHeader = config.signatureHeader || "x-webhook-secret";
    const providedSecret = headers[secretHeader] || headers[secretHeader.toLowerCase()];

    if (!providedSecret) {
      throw new WebhookValidationError(
        `Missing secret header: ${secretHeader}`,
        "MISSING_SECRET_HEADER"
      );
    }

    return timingSafeEqual(
      Buffer.from(config.secret, "utf8"),
      Buffer.from(providedSecret, "utf8")
    );
  }

  /**
   * Validate using custom validator
   */
  static async validateCustom(
    payload: any,
    headers: Record<string, string>,
    validator: (payload: any, headers: Record<string, string>) => boolean
  ): Promise<boolean> {
    try {
      return validator(payload, headers);
    } catch (error) {
      throw new WebhookValidationError(
        `Custom validation failed: ${error instanceof Error ? error.message : String(error)}`,
        "CUSTOM_VALIDATION_FAILED"
      );
    }
  }
}

/**
 * GitHub-specific webhook validation
 */
export class GitHubWebhookValidator {
  /**
   * Validate GitHub webhook
   */
  static async validate(
    payload: string,
    headers: Record<string, string>,
    secret: string
  ): Promise<boolean> {
    const config: WebhookValidationConfig = {
      method: "hmac-sha256",
      secret,
      signatureHeader: "x-hub-signature-256"
    };

    return WebhookValidator.validate(payload, headers, config);
  }

  /**
   * Extract GitHub event type from headers
   */
  static getEventType(headers: Record<string, string>): string | null {
    return headers["x-github-event"] || headers["X-GitHub-Event"] || null;
  }

  /**
   * Extract GitHub delivery ID from headers
   */
  static getDeliveryId(headers: Record<string, string>): string | null {
    return headers["x-github-delivery"] || headers["X-GitHub-Delivery"] || null;
  }

  /**
   * Check if webhook is from GitHub
   */
  static isGitHubWebhook(headers: Record<string, string>): boolean {
    const userAgent = headers["user-agent"] || headers["User-Agent"] || "";
    return userAgent.startsWith("GitHub-Hookshot/");
  }
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** Error message if validation failed */
  error?: string;
  /** Error code if validation failed */
  errorCode?: string;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Comprehensive webhook validator with result details
 */
export class ComprehensiveWebhookValidator {
  /**
   * Validate webhook with detailed result
   */
  static async validateWithResult(
    payload: string,
    headers: Record<string, string>,
    config: WebhookValidationConfig
  ): Promise<ValidationResult> {
    try {
      // Custom validation takes precedence
      if (config.customValidator) {
        const valid = await WebhookValidator.validateCustom(
          JSON.parse(payload),
          headers,
          config.customValidator
        );
        return { valid };
      }

      const valid = await WebhookValidator.validate(payload, headers, config);
      return { valid };
    } catch (error) {
      if (error instanceof WebhookValidationError) {
        return {
          valid: false,
          error: error.message,
          errorCode: error.code
        };
      }

      return {
        valid: false,
        error: error instanceof Error ? error.message : String(error),
        errorCode: "VALIDATION_ERROR"
      };
    }
  }

  /**
   * Validate GitHub webhook with detailed result
   */
  static async validateGitHubWithResult(
    payload: string,
    headers: Record<string, string>,
    secret: string
  ): Promise<ValidationResult> {
    try {
      const valid = await GitHubWebhookValidator.validate(payload, headers, secret);
      const eventType = GitHubWebhookValidator.getEventType(headers);
      const deliveryId = GitHubWebhookValidator.getDeliveryId(headers);

      return {
        valid,
        metadata: {
          eventType,
          deliveryId,
          isGitHub: GitHubWebhookValidator.isGitHubWebhook(headers)
        }
      };
    } catch (error) {
      if (error instanceof WebhookValidationError) {
        return {
          valid: false,
          error: error.message,
          errorCode: error.code
        };
      }

      return {
        valid: false,
        error: error instanceof Error ? error.message : String(error),
        errorCode: "GITHUB_VALIDATION_ERROR"
      };
    }
  }
}

