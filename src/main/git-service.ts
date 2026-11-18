import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { GitTelemetry } from "@openbot/contracts/ipc";
import { createOpenBotLogger, toLogValue } from "@openbot/logging";

const execFileAsync = promisify(execFile);
const logger = createOpenBotLogger("git-service");

export class GitService {
  /**
   * Reads the current branch, uncommitted modified count, and last commit details.
   * If the directory is not a Git repository, returns a clean default telemetry object.
   */
  async getTelemetry(workspacePath: string): Promise<GitTelemetry> {
    try {
      const [branchRes, statusRes, logRes] = await Promise.all([
        execFileAsync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
          cwd: workspacePath,
          encoding: "utf8",
          timeout: 5000,
        }).catch(() => ({ stdout: "unknown" })),
        execFileAsync("git", ["status", "--porcelain"], {
          cwd: workspacePath,
          encoding: "utf8",
          timeout: 5000,
        }).catch(() => ({ stdout: "" })),
        execFileAsync("git", ["log", "-1", "--format=%h|%an|%cr|%s"], {
          cwd: workspacePath,
          encoding: "utf8",
          timeout: 5000,
        }).catch(() => ({ stdout: "|||No commits yet" })),
      ]);

      if (branchRes.stdout.trim() === "unknown") {
        return {
          branch: "none",
          isClean: true,
          uncommittedCount: 0,
          lastCommitHash: "",
          lastCommitAuthor: "",
          lastCommitTime: "",
          lastCommitMessage: "Not a git repository",
        };
      }

      const branch = branchRes.stdout.trim() || "main";
      const statusLines = statusRes.stdout.trim().split("\n").filter(Boolean);
      const uncommittedCount = statusLines.length;
      const isClean = uncommittedCount === 0;

      const logParts = logRes.stdout.trim().split("|");
      const lastCommitHash = logParts[0] || "";
      const lastCommitAuthor = logParts[1] || "";
      const lastCommitTime = logParts[2] || "";
      const lastCommitMessage = logParts.slice(3).join("|") || "No commit history";

      return {
        branch,
        isClean,
        uncommittedCount,
        lastCommitHash,
        lastCommitAuthor,
        lastCommitTime,
        lastCommitMessage,
      };
    } catch (error) {
      logger.warn("Could not query git telemetry for workspace", workspacePath, toLogValue(error));
      return {
        branch: "none",
        isClean: true,
        uncommittedCount: 0,
        lastCommitHash: "",
        lastCommitAuthor: "",
        lastCommitTime: "",
        lastCommitMessage: "Not a git repository",
      };
    }
  }

  /**
   * Creates an isolated worktree for a project thread to prevent concurrent write collisions.
   */
  async createWorktree(repoPath: string, threadSlug: string): Promise<string> {
    const worktreeRel = `.openbot/worktrees/${threadSlug}`;
    const branchName = `openbot/${threadSlug}`;
    try {
      await execFileAsync("git", ["worktree", "add", "-B", branchName, worktreeRel], {
        cwd: repoPath,
        encoding: "utf8",
        timeout: 10000,
      });
      return worktreeRel;
    } catch (error) {
      logger.warn("Failed to create worktree, falling back to root repository path", toLogValue(error));
      return repoPath;
    }
  }

  /**
   * Removes an existing worktree when a thread is deleted.
   */
  async removeWorktree(repoPath: string, worktreePath: string): Promise<void> {
    if (worktreePath === repoPath) return;
    try {
      await execFileAsync("git", ["worktree", "remove", "--force", worktreePath], {
        cwd: repoPath,
        encoding: "utf8",
        timeout: 10000,
      });
    } catch (error) {
      logger.warn("Could not remove worktree", worktreePath, toLogValue(error));
    }
  }
}
