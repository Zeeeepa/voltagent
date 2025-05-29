import type { PackageInfo, VersionConflictIssue } from "../types";

/**
 * Analyzer for version conflicts and compatibility issues
 */
export class VersionAnalyzer {
  /**
   * Find version conflicts in package dependencies
   */
  async findConflicts(packages: PackageInfo[]): Promise<VersionConflictIssue[]> {
    const findings: VersionConflictIssue[] = [];
    
    // Group packages by name to find version conflicts
    const packagesByName = new Map<string, PackageInfo[]>();
    
    for (const pkg of packages) {
      if (!packagesByName.has(pkg.name)) {
        packagesByName.set(pkg.name, []);
      }
      packagesByName.get(pkg.name)!.push(pkg);
    }
    
    // Check for version conflicts
    for (const [packageName, packageVersions] of packagesByName) {
      if (packageVersions.length > 1) {
        const uniqueVersions = [...new Set(packageVersions.map(p => p.version))];
        
        if (uniqueVersions.length > 1) {
          const conflict = await this.analyzeVersionConflict(packageName, packageVersions);
          if (conflict) {
            findings.push(conflict);
          }
        }
      }
    }
    
    return findings;
  }

  /**
   * Analyze a specific version conflict
   */
  private async analyzeVersionConflict(
    packageName: string,
    versions: PackageInfo[]
  ): Promise<VersionConflictIssue | null> {
    const uniqueVersions = [...new Set(versions.map(p => p.version))];
    const files = versions.map(p => p.location).filter((loc): loc is string => !!loc);
    
    // Determine severity based on version differences
    const severity = this.calculateVersionConflictSeverity(uniqueVersions);
    
    // Generate suggestion
    const suggestion = this.generateVersionConflictSuggestion(packageName, uniqueVersions);
    
    return {
      type: "version_conflict",
      package: packageName,
      versions: uniqueVersions,
      suggestion,
      severity,
      files,
    };
  }

  /**
   * Calculate severity of version conflict
   */
  private calculateVersionConflictSeverity(versions: string[]): "low" | "medium" | "high" {
    const parsedVersions = versions.map(v => this.parseVersion(v)).filter(Boolean);
    
    if (parsedVersions.length < 2) {
      return "low";
    }
    
    // Check for major version differences
    const majorVersions = new Set(parsedVersions.map(v => v!.major));
    if (majorVersions.size > 1) {
      return "high";
    }
    
    // Check for minor version differences
    const minorVersions = new Set(parsedVersions.map(v => v!.minor));
    if (minorVersions.size > 1) {
      return "medium";
    }
    
    // Only patch differences
    return "low";
  }

  /**
   * Generate suggestion for resolving version conflict
   */
  private generateVersionConflictSuggestion(packageName: string, versions: string[]): string {
    const parsedVersions = versions.map(v => this.parseVersion(v)).filter(Boolean);
    
    if (parsedVersions.length === 0) {
      return `Resolve version conflict for ${packageName} by choosing a single version`;
    }
    
    // Find the highest version
    const sortedVersions = parsedVersions.sort((a, b) => {
      if (a!.major !== b!.major) return b!.major - a!.major;
      if (a!.minor !== b!.minor) return b!.minor - a!.minor;
      return b!.patch - a!.patch;
    });
    
    const highestVersion = sortedVersions[0];
    const recommendedVersion = `${highestVersion!.major}.${highestVersion!.minor}.${highestVersion!.patch}`;
    
    return `Resolve version conflict for ${packageName} by using version ${recommendedVersion} consistently across all dependencies`;
  }

  /**
   * Parse semantic version string
   */
  private parseVersion(version: string): { major: number; minor: number; patch: number } | null {
    // Remove common prefixes and suffixes
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
   * Check if two versions are compatible
   */
  isCompatible(version1: string, version2: string): boolean {
    const v1 = this.parseVersion(version1);
    const v2 = this.parseVersion(version2);
    
    if (!v1 || !v2) {
      return false;
    }
    
    // Same major version is generally compatible
    return v1.major === v2.major;
  }

  /**
   * Get the latest version from a list of versions
   */
  getLatestVersion(versions: string[]): string | null {
    const parsedVersions = versions
      .map(v => ({ original: v, parsed: this.parseVersion(v) }))
      .filter(v => v.parsed !== null);
    
    if (parsedVersions.length === 0) {
      return null;
    }
    
    const sorted = parsedVersions.sort((a, b) => {
      const pA = a.parsed!;
      const pB = b.parsed!;
      
      if (pA.major !== pB.major) return pB.major - pA.major;
      if (pA.minor !== pB.minor) return pB.minor - pA.minor;
      return pB.patch - pA.patch;
    });
    
    return sorted[0].original;
  }

  /**
   * Check if a version satisfies a range
   */
  satisfiesRange(version: string, range: string): boolean {
    const parsedVersion = this.parseVersion(version);
    const parsedRange = this.parseVersionRange(range);
    
    if (!parsedVersion || !parsedRange) {
      return false;
    }
    
    return this.versionSatisfiesRange(parsedVersion, parsedRange);
  }

  /**
   * Parse version range (simplified implementation)
   */
  private parseVersionRange(range: string): {
    operator: string;
    major: number;
    minor: number;
    patch: number;
  } | null {
    const match = range.match(/^([\^~>=<]+)?(\d+)\.(\d+)\.(\d+)/);
    if (!match) {
      return null;
    }
    
    return {
      operator: match[1] || "=",
      major: parseInt(match[2], 10),
      minor: parseInt(match[3], 10),
      patch: parseInt(match[4], 10),
    };
  }

  /**
   * Check if version satisfies range (simplified implementation)
   */
  private versionSatisfiesRange(
    version: { major: number; minor: number; patch: number },
    range: { operator: string; major: number; minor: number; patch: number }
  ): boolean {
    switch (range.operator) {
      case "^":
        // Compatible within same major version
        return version.major === range.major &&
               (version.minor > range.minor || 
                (version.minor === range.minor && version.patch >= range.patch));
      
      case "~":
        // Compatible within same minor version
        return version.major === range.major &&
               version.minor === range.minor &&
               version.patch >= range.patch;
      
      case ">=":
        return this.compareVersions(version, range) >= 0;
      
      case "<=":
        return this.compareVersions(version, range) <= 0;
      
      case ">":
        return this.compareVersions(version, range) > 0;
      
      case "<":
        return this.compareVersions(version, range) < 0;
      
      default:
        // Exact match
        return version.major === range.major &&
               version.minor === range.minor &&
               version.patch === range.patch;
    }
  }

  /**
   * Compare two versions (-1, 0, 1)
   */
  private compareVersions(
    v1: { major: number; minor: number; patch: number },
    v2: { major: number; minor: number; patch: number }
  ): number {
    if (v1.major !== v2.major) return v1.major - v2.major;
    if (v1.minor !== v2.minor) return v1.minor - v2.minor;
    return v1.patch - v2.patch;
  }
}

