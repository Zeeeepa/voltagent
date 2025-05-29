import * as fs from "fs/promises";
import type { Finding, AutoFixResult, ImportIssue } from "../types";

/**
 * Auto-fixer for dependency validation issues
 */
export class AutoFixer {
  /**
   * Apply automatic fixes to findings
   */
  async applyFixes(findings: Finding[]): Promise<AutoFixResult[]> {
    const results: AutoFixResult[] = [];
    
    // Group findings by file for efficient processing
    const findingsByFile = this.groupFindingsByFile(findings);
    
    for (const [filePath, fileFindings] of findingsByFile) {
      try {
        const result = await this.fixFile(filePath, fileFindings);
        if (result) {
          results.push(result);
        }
      } catch (error) {
        console.warn(`Failed to auto-fix ${filePath}:`, error);
      }
    }
    
    return results;
  }

  /**
   * Fix issues in a single file
   */
  private async fixFile(filePath: string, findings: Finding[]): Promise<AutoFixResult | null> {
    const originalContent = await fs.readFile(filePath, "utf-8");
    let fixedContent = originalContent;
    const appliedFixes: AutoFixResult["appliedFixes"] = [];
    
    // Sort findings by line number in descending order to avoid line number shifts
    const sortedFindings = findings
      .filter((f): f is ImportIssue => "line" in f && "auto_fixable" in f && f.auto_fixable)
      .sort((a, b) => b.line - a.line);
    
    for (const finding of sortedFindings) {
      const fix = await this.applyFix(fixedContent, finding);
      if (fix) {
        fixedContent = fix.content;
        appliedFixes.push({
          line: finding.line,
          type: finding.issue,
          description: fix.description,
        });
      }
    }
    
    // Only return result if changes were made
    if (fixedContent !== originalContent) {
      // Write the fixed content back to the file
      await fs.writeFile(filePath, fixedContent, "utf-8");
      
      return {
        file: filePath,
        originalContent,
        fixedContent,
        appliedFixes,
      };
    }
    
    return null;
  }

  /**
   * Apply a single fix to content
   */
  private async applyFix(
    content: string,
    finding: ImportIssue
  ): Promise<{ content: string; description: string } | null> {
    const lines = content.split("\n");
    
    if (finding.line > lines.length || finding.line < 1) {
      return null;
    }
    
    const lineIndex = finding.line - 1;
    const line = lines[lineIndex];
    
    switch (finding.issue) {
      case "unused_import":
        return this.fixUnusedImport(lines, lineIndex, finding);
      
      case "duplicate_import":
        return this.fixDuplicateImport(lines, lineIndex, finding);
      
      case "incorrect_import":
        return this.fixIncorrectImport(lines, lineIndex, finding);
      
      default:
        return null;
    }
  }

  /**
   * Fix unused import
   */
  private fixUnusedImport(
    lines: string[],
    lineIndex: number,
    finding: ImportIssue
  ): { content: string; description: string } | null {
    const line = lines[lineIndex];
    
    // Check if this is a side-effect import (should not be removed)
    if (this.isSideEffectImport(line)) {
      return null;
    }
    
    // Remove the entire import line
    lines.splice(lineIndex, 1);
    
    // Remove empty lines that might be left behind
    this.removeExtraEmptyLines(lines, lineIndex);
    
    return {
      content: lines.join("\n"),
      description: `Removed unused import '${finding.import}'`,
    };
  }

  /**
   * Fix duplicate import
   */
  private fixDuplicateImport(
    lines: string[],
    lineIndex: number,
    finding: ImportIssue
  ): { content: string; description: string } | null {
    // Remove the duplicate import line
    lines.splice(lineIndex, 1);
    
    // Remove empty lines that might be left behind
    this.removeExtraEmptyLines(lines, lineIndex);
    
    return {
      content: lines.join("\n"),
      description: `Removed duplicate import of '${finding.import}'`,
    };
  }

