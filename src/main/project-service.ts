import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import type {
  AddKnowledgeSourceInput,
  CreateProjectInput,
  CreateProjectThreadInput,
  Project,
  ProjectKnowledgeSource,
  ProjectThread,
  ProjectThreadMember,
  SetThreadMemberStatusInput,
  UpdateThreadGitPolicyInput,
} from "@openbot/contracts/ipc";
import { createOpenBotLogger, toLogValue } from "@openbot/logging";
import type { GitService } from "./git-service";

const logger = createOpenBotLogger("project-service");

function generateId(): string {
  return randomBytes(16).toString("hex");
}

function nowIso(): string {
  return new Date().toISOString();
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "thread";
}

export class ProjectService {
  readonly #db: DatabaseSync;
  readonly #git: GitService;

  constructor(db: DatabaseSync, git: GitService) {
    this.#db = db;
    this.#git = git;
  }

  listProjects(): Project[] {
    const rows = this.#db
      .prepare(
        "SELECT id, name, workspace_path AS workspacePath, description, created_at AS createdAt, updated_at AS updatedAt FROM projects ORDER BY created_at DESC",
      )
      .all() as unknown as Project[];
    return rows;
  }

  getProject(projectId: string): Project | null {
    const row = this.#db
      .prepare(
        "SELECT id, name, workspace_path AS workspacePath, description, created_at AS createdAt, updated_at AS updatedAt FROM projects WHERE id = ?",
      )
      .get(projectId) as unknown as Project | undefined;
    return row ?? null;
  }

