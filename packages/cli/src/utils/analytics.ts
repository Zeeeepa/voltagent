import { PostHog } from "posthog-node";
import { v4 as uuidv4 } from "uuid";
import os from "os";
import crypto from "crypto";

// Check if telemetry is disabled via environment variable
const isTelemetryDisabled = (): boolean => {
  return (
    process.env.VOLTAGENT_TELEMETRY_DISABLED === "1" ||
    process.env.VOLTAGENT_TELEMETRY_DISABLED === "true"
  );
};

// Initialize PostHog client
const client = new PostHog("phc_cLPjGbbZ9BdRtLG3cxoHNch3ZJnQvNhXCHRkeWUI6z5", {
  host: "https://us.i.posthog.com",
  flushAt: 1,
  flushInterval: 0,
  disableGeoip: false,
});

// Generate a machine-specific but anonymous ID
const getMachineId = (): string => {
  try {
    // Create a hash from stable machine properties
    const hostname = os.hostname();
    const cpus = os.cpus().length;
    const platform = os.platform();
    const arch = os.arch();

    const dataToHash = `${hostname}-${cpus}-${platform}-${arch}`;
    return crypto.createHash("sha256").update(dataToHash).digest("hex").substring(0, 32);
  } catch (error) {
    // Fallback to a random UUID if machine info isn't accessible
    return uuidv4();
  }
};

// Get OS info for analytics with fallback
const getOSInfo = () => {
  try {
    return {
      os_platform: os.platform(),
      os_release: os.release(),
      os_version: os.version(),
      os_arch: os.arch(),
    };
  } catch (error) {
    // Fallback to minimal info if OS info isn't accessible due to security restrictions
    return {
      os_platform: "unknown",
      os_release: "unknown",
      os_version: "unknown",
      os_arch: "unknown",
    };
  }
};

// Function to capture general events
export const captureEvent = (options: {
  event: string;
  properties: Record<string, any>;
}) => {
  // Skip if telemetry is disabled
  if (isTelemetryDisabled()) return;

  client.capture({
    distinctId: getMachineId(),
    event: options.event,
    properties: {
      ...options.properties,
      machine_id: getMachineId(),
      ...getOSInfo(),
    },
  });
};

// Function to capture CLI initialization events
export const captureInitEvent = (options: {
  packageManager: string;
}) => {
  // Skip if telemetry is disabled
  if (isTelemetryDisabled()) return;

  client.capture({
    distinctId: getMachineId(),
    event: "cli_init",
    properties: {
      package_manager: options.packageManager,
      machine_id: getMachineId(),
      ...getOSInfo(),
    },
  });
};

// Function to capture CLI update check events
export const captureUpdateEvent = (options: {
  hadUpdates: boolean;
}) => {
  // Skip if telemetry is disabled
  if (isTelemetryDisabled()) return;

  client.capture({
    distinctId: getMachineId(),
    event: "cli_update_check",
    properties: {
      had_updates: options.hadUpdates,
      machine_id: getMachineId(),
      ...getOSInfo(),
    },
  });
};

// Function to capture error events
export const captureError = (options: {
  command: string;
  errorMessage: string;
}) => {
  // Skip if telemetry is disabled
  if (isTelemetryDisabled()) return;

  client.capture({
    distinctId: getMachineId(),
    event: "cli_error",
    properties: {
      command: options.command,
      error_message: options.errorMessage,
      machine_id: getMachineId(),
      ...getOSInfo(),
    },
  });
};

// Function to capture whoami command events
export const captureWhoamiEvent = (options: {
  numVoltPackages: number;
}) => {
  // Skip if telemetry is disabled
  if (isTelemetryDisabled()) return;

  client.capture({
    distinctId: getMachineId(),
    event: "cli_whoami",
    properties: {
      num_volt_packages: options.numVoltPackages,
      machine_id: getMachineId(),
      ...getOSInfo(),
    },
  });
};

export default client;
