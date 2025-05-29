import type { PackageInfo, DeprecatedPackageIssue } from "../types";

/**
 * Checker for deprecated packages and security vulnerabilities
 */
export class DeprecationChecker {
  private deprecatedPackages: Map<string, DeprecationInfo> = new Map();

  constructor() {
    this.initializeDeprecatedPackages();
  }

  /**
   * Check for deprecated packages
   */
  async check(packages: PackageInfo[]): Promise<DeprecatedPackageIssue[]> {
    const findings: DeprecatedPackageIssue[] = [];

    for (const pkg of packages) {
      const deprecationInfo = await this.checkPackageDeprecation(pkg);
      if (deprecationInfo) {
        findings.push(deprecationInfo);
      }
    }

    return findings;
  }

  /**
   * Check if a specific package is deprecated
   */
  private async checkPackageDeprecation(pkg: PackageInfo): Promise<DeprecatedPackageIssue | null> {
    // Check against known deprecated packages
    const knownDeprecation = this.deprecatedPackages.get(pkg.name);
    if (knownDeprecation) {
      return {
        type: "deprecated_package",
        package: pkg.name,
        version: pkg.version,
        deprecationReason: knownDeprecation.reason,
        alternative: knownDeprecation.alternative,
        suggestion: this.generateDeprecationSuggestion(pkg.name, knownDeprecation),
        severity: knownDeprecation.severity,
        files: pkg.location ? [pkg.location] : [],
      };
    }

    // Check for version-specific deprecations
    const versionDeprecation = await this.checkVersionDeprecation(pkg);
    if (versionDeprecation) {
      return versionDeprecation;
    }

    // Check for security vulnerabilities (simplified)
    const securityIssue = await this.checkSecurityVulnerabilities(pkg);
    if (securityIssue) {
      return securityIssue;
    }

    return null;
  }

  /**
   * Check for version-specific deprecations
   */
  private async checkVersionDeprecation(pkg: PackageInfo): Promise<DeprecatedPackageIssue | null> {
    // This would typically query npm registry or other package databases
    // For now, we'll implement some common patterns

    // Check for very old versions (simplified heuristic)
    const version = this.parseVersion(pkg.version);
    if (version && version.major === 0) {
      return {
        type: "deprecated_package",
        package: pkg.name,
        version: pkg.version,
        deprecationReason: "Pre-1.0 version may be unstable",
        suggestion: `Consider upgrading ${pkg.name} to a stable 1.x version`,
        severity: "low",
        files: pkg.location ? [pkg.location] : [],
      };
    }

    return null;
  }

  /**
   * Check for security vulnerabilities
   */
  private async checkSecurityVulnerabilities(pkg: PackageInfo): Promise<DeprecatedPackageIssue | null> {
    // This would typically query security databases like npm audit
    // For demonstration, we'll check against some known vulnerable packages

    const vulnerablePackages = new Map([
      ["event-stream", { 
        reason: "Known malicious code injection", 
        severity: "high" as const,
        alternative: "Use built-in Node.js streams or other stream libraries"
      }],
      ["flatmap-stream", { 
        reason: "Known malicious code injection", 
        severity: "high" as const,
        alternative: "Use built-in Array.prototype.flatMap or other alternatives"
      }],
    ]);

    const vulnerability = vulnerablePackages.get(pkg.name);
    if (vulnerability) {
      return {
        type: "deprecated_package",
        package: pkg.name,
        version: pkg.version,
        deprecationReason: `Security vulnerability: ${vulnerability.reason}`,
        alternative: vulnerability.alternative,
        suggestion: `Remove ${pkg.name} immediately due to security vulnerability`,
        severity: vulnerability.severity,
        files: pkg.location ? [pkg.location] : [],
      };
    }

    return null;
  }

  /**
   * Generate deprecation suggestion
   */
  private generateDeprecationSuggestion(packageName: string, info: DeprecationInfo): string {
    if (info.alternative) {
      return `Replace deprecated package '${packageName}' with '${info.alternative}'. Reason: ${info.reason}`;
    }
    
    return `Remove deprecated package '${packageName}'. Reason: ${info.reason}`;
  }

  /**
   * Initialize known deprecated packages
   */
  private initializeDeprecatedPackages(): void {
    // Common deprecated packages in the JavaScript ecosystem
    this.deprecatedPackages.set("request", {
      reason: "Package is deprecated and no longer maintained",
      alternative: "axios, node-fetch, or built-in fetch",
      severity: "medium",
    });

    this.deprecatedPackages.set("gulp-util", {
      reason: "Package is deprecated, use individual utilities instead",
      alternative: "Individual gulp utilities or plugin-error",
      severity: "medium",
    });

    this.deprecatedPackages.set("babel-preset-es2015", {
      reason: "Deprecated in favor of babel-preset-env",
      alternative: "@babel/preset-env",
      severity: "medium",
    });

    this.deprecatedPackages.set("babel-core", {
      reason: "Deprecated in favor of @babel/core",
      alternative: "@babel/core",
      severity: "medium",
    });

    this.deprecatedPackages.set("babel-loader", {
      reason: "Old version, use latest babel-loader with @babel/core",
      alternative: "babel-loader@latest with @babel/core",
      severity: "low",
    });

    this.deprecatedPackages.set("node-uuid", {
      reason: "Package renamed to uuid",
      alternative: "uuid",
      severity: "low",
    });

    this.deprecatedPackages.set("native-promise-only", {
      reason: "Native Promise support is now universal",
      alternative: "Native Promise or remove dependency",
      severity: "low",
    });

    this.deprecatedPackages.set("left-pad", {
      reason: "Functionality available in native String.prototype.padStart",
      alternative: "String.prototype.padStart",
      severity: "low",
    });

    this.deprecatedPackages.set("mkdirp", {
      reason: "Functionality available in native fs.mkdir with recursive option",
      alternative: "fs.mkdir with recursive: true",
      severity: "low",
    });

    this.deprecatedPackages.set("rimraf", {
      reason: "Functionality available in native fs.rm with recursive option",
      alternative: "fs.rm with recursive: true",
      severity: "low",
    });

    // Security-related deprecations
    this.deprecatedPackages.set("event-stream", {
      reason: "Known malicious code injection vulnerability",
      alternative: "Use built-in Node.js streams",
      severity: "high",
    });

    this.deprecatedPackages.set("flatmap-stream", {
      reason: "Known malicious code injection vulnerability",
      alternative: "Use built-in Array.prototype.flatMap",
      severity: "high",
    });
  }

  /**
   * Parse version string
   */
  private parseVersion(version: string): { major: number; minor: number; patch: number } | null {
    const cleanVersion = version.replace(/^[\^~>=<]/, "").split("-")[0].split("+")[0];
    const match = cleanVersion.match(/^(\d+)\.(\d+)\.(\d+)/);
    
    if (!match) {
      return null;
    }
    
    return {
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
      patch: parseInt(match[3], 10),
    };
  }

  /**
   * Add custom deprecated package
   */
  addDeprecatedPackage(name: string, info: DeprecationInfo): void {
    this.deprecatedPackages.set(name, info);
  }

  /**
   * Remove deprecated package from list
   */
  removeDeprecatedPackage(name: string): void {
    this.deprecatedPackages.delete(name);
  }

  /**
   * Get all deprecated packages
   */
  getDeprecatedPackages(): Map<string, DeprecationInfo> {
    return new Map(this.deprecatedPackages);
  }
}

interface DeprecationInfo {
  reason: string;
  alternative?: string;
  severity: "low" | "medium" | "high";
}