  async createProject(input: CreateProjectInput): Promise<Project> {
    const projectId = generateId();
    const threadId = generateId();
    const now = nowIso();

    const project: Project = {
      id: projectId,
      name: input.name,
      workspacePath: input.workspacePath,
      description: input.description ?? null,
      createdAt: now,
      updatedAt: now,
    };

    // Auto-create initial general thread
    const defaultThread: ProjectThread = {
      id: threadId,
      projectId,
      name: "general",
      slug: "general",
      worktreePath: input.workspacePath,
      gitPolicy: "automatic",
      createdAt: now,
      updatedAt: now,
    };

    this.#db
      .prepare(
        "INSERT INTO projects (id, name, workspace_path, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .run(project.id, project.name, project.workspacePath, project.description, project.createdAt, project.updatedAt);

    this.#db
      .prepare(
        "INSERT INTO project_threads (id, project_id, name, slug, worktree_path, git_policy, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .run(
        defaultThread.id,
        defaultThread.projectId,
        defaultThread.name,
        defaultThread.slug,
        defaultThread.worktreePath,
        defaultThread.gitPolicy,
        defaultThread.createdAt,
        defaultThread.updatedAt,
      );

    if (input.leadAgentId) {
      const memberId = generateId();
      this.#db
        .prepare(
          "INSERT INTO project_thread_members (id, thread_id, agent_id, is_lead, status, memory_mode, joined_at) VALUES (?, ?, ?, 1, 'active', 'intact', ?)",
        )
        .run(memberId, defaultThread.id, input.leadAgentId, now);
    }

    return project;
  }

  async deleteProject(projectId: string): Promise<void> {
    this.#db.prepare("DELETE FROM projects WHERE id = ?").run(projectId);
  }

  listProjectThreads(projectId: string): ProjectThread[] {
    return this.#db
      .prepare(
        "SELECT id, project_id AS projectId, name, slug, worktree_path AS worktreePath, git_policy AS gitPolicy, created_at AS createdAt, updated_at AS updatedAt FROM project_threads WHERE project_id = ? ORDER BY created_at ASC",
      )
      .all(projectId) as unknown as ProjectThread[];
  }

  async createProjectThread(input: CreateProjectThreadInput): Promise<ProjectThread> {
    const project = this.getProject(input.projectId);
    if (!project) throw new Error("Project not found");

    const threadId = generateId();
    const slug = input.slug || slugify(input.name);
    const now = nowIso();

    // Create an isolated worktree for non-general threads
    const worktreePath =
      slug === "general"
        ? project.workspacePath
        : await this.#git.createWorktree(project.workspacePath, slug);

    const thread: ProjectThread = {
      id: threadId,
      projectId: input.projectId,
      name: input.name,
      slug,
      worktreePath,
      gitPolicy: input.gitPolicy ?? "automatic",
      createdAt: now,
      updatedAt: now,
    };

    this.#db
      .prepare(
        "INSERT INTO project_threads (id, project_id, name, slug, worktree_path, git_policy, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .run(thread.id, thread.projectId, thread.name, thread.slug, thread.worktreePath, thread.gitPolicy, thread.createdAt, thread.updatedAt);

    if (input.leadAgentId) {
      const memberId = generateId();
      this.#db
        .prepare(
          "INSERT INTO project_thread_members (id, thread_id, agent_id, is_lead, status, memory_mode, joined_at) VALUES (?, ?, ?, 1, 'active', 'intact', ?)",
        )
        .run(memberId, thread.id, input.leadAgentId, now);
    }

    return thread;
  }

  async deleteProjectThread(threadId: string): Promise<void> {
    const thread = this.#db
      .prepare("SELECT worktree_path AS worktreePath, project_id AS projectId FROM project_threads WHERE id = ?")
      .get(threadId) as { worktreePath: string; projectId: string } | undefined;

    if (thread) {
      const project = this.getProject(thread.projectId);
      if (project && thread.worktreePath !== project.workspacePath) {
        await this.#git.removeWorktree(project.workspacePath, thread.worktreePath);
      }
      this.#db.prepare("DELETE FROM project_threads WHERE id = ?").run(threadId);
    }
  }

  updateThreadGitPolicy(input: UpdateThreadGitPolicyInput): void {
    this.#db
      .prepare("UPDATE project_threads SET git_policy = ?, updated_at = ? WHERE id = ?")
      .run(input.gitPolicy, nowIso(), input.threadId);
  }

  listThreadMembers(threadId: string): ProjectThreadMember[] {
    return this.#db
      .prepare(
        "SELECT id, thread_id AS threadId, agent_id AS agentId, is_lead AS isLead, status, provider_override AS providerOverride, model_override AS modelOverride, reasoning_override AS reasoningOverride, memory_mode AS memoryMode, joined_at AS joinedAt, left_at AS leftAt FROM project_thread_members WHERE thread_id = ? ORDER BY is_lead DESC, joined_at ASC",
      )
      .all(threadId) as unknown as ProjectThreadMember[];
  }

  setThreadMemberStatus(input: SetThreadMemberStatusInput): void {
    const now = nowIso();
    const existing = this.#db
      .prepare("SELECT id FROM project_thread_members WHERE thread_id = ? AND agent_id = ?")
      .get(input.threadId, input.agentId) as { id: string } | undefined;

    if (existing) {
      if (input.status === "inactive") {
        this.#db
          .prepare("UPDATE project_thread_members SET status = 'inactive', left_at = ? WHERE id = ?")
          .run(now, existing.id);
      } else {
        const memoryMode = input.memoryMode ?? "intact";
        this.#db
          .prepare(
            "UPDATE project_thread_members SET status = 'active', left_at = NULL, memory_mode = ? WHERE id = ?",
          )
          .run(memoryMode, existing.id);
      }
    } else {
      const memberId = generateId();
      this.#db
        .prepare(
          "INSERT INTO project_thread_members (id, thread_id, agent_id, is_lead, status, memory_mode, joined_at) VALUES (?, ?, ?, 0, 'active', 'intact', ?)",
        )
        .run(memberId, input.threadId, input.agentId, now);
    }
  }

  listKnowledgeSources(projectId: string, threadId?: string): ProjectKnowledgeSource[] {
    const query = threadId
      ? "SELECT id, project_id AS projectId, thread_id AS threadId, agent_id AS agentId, scope, title, file_path AS filePath, source_url AS sourceUrl, created_at AS createdAt FROM project_knowledge_sources WHERE project_id = ? AND (thread_id IS NULL OR thread_id = ?) ORDER BY created_at DESC"
      : "SELECT id, project_id AS projectId, thread_id AS threadId, agent_id AS agentId, scope, title, file_path AS filePath, source_url AS sourceUrl, created_at AS createdAt FROM project_knowledge_sources WHERE project_id = ? ORDER BY created_at DESC";

    return (threadId ? this.#db.prepare(query).all(projectId, threadId) : this.#db.prepare(query).all(projectId)) as unknown as ProjectKnowledgeSource[];
  }

  async addKnowledgeSource(input: AddKnowledgeSourceInput): Promise<ProjectKnowledgeSource> {
    const project = this.getProject(input.projectId);
    if (!project) throw new Error("Project not found");

    const id = generateId();
    const now = nowIso();

    // Ensure knowledge folder exists
    const knowledgeDir = join(project.workspacePath, ".openbot", "knowledge", input.scope);
    await mkdir(knowledgeDir, { recursive: true });

    const safeName = slugify(input.title) + ".md";
    const filePath = join(knowledgeDir, safeName);
    await writeFile(filePath, input.content, "utf8");

    const record: ProjectKnowledgeSource = {
      id,
      projectId: input.projectId,
      threadId: input.threadId ?? null,
      agentId: input.agentId ?? null,
      scope: input.scope,
      title: input.title,
      filePath,
      sourceUrl: input.sourceUrl ?? null,
      createdAt: now,
    };

    this.#db
      .prepare(
        "INSERT INTO project_knowledge_sources (id, project_id, thread_id, agent_id, scope, title, file_path, source_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .run(
        record.id,
        record.projectId,
        record.threadId,
        record.agentId,
        record.scope,
        record.title,
        record.filePath,
        record.sourceUrl,
        record.createdAt,
      );

    return record;
  }

  deleteKnowledgeSource(sourceId: string): void {
    this.#db.prepare("DELETE FROM project_knowledge_sources WHERE id = ?").run(sourceId);
  }
}
