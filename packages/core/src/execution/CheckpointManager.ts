/**
 * CheckpointManager.ts
 * 
 * Manages checkpoints for execution environments
 */

import { ExecutionAdapter, CommandResult } from './ExecutionAdapter';

/**
 * Checkpoint metadata
 */
export interface CheckpointMetadata {
  sessionId: string;
  toolExecutionId: string;
  hostCommit: string;
  reason: string;
  timestamp: string;
}

/**
 * Checkpoint snapshot result
 */
export interface CheckpointSnapshot {
  sha: string;
  bundle?: string;
}

/**
 * Initialize the checkpoint system
 * @param repoRoot Repository root path
 * @param sessionId Session ID
 * @param adapter Execution adapter
 */
export async function init(
  repoRoot: string,
  sessionId: string,
  adapter: ExecutionAdapter
): Promise<void> {
  try {
    // Create a shadow repository for checkpointing
    const shadowDir = `/tmp/voltagent-checkpoints/${sessionId}`;
    
    // Create the shadow directory
    await adapter.executeCommand('checkpoint-init', `mkdir -p "${shadowDir}"`);
    
    // Initialize git repository if it doesn't exist
    const { exitCode } = await adapter.executeCommand(
      'checkpoint-init',
      `cd "${shadowDir}" && [ -d .git ] || git init`
    );
    
    if (exitCode !== 0) {
      throw new Error('Failed to initialize shadow git repository');
    }
    
    // Configure git user
    await adapter.executeCommand(
      'checkpoint-init',
      `cd "${shadowDir}" && git config user.name "Voltagent Checkpoint" && git config user.email "checkpoint@voltagent.ai"`
    );
    
    // Create initial commit if needed
    const { stdout: hasCommits } = await adapter.executeCommand(
      'checkpoint-init',
      `cd "${shadowDir}" && git rev-parse --verify HEAD >/dev/null 2>&1 && echo "has_commits" || echo "no_commits"`
    );
    
    if (hasCommits.trim() === 'no_commits') {
      // Create an initial empty commit
      await adapter.executeCommand(
        'checkpoint-init',
        `cd "${shadowDir}" && git commit --allow-empty -m "Initial checkpoint commit"`
      );
    }
    
    console.log(`Checkpoint system initialized for session ${sessionId}`);
  } catch (error) {
    console.error('Failed to initialize checkpoint system:', error);
    throw error;
  }
}

/**
 * Create a checkpoint snapshot
 * @param metadata Checkpoint metadata
 * @param adapter Execution adapter
 * @param repoRoot Repository root path
 * @returns Checkpoint snapshot result
 */
export async function snapshot(
  metadata: CheckpointMetadata,
  adapter: ExecutionAdapter,
  repoRoot: string
): Promise<CheckpointSnapshot> {
  try {
    const shadowDir = `/tmp/voltagent-checkpoints/${metadata.sessionId}`;
    
    // Ensure shadow directory exists
    await adapter.executeCommand(
      metadata.toolExecutionId,
      `mkdir -p "${shadowDir}"`
    );
    
    // Copy current state to shadow repository
    await adapter.executeCommand(
      metadata.toolExecutionId,
      `rsync -a --exclude .git --exclude node_modules --exclude "*.log" "${repoRoot}/" "${shadowDir}/"`
    );
    
    // Stage all changes
    await adapter.executeCommand(
      metadata.toolExecutionId,
      `cd "${shadowDir}" && git add -A`
    );
    
    // Create commit with metadata
    const commitMessage = JSON.stringify(metadata, null, 2);
    await adapter.executeCommand(
      metadata.toolExecutionId,
      `cd "${shadowDir}" && git commit -m '${commitMessage.replace(/'/g, "'\\''")}' --allow-empty`
    );
    
    // Get commit SHA
    const { stdout: sha } = await adapter.executeCommand(
      metadata.toolExecutionId,
      `cd "${shadowDir}" && git rev-parse HEAD`
    );
    
    // Create bundle for export (optional)
    let bundle: string | undefined;
    try {
      const bundlePath = `/tmp/voltagent-checkpoints/${metadata.sessionId}-${metadata.toolExecutionId}.bundle`;
      
      await adapter.executeCommand(
        metadata.toolExecutionId,
        `cd "${shadowDir}" && git bundle create "${bundlePath}" HEAD^..HEAD`
      );
      
      // Read bundle as base64
      const { stdout: base64Bundle } = await adapter.executeCommand(
        metadata.toolExecutionId,
        `base64 -w 0 "${bundlePath}"`
      );
      
      bundle = base64Bundle.trim();
      
      // Clean up bundle file
      await adapter.executeCommand(
        metadata.toolExecutionId,
        `rm -f "${bundlePath}"`
      );
    } catch (error) {
      console.warn('Failed to create checkpoint bundle:', error);
      // Continue without bundle
    }
    
    return {
      sha: sha.trim(),
      bundle
    };
  } catch (error) {
    console.error('Failed to create checkpoint snapshot:', error);
    throw error;
  }
}

