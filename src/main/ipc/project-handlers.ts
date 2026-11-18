import type {
  AddKnowledgeSourceInput,
  CreateProjectInput,
  CreateProjectThreadInput,
  SetThreadMemberStatusInput,
  UpdateThreadGitPolicyInput,
} from "@openbot/contracts/ipc";
import type { GitService } from "../git-service";
import type { ProjectService } from "../project-service";
import { handler, type IpcGroupHandlers, payloadHandler } from "./define-ipc-group";

export interface ProjectIpcDependencies {
  projects: ProjectService;
  git: GitService;
}

export function projectIpcHandlers({
  projects,
  git,
}: ProjectIpcDependencies): Pick<IpcGroupHandlers, "project"> {
  return {
    project: {
      list: handler(() => projects.listProjects()),
      get: payloadHandler((id) => String(id), (id) => projects.getProject(id)),
      create: payloadHandler((p) => p as CreateProjectInput, (p) => projects.createProject(p)),
      delete: payloadHandler((id) => String(id), (id) => projects.deleteProject(id)),
      listThreads: payloadHandler((id) => String(id), (id) => projects.listProjectThreads(id)),
      createThread: payloadHandler((p) => p as CreateProjectThreadInput, (p) => projects.createProjectThread(p)),
      deleteThread: payloadHandler((id) => String(id), (id) => projects.deleteProjectThread(id)),
      updateGitPolicy: payloadHandler((p) => p as UpdateThreadGitPolicyInput, (p) => {
        projects.updateThreadGitPolicy(p);
      }),
      listMembers: payloadHandler((id) => String(id), (id) => projects.listThreadMembers(id)),
      setMemberStatus: payloadHandler((p) => p as SetThreadMemberStatusInput, (p) => {
        projects.setThreadMemberStatus(p);
      }),
      getGitTelemetry: payloadHandler((p) => String(p), (p) => git.getTelemetry(p)),
      listKnowledge: payloadHandler(
        (p) => p as { projectId: string; threadId?: string },
        (p) => projects.listKnowledgeSources(p.projectId, p.threadId),
      ),
      addKnowledge: payloadHandler((p) => p as AddKnowledgeSourceInput, (p) => projects.addKnowledgeSource(p)),
      deleteKnowledge: payloadHandler((id) => String(id), (id) => {
        projects.deleteKnowledgeSource(id);
      }),
    },
  };
}
