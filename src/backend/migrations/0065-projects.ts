import type { OpenBotMigration } from "./migration";

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

export const migration: OpenBotMigration = {
  version: 65,
  name: "projects",
  up: (db) => db.exec(PROJECTS_SCHEMA_SQL),
};
