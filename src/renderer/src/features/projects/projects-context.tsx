import type {
  AddKnowledgeSourceInput,
  CreateProjectInput,
  CreateProjectThreadInput,
  GitTelemetry,
  ProjectGitPolicy,
  ProjectKnowledgeSource,
  ProjectMemberMemoryMode,
  ProjectMemberStatus,
  ProjectSummary,
  ProjectThreadMember,
  ProjectThreadSummary,
  SetThreadMemberStatusInput,
} from "@openbot/contracts/ipc";
import {
  createContext,
  createEffect,
  createMemo,
  createSignal,
  type ParentProps,
  useContext,
} from "solid-js";

export interface ProjectsController {
  projects: () => ProjectSummary[];
  activeProjectId: () => string | null;
  activeProject: () => ProjectSummary | null;
  threads: () => ProjectThreadSummary[];
  activeThreadId: () => string | null;
  activeThread: () => ProjectThreadSummary | null;
  threadMembers: () => ProjectThreadMember[];
  gitTelemetry: () => GitTelemetry | null;
  gitPolicy: () => ProjectGitPolicy;
  knowledgeSources: () => ProjectKnowledgeSource[];
  teamDrawerOpen: () => boolean;
  setTeamDrawerOpen: (open: boolean) => void;
  knowledgeModalOpen: () => boolean;
  setKnowledgeModalOpen: (open: boolean) => void;
  createProjectDialogOpen: () => boolean;
  setCreateProjectDialogOpen: (open: boolean) => void;
  createThreadDialogOpen: () => boolean;
  setCreateThreadDialogOpen: (open: boolean) => void;
  readdModalMember: () => ProjectThreadMember | null;
  setReaddModalMember: (member: ProjectThreadMember | null) => void;
  reloadProjects: () => Promise<void>;
  selectProject: (projectId: string) => Promise<void>;
  selectThread: (threadId: string) => Promise<void>;
  updateGitPolicy: (policy: ProjectGitPolicy) => Promise<void>;
  createProject: (input: CreateProjectInput) => Promise<ProjectSummary>;
  deleteProject: (projectId: string) => Promise<void>;
  createThread: (input: CreateProjectThreadInput) => Promise<ProjectThreadSummary>;
  deleteThread: (threadId: string) => Promise<void>;
  setMemberStatus: (input: SetThreadMemberStatusInput) => Promise<void>;
  addKnowledge: (input: AddKnowledgeSourceInput) => Promise<ProjectKnowledgeSource>;
  deleteKnowledge: (sourceId: string) => Promise<void>;
  refreshTelemetry: () => Promise<void>;
}

const ProjectsContext = createContext<ProjectsController>(undefined, { name: "Projects" });

export function useProjects(): ProjectsController {
  const context = useContext(ProjectsContext);
  if (!context) {
    throw new Error("useProjects must be used within a ProjectsProvider");
  }
  return context;
}