/**
 * Restore a checkpoint
 * @param sessionId Session ID
 * @param commitSha Commit SHA to restore
 * @param adapter Execution adapter
 * @param repoRoot Repository root path
 */
export async function restore(
  sessionId: string,
  commitSha: string,
  adapter: ExecutionAdapter,
  repoRoot: string
): Promise<void> {
  try {
    const shadowDir = `/tmp/voltagent-checkpoints/${sessionId}`;
    
    // Check if shadow repository exists
    const { exitCode } = await adapter.executeCommand(
      'checkpoint-restore',
      `[ -d "${shadowDir}/.git" ]`
    );
    
    if (exitCode !== 0) {
      throw new Error('Shadow repository does not exist');
    }
    
    // Check if commit exists
    const { exitCode: commitExists } = await adapter.executeCommand(
      'checkpoint-restore',
      `cd "${shadowDir}" && git cat-file -e ${commitSha}`
    );
    
    if (commitExists !== 0) {
      throw new Error(`Commit ${commitSha} does not exist in shadow repository`);
    }
    
    // Checkout the commit
    await adapter.executeCommand(
      'checkpoint-restore',
      `cd "${shadowDir}" && git checkout ${commitSha}`
    );
    
    // Copy shadow repository to working directory
    await adapter.executeCommand(
      'checkpoint-restore',
      `rsync -a --exclude .git --exclude node_modules --exclude "*.log" "${shadowDir}/" "${repoRoot}/"`
    );
    
    console.log(`Restored checkpoint ${commitSha} for session ${sessionId}`);
  } catch (error) {
    console.error('Failed to restore checkpoint:', error);
    throw error;
  }
}

/**
 * List all checkpoints for a session
 * @param sessionId Session ID
 * @param adapter Execution adapter
 * @returns List of checkpoints
 */
export async function list(
  sessionId: string,
  adapter: ExecutionAdapter
): Promise<Array<{ sha: string; metadata: CheckpointMetadata }>> {
  try {
    const shadowDir = `/tmp/voltagent-checkpoints/${sessionId}`;
    
    // Check if shadow repository exists
    const { exitCode } = await adapter.executeCommand(
      'checkpoint-list',
      `[ -d "${shadowDir}/.git" ]`
    );
    
    if (exitCode !== 0) {
      return [];
    }
    
    // Get all commits with their messages
    const { stdout } = await adapter.executeCommand(
      'checkpoint-list',
      `cd "${shadowDir}" && git log --pretty=format:"%H %B%n==COMMIT_SEPARATOR==" --reverse`
    );
    
    // Parse commits
    const commits = stdout.split('==COMMIT_SEPARATOR==')
      .filter(commit => commit.trim().length > 0)
      .map(commit => {
        const lines = commit.trim().split('\n');
        const sha = lines[0].split(' ')[0];
        const message = lines.slice(1).join('\n');
        
        try {
          const metadata = JSON.parse(message) as CheckpointMetadata;
          return { sha, metadata };
        } catch (error) {
          // Skip commits with invalid metadata
          return null;
        }
      })
      .filter((commit): commit is { sha: string; metadata: CheckpointMetadata } => commit !== null);
    
    return commits;
  } catch (error) {
    console.error('Failed to list checkpoints:', error);
    return [];
  }
}