  /**
   * Fix incorrect import (basic path corrections)
   */
  private fixIncorrectImport(
    lines: string[],
    lineIndex: number,
    finding: ImportIssue
  ): { content: string; description: string } | null {
    const line = lines[lineIndex];
    
    // Try to fix common import path issues
    let fixedLine = line;
    
    // Fix missing file extensions
    if (finding.import.match(/^\.\.?\//)) {
      const withExtension = this.addMissingExtension(finding.import);
      if (withExtension !== finding.import) {
        fixedLine = line.replace(finding.import, withExtension);
      }
    }
    
    // Fix incorrect relative paths
    const correctedPath = this.correctRelativePath(finding.import);
    if (correctedPath !== finding.import) {
      fixedLine = line.replace(finding.import, correctedPath);
    }
    
    if (fixedLine !== line) {
      lines[lineIndex] = fixedLine;
      return {
        content: lines.join("\n"),
        description: `Corrected import path from '${finding.import}' to '${correctedPath || this.addMissingExtension(finding.import)}'`,
      };
    }
    
    return null;
  }

  /**
   * Check if import is a side-effect import
   */
  private isSideEffectImport(line: string): boolean {
    // Side-effect imports: import 'module' or import './file'
    return /^import\s+['"`][^'"`]+['"`]\s*;?\s*$/.test(line.trim());
  }

  /**
   * Remove extra empty lines
   */
  private removeExtraEmptyLines(lines: string[], startIndex: number): void {
    // Remove consecutive empty lines, but keep at most one
    let emptyLineCount = 0;
    let currentIndex = startIndex;
    
    while (currentIndex < lines.length && lines[currentIndex].trim() === "") {
      emptyLineCount++;
      currentIndex++;
    }
    
    // Keep at most one empty line
    if (emptyLineCount > 1) {
      lines.splice(startIndex, emptyLineCount - 1);
    }
  }

  /**
   * Add missing file extension
   */
  private addMissingExtension(importPath: string): string {
    // Only add extensions to relative imports
    if (!importPath.match(/^\.\.?\//)) {
      return importPath;
    }
    
    // Check if extension is already present
    if (importPath.match(/\.(ts|tsx|js|jsx|mts|cts)$/)) {
      return importPath;
    }
    
    // Add .ts extension by default (could be made configurable)
    return importPath + ".ts";
  }

  /**
   * Correct common relative path issues
   */
  private correctRelativePath(importPath: string): string {
    // This is a simplified implementation
    // In a real scenario, you'd analyze the file system structure
    
    // Fix double slashes
    let corrected = importPath.replace(/\/+/g, "/");
    
    // Fix incorrect parent directory references
    corrected = corrected.replace(/\/\.\//g, "/");
    
    return corrected;
  }

  /**
   * Group findings by file path
   */
  private groupFindingsByFile(findings: Finding[]): Map<string, Finding[]> {
    const grouped = new Map<string, Finding[]>();
    
    for (const finding of findings) {
      if ("file" in finding) {
        const filePath = finding.file;
        if (!grouped.has(filePath)) {
          grouped.set(filePath, []);
        }
        grouped.get(filePath)!.push(finding);
      }
    }
    
    return grouped;
  }

  /**
   * Organize imports in a file (bonus feature)
   */
  async organizeImports(filePath: string): Promise<AutoFixResult | null> {
    const content = await fs.readFile(filePath, "utf-8");
    const lines = content.split("\n");
    
    const imports: { line: string; index: number; module: string; isExternal: boolean }[] = [];
    const nonImportLines: { line: string; index: number }[] = [];
    
    // Separate imports from other code
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const importMatch = line.match(/^import\s+.*?from\s+['"`]([^'"`]+)['"`]/);
      
      if (importMatch) {
        imports.push({
          line,
          index: i,
          module: importMatch[1],
          isExternal: !importMatch[1].startsWith("."),
        });
      } else {
        nonImportLines.push({ line, index: i });
      }
    }
    
    if (imports.length === 0) {
      return null;
    }
    
    // Sort imports: external first, then internal, alphabetically within each group
    imports.sort((a, b) => {
      if (a.isExternal !== b.isExternal) {
        return a.isExternal ? -1 : 1;
      }
      return a.module.localeCompare(b.module);
    });
    
    // Rebuild the file with organized imports
    const organizedLines: string[] = [];
    
    // Add external imports
    const externalImports = imports.filter(imp => imp.isExternal);
    if (externalImports.length > 0) {
      organizedLines.push(...externalImports.map(imp => imp.line));
      organizedLines.push(""); // Empty line after external imports
    }
    
    // Add internal imports
    const internalImports = imports.filter(imp => !imp.isExternal);
    if (internalImports.length > 0) {
      organizedLines.push(...internalImports.map(imp => imp.line));
      organizedLines.push(""); // Empty line after internal imports
    }
    
    // Add non-import lines (skip the original import lines)
    const importIndices = new Set(imports.map(imp => imp.index));
    for (const { line, index } of nonImportLines) {
      if (!importIndices.has(index)) {
        organizedLines.push(line);
      }
    }
    
    const organizedContent = organizedLines.join("\n");
    
    if (organizedContent !== content) {
      await fs.writeFile(filePath, organizedContent, "utf-8");
      
      return {
        file: filePath,
        originalContent: content,
        fixedContent: organizedContent,
        appliedFixes: [{
          line: 1,
          type: "unused_import", // Using as a generic type
          description: "Organized and sorted import statements",
        }],
      };
    }
    
    return null;
  }
}

