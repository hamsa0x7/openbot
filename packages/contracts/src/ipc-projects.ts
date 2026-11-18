export const PROJECT_GIT_POLICIES = ["automatic", "review"] as const;
export type ProjectGitPolicy = (typeof PROJECT_GIT_POLICIES)[number];

export const PROJECT_MEMBER_STATUSES = ["active", "inactive"] as const;
export type ProjectMemberStatus = (typeof PROJECT_MEMBER_STATUSES)[number];

export const PROJECT_MEMBER_MEMORY_MODES = ["intact", "fresh"] as const;
export type ProjectMemberMemoryMode = (typeof PROJECT_MEMBER_MEMORY_MODES)[number];

export const PROJECT_KNOWLEDGE_SCOPES = ["project", "thread", "agent"] as const;
export type ProjectKnowledgeScope = (typeof PROJECT_KNOWLEDGE_SCOPES)[number];

export interface Project {
  readonly id: string;
  readonly name: string;
  readonly workspacePath: string;
  readonly description: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type ProjectSummary = Project;
export type ProjectDetails = Project;

export interface ProjectThread {
  readonly id: string;
  readonly projectId: string;
  readonly name: string;
  readonly slug: string;
  readonly worktreePath: string;
  readonly gitPolicy: ProjectGitPolicy;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type ProjectThreadSummary = ProjectThread;

export interface ProjectThreadMember {
  readonly id: string;
  readonly threadId: string;
  readonly agentId: string;
  readonly isLead: boolean;
  readonly status: ProjectMemberStatus;
  readonly providerOverride: string | null;
  readonly modelOverride: string | null;
  readonly reasoningOverride: string | null;
  readonly memoryMode: ProjectMemberMemoryMode;
  readonly joinedAt: string;
  readonly leftAt: string | null;
}

export interface ProjectKnowledgeSource {
  readonly id: string;
  readonly projectId: string;
  readonly threadId: string | null;
  readonly agentId: string | null;
  readonly scope: ProjectKnowledgeScope;
  readonly title: string;
  readonly filePath: string;
  readonly sourceUrl: string | null;
  readonly createdAt: string;
}

export interface GitTelemetry {
  readonly branch: string;
  readonly isClean: boolean;
  readonly uncommittedCount: number;
  readonly lastCommitHash: string;
  readonly lastCommitMessage: string;
  readonly lastCommitAuthor: string;
  readonly lastCommitTime: string;
}

export interface CreateProjectInput {
  readonly name: string;
  readonly workspacePath: string;
  readonly description?: string | undefined;
  readonly leadAgentId?: string | undefined;
}

export interface CreateProjectThreadInput {
  readonly projectId: string;
  readonly name: string;
  readonly slug?: string | undefined;
  readonly gitPolicy?: ProjectGitPolicy | undefined;
  readonly leadAgentId?: string | undefined;
}

export interface UpdateThreadGitPolicyInput {
  readonly threadId: string;
  readonly gitPolicy: ProjectGitPolicy;
}

export interface SetThreadMemberStatusInput {
  readonly threadId: string;
  readonly agentId: string;
  readonly status: ProjectMemberStatus;
  readonly memoryMode?: ProjectMemberMemoryMode | undefined;
}

export interface AddKnowledgeSourceInput {
  readonly projectId: string;
  readonly threadId?: string | undefined;
  readonly agentId?: string | undefined;
  readonly scope: ProjectKnowledgeScope;
  readonly title: string;
  readonly content: string;
  readonly sourceUrl?: string | undefined;
}
