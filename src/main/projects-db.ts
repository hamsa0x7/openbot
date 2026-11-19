import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";
import { createOpenBotLogger, toLogValue } from "@openbot/logging";

const logger = createOpenBotLogger("projects-db");

export const PROJECTS_SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT NOT NULL PRIMARY KEY CHECK(length(id) = 32),
    name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 100),
    workspace_path TEXT NOT NULL UNIQUE CHECK(length(workspace_path) > 0),
    description TEXT CHECK(description IS NULL OR length(description) <= 1000),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS projects_created ON projects(created_at DESC);

  CREATE TABLE IF NOT EXISTS project_threads (
    id TEXT NOT NULL PRIMARY KEY CHECK(length(id) = 32),
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 100),
    slug TEXT NOT NULL CHECK(length(slug) BETWEEN 1 AND 100),
    worktree_path TEXT NOT NULL CHECK(length(worktree_path) > 0),
    git_policy TEXT NOT NULL DEFAULT 'automatic' CHECK(git_policy IN ('automatic', 'review')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(project_id, slug)
  );
  CREATE INDEX IF NOT EXISTS project_threads_project ON project_threads(project_id, created_at ASC);

  CREATE TABLE IF NOT EXISTS project_thread_members (
    id TEXT NOT NULL PRIMARY KEY CHECK(length(id) = 32),
    thread_id TEXT NOT NULL REFERENCES project_threads(id) ON DELETE CASCADE,
    agent_id TEXT NOT NULL CHECK(length(agent_id) BETWEEN 1 AND 255),
    is_lead INTEGER NOT NULL DEFAULT 0 CHECK(is_lead IN (0, 1)),
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
    provider_override TEXT CHECK(provider_override IS NULL OR length(provider_override) <= 100),
    model_override TEXT CHECK(model_override IS NULL OR length(model_override) <= 100),
    reasoning_override TEXT CHECK(reasoning_override IS NULL OR length(reasoning_override) <= 50),
    memory_mode TEXT NOT NULL DEFAULT 'intact' CHECK(memory_mode IN ('intact', 'fresh')),
    joined_at TEXT NOT NULL,
    left_at TEXT,
    UNIQUE(thread_id, agent_id)
  );
  CREATE INDEX IF NOT EXISTS project_thread_members_thread ON project_thread_members(thread_id, status);
  CREATE INDEX IF NOT EXISTS project_thread_members_agent ON project_thread_members(agent_id);

  CREATE TABLE IF NOT EXISTS project_knowledge_sources (
    id TEXT NOT NULL PRIMARY KEY CHECK(length(id) = 32),
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    thread_id TEXT REFERENCES project_threads(id) ON DELETE CASCADE,
    agent_id TEXT CHECK(agent_id IS NULL OR length(agent_id) BETWEEN 1 AND 255),
    scope TEXT NOT NULL CHECK(scope IN ('project', 'thread', 'agent')),
    title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 200),
    file_path TEXT NOT NULL CHECK(length(file_path) > 0),
    source_url TEXT CHECK(source_url IS NULL OR length(source_url) <= 2000),
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS project_knowledge_project ON project_knowledge_sources(project_id, scope);
  CREATE INDEX IF NOT EXISTS project_knowledge_thread ON project_knowledge_sources(thread_id);
`;

export function openProjectsDatabase(userDataDir: string, legacyDb?: DatabaseSync): DatabaseSync {
  const dbPath = join(userDataDir, "projects.db");
  const db = new DatabaseSync(dbPath);

  // WAL mode for high concurrency without blocking UI reads
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  db.exec(PROJECTS_SCHEMA_SQL);

  // Zero-data-loss shim: migrate existing projects from legacy openbot.db if present
  if (legacyDb) {
    try {
      const tableCheck = legacyDb
        .prepare("SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='projects'")
        .get() as { count: number } | undefined;

      if (tableCheck && tableCheck.count > 0) {
        const legacyProjects = legacyDb.prepare("SELECT * FROM projects").all() as Array<Record<string, unknown>>;
        if (legacyProjects.length > 0) {
          logger.info(`Migrating ${legacyProjects.length} legacy projects to dedicated projects.db...`);

          const insertProject = db.prepare(
            `INSERT OR IGNORE INTO projects (id, name, workspace_path, description, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?)`
          );

          for (const p of legacyProjects) {
            insertProject.run(p.id, p.name, p.workspace_path, p.description, p.created_at, p.updated_at);
          }

          // Migrate threads
          try {
            const legacyThreads = legacyDb.prepare("SELECT * FROM project_threads").all() as Array<Record<string, unknown>>;
            const insertThread = db.prepare(
              `INSERT OR IGNORE INTO project_threads (id, project_id, name, slug, worktree_path, git_policy, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
            );
            for (const t of legacyThreads) {
              insertThread.run(t.id, t.project_id, t.name, t.slug, t.worktree_path, t.git_policy, t.created_at, t.updated_at);
            }
          } catch {
            // No threads table or already migrated
          }

          // Migrate thread members
          try {
            const legacyMembers = legacyDb.prepare("SELECT * FROM project_thread_members").all() as Array<Record<string, unknown>>;
            const insertMember = db.prepare(
              `INSERT OR IGNORE INTO project_thread_members (id, thread_id, agent_id, is_lead, status, provider_override, model_override, reasoning_override, memory_mode, joined_at, left_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            );
            for (const m of legacyMembers) {
              insertMember.run(m.id, m.thread_id, m.agent_id, m.is_lead, m.status, m.provider_override, m.model_override, m.reasoning_override, m.memory_mode, m.joined_at, m.left_at);
            }
          } catch {
            // No thread members table or already migrated
          }

          // Migrate knowledge sources
          try {
            const legacyKnowledge = legacyDb.prepare("SELECT * FROM project_knowledge_sources").all() as Array<Record<string, unknown>>;
            const insertKnowledge = db.prepare(
              `INSERT OR IGNORE INTO project_knowledge_sources (id, project_id, thread_id, agent_id, scope, title, file_path, source_url, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
            );
            for (const k of legacyKnowledge) {
              insertKnowledge.run(k.id, k.project_id, k.thread_id, k.agent_id, k.scope, k.title, k.file_path, k.source_url, k.created_at);
            }
          } catch {
            // No knowledge sources table or already migrated
          }

          logger.info("Legacy projects migration completed successfully.");
        }
      }
    } catch (error) {
      logger.warn("Legacy projects migration skipped or encountered non-fatal error:", toLogValue(error));
    }
  }

  return db;
}