export function ProjectsProvider(props: ParentProps) {
  const [projects, setProjects] = createSignal<ProjectSummary[]>([]);
  const [activeProjectId, setActiveProjectId] = createSignal<string | null>(null);
  const [threads, setThreads] = createSignal<ProjectThreadSummary[]>([]);
  const [activeThreadId, setActiveThreadId] = createSignal<string | null>(null);
  const [threadMembers, setThreadMembers] = createSignal<ProjectThreadMember[]>([]);
  const [gitTelemetry, setGitTelemetry] = createSignal<GitTelemetry | null>(null);
  const [knowledgeSources, setKnowledgeSources] = createSignal<ProjectKnowledgeSource[]>([]);
  const [teamDrawerOpen, setTeamDrawerOpen] = createSignal(false);
  const [knowledgeModalOpen, setKnowledgeModalOpen] = createSignal(false);
  const [createProjectDialogOpen, setCreateProjectDialogOpen] = createSignal(false);
  const [createThreadDialogOpen, setCreateThreadDialogOpen] = createSignal(false);
  const [readdModalMember, setReaddModalMember] = createSignal<ProjectThreadMember | null>(null);

  const activeProject = createMemo(() => {
    const id = activeProjectId();
    return projects().find((p) => p.id === id) ?? null;
  });

  const activeThread = createMemo(() => {
    const id = activeThreadId();
    return threads().find((t) => t.id === id) ?? null;
  });

  const gitPolicy = createMemo<ProjectGitPolicy>(() => {
    return activeThread()?.gitPolicy ?? "review";
  });

  const reloadProjects = async () => {
    try {
      const list = await window.openbot.project.list();
      setProjects(list || []);
    } catch (e) {
      console.error("Failed to load projects", e);
    }
  };

  const refreshTelemetry = async () => {
    const proj = activeProject();
    if (!proj) return;
    try {
      const tele = await window.openbot.project.getGitTelemetry(proj.workspacePath);
      setGitTelemetry(tele);
    } catch (e) {
      console.error("Failed to load git telemetry", e);
    }
  };

  const loadThreadDetails = async (threadId: string) => {
    try {
      const members = await window.openbot.project.listMembers(threadId);
      setThreadMembers(members || []);
      const projId = activeProjectId();
      if (projId) {
        const knowledge = await window.openbot.project.listKnowledge({
          projectId: projId,
          threadId,
        });
        setKnowledgeSources(knowledge || []);
      }
    } catch (e) {
      console.error("Failed to load thread details", e);
    }
  };

  const selectProject = async (projectId: string) => {
    setActiveProjectId(projectId);
    try {
      const threadList = await window.openbot.project.listThreads(projectId);
      setThreads(threadList || []);
      if (threadList && threadList.length > 0) {
        await selectThread(threadList[0].id);
      } else {
        setActiveThreadId(null);
        setThreadMembers([]);
      }
      await refreshTelemetry();
    } catch (e) {
      console.error("Failed to select project", e);
    }
  };

  const selectThread = async (threadId: string) => {
    setActiveThreadId(threadId);
    await loadThreadDetails(threadId);
    await refreshTelemetry();
  };

  const updateGitPolicy = async (policy: ProjectGitPolicy) => {
    const threadId = activeThreadId();
    if (!threadId) return;
    await window.openbot.project.updateGitPolicy({ threadId, gitPolicy: policy });
    // Update local state
    setThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, gitPolicy: policy } : t)),
    );
  };

  const createProject = async (input: CreateProjectInput): Promise<ProjectSummary> => {
    const project = await window.openbot.project.create(input);
    await reloadProjects();
    await selectProject(project.id);
    return project;
  };

  const deleteProject = async (projectId: string) => {
    await window.openbot.project.delete(projectId);
    if (activeProjectId() === projectId) {
      setActiveProjectId(null);
      setActiveThreadId(null);
      setThreads([]);
      setThreadMembers([]);
    }
    await reloadProjects();
  };

  const createThread = async (input: CreateProjectThreadInput): Promise<ProjectThreadSummary> => {
    const thread = await window.openbot.project.createThread(input);
    const threadList = await window.openbot.project.listThreads(input.projectId);
    setThreads(threadList || []);
    await selectThread(thread.id);
    return thread;
  };

  const deleteThread = async (threadId: string) => {
    await window.openbot.project.deleteThread(threadId);
    const projId = activeProjectId();
    if (projId) {
      const threadList = await window.openbot.project.listThreads(projId);
      setThreads(threadList || []);
      if (activeThreadId() === threadId) {
        if (threadList && threadList.length > 0) {
          await selectThread(threadList[0].id);
        } else {
          setActiveThreadId(null);
          setThreadMembers([]);
        }
      }
    }
  };

  const setMemberStatus = async (input: SetThreadMemberStatusInput) => {
    await window.openbot.project.setMemberStatus(input);
    if (activeThreadId() === input.threadId) {
      await loadThreadDetails(input.threadId);
    }
  };

  const addKnowledge = async (input: AddKnowledgeSourceInput): Promise<ProjectKnowledgeSource> => {
    const source = await window.openbot.project.addKnowledge(input);
    const projId = activeProjectId();
    const threadId = activeThreadId();
    if (projId) {
      const knowledge = await window.openbot.project.listKnowledge({
        projectId: projId,
        threadId: threadId ?? undefined,
      });
      setKnowledgeSources(knowledge || []);
    }
    return source;
  };

  const deleteKnowledge = async (sourceId: string) => {
    await window.openbot.project.deleteKnowledge(sourceId);
    const projId = activeProjectId();
    const threadId = activeThreadId();
    if (projId) {
      const knowledge = await window.openbot.project.listKnowledge({
        projectId: projId,
        threadId: threadId ?? undefined,
      });
      setKnowledgeSources(knowledge || []);
    }
  };

  // Initial load
  createEffect(() => {
    void reloadProjects();
  });

  const controller: ProjectsController = {
    projects,
    activeProjectId,
    activeProject,
    threads,
    activeThreadId,
    activeThread,
    threadMembers,
    gitTelemetry,
    gitPolicy,
    knowledgeSources,
    teamDrawerOpen,
    setTeamDrawerOpen,
    knowledgeModalOpen,
    setKnowledgeModalOpen,
    createProjectDialogOpen,
    setCreateProjectDialogOpen,
    createThreadDialogOpen,
    setCreateThreadDialogOpen,
    readdModalMember,
    setReaddModalMember,
    reloadProjects,
    selectProject,
    selectThread,
    updateGitPolicy,
    createProject,
    deleteProject,
    createThread,
    deleteThread,
    setMemberStatus,
    addKnowledge,
    deleteKnowledge,
    refreshTelemetry,
  };

  return <ProjectsContext value={controller}>{props.children}</ProjectsContext>;
}
