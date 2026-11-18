import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { PROJECTS_SCHEMA_SQL } from "../backend/openbot-database-schema";
import { GitService } from "./git-service";
import { ProjectService } from "./project-service";

describe("ProjectService & Migration 65", () => {
  function setupTestDb() {
    const db = new DatabaseSync(":memory:");
    db.exec(PROJECTS_SCHEMA_SQL);
    const git = new GitService();
    const service = new ProjectService(db, git);
    return { db, git, service };
  }

  it("creates a project with an automatic default thread and lead agent", async () => {
    const { service } = setupTestDb();
    const project = await service.createProject({
      name: "Axo Platform",
      workspacePath: "C:\\Projects\\Axo",
      description: "Axo project description",
      leadAgentId: "agent-lead-123",
    });

    expect(project.id).toBeDefined();
    expect(project.name).toBe("Axo Platform");
    expect(project.workspacePath).toBe("C:\\Projects\\Axo");

    const projects = service.listProjects();
    expect(projects.length).toBe(1);
    expect(projects[0].name).toBe("Axo Platform");

    const threads = service.listProjectThreads(project.id);
    expect(threads.length).toBe(1);
    expect(threads[0].name).toBe("general");
    expect(threads[0].gitPolicy).toBe("automatic");

    const members = service.listThreadMembers(threads[0].id);
    expect(members.length).toBe(1);
    expect(members[0].agentId).toBe("agent-lead-123");
    expect(members[0].isLead).toBe(1 as any);
    expect(members[0].status).toBe("active");
  });

  it("creates parallel thread workstreams with custom git policies", async () => {
    const { service } = setupTestDb();
    const project = await service.createProject({
      name: "Vellum",
      workspacePath: "C:\\Projects\\Vellum",
    });

    const thread1 = await service.createProjectThread({
      projectId: project.id,
      name: "frontend-ui",
      gitPolicy: "review",
    });

    const thread2 = await service.createProjectThread({
      projectId: project.id,
      name: "backend-api",
      gitPolicy: "automatic",
    });

    const threads = service.listProjectThreads(project.id);
    expect(threads.length).toBe(3); // general + frontend-ui + backend-api

    expect(thread1.gitPolicy).toBe("review");
    expect(thread2.gitPolicy).toBe("automatic");

    // Update git policy
    service.updateThreadGitPolicy({
      threadId: thread1.id,
      gitPolicy: "automatic",
    });

    const updatedThreads = service.listProjectThreads(project.id);
    const updated1 = updatedThreads.find((t) => t.id === thread1.id);
    expect(updated1?.gitPolicy).toBe("automatic");
  });

  it("handles soft-removal and re-adding of agents with memory mode intact", async () => {
    const { service } = setupTestDb();
    const project = await service.createProject({
      name: "TestProject",
      workspacePath: "C:\\Projects\\Test",
    });

    const threads = service.listProjectThreads(project.id);
    const threadId = threads[0].id;

    // Add agent-1
    service.setThreadMemberStatus({
      threadId,
      agentId: "agent-design",
      status: "active",
      memoryMode: "fresh",
    });

    let members = service.listThreadMembers(threadId);
    expect(members.some((m) => m.agentId === "agent-design" && m.status === "active")).toBe(true);

    // Remove agent-1 (soft remove)
    service.setThreadMemberStatus({
      threadId,
      agentId: "agent-design",
      status: "inactive",
    });

    members = service.listThreadMembers(threadId);
    const removed = members.find((m) => m.agentId === "agent-design");
    expect(removed?.status).toBe("inactive");
    expect(removed?.leftAt).toBeDefined();

    // Re-add agent-1 with memory intact
    service.setThreadMemberStatus({
      threadId,
      agentId: "agent-design",
      status: "active",
      memoryMode: "intact",
    });

    members = service.listThreadMembers(threadId);
    const readded = members.find((m) => m.agentId === "agent-design");
    expect(readded?.status).toBe("active");
    expect(readded?.leftAt).toBeNull();
    expect(readded?.memoryMode).toBe("intact");
  });

  it("manages 3-tier knowledge sources", async () => {
    const { service } = setupTestDb();
    const project = await service.createProject({
      name: "KnowledgeProject",
      workspacePath: "C:\\Projects\\Knowledge",
    });

    const threads = service.listProjectThreads(project.id);
    const threadId = threads[0].id;

    // Project-wide knowledge
    const k1 = await service.addKnowledgeSource({
      projectId: project.id,
      scope: "project",
      title: "Architecture Guidelines",
      content: "# Architecture Guidelines\nAlways use vertical tracers.",
    });

    // Thread-specific knowledge
    const k2 = await service.addKnowledgeSource({
      projectId: project.id,
      threadId,
      scope: "thread",
      title: "UI Design Specs",
      content: "# UI Specs\nUse Kobalte and Tailwind.",
    });

    const listProject = service.listKnowledgeSources(project.id);
    expect(listProject.length).toBe(2);

    const listThread = service.listKnowledgeSources(project.id, threadId);
    expect(listThread.length).toBe(2);

    // Delete one
    service.deleteKnowledgeSource(k1.id);
    const remaining = service.listKnowledgeSources(project.id);
    expect(remaining.length).toBe(1);
    expect(remaining[0].id).toBe(k2.id);
  });

  it("handles git telemetry fallback for fresh directories gracefully", async () => {
    const git = new GitService();
    const tele = await git.getTelemetry("C:\\NonExistentPath\\Workspace");
    expect(tele).toBeDefined();
    expect(typeof tele.branch).toBe("string");
    expect(typeof tele.isClean).toBe("boolean");
    expect(typeof tele.uncommittedCount).toBe("number");
  });
});
