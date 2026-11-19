import type { CentralAuthUser } from "@openbot/contracts/ipc";
import { Button, Folder, FolderPlus } from "@openbot/ui";
import { createEffect, Show } from "solid-js";
import { useAgents } from "../agents/agents-context";
import { WorkspaceConversation } from "../conversation/WorkspaceConversation";
import { CreateProjectDialog } from "./CreateProjectDialog";
import { CreateThreadDialog } from "./CreateThreadDialog";
import { ProjectHeader } from "./ProjectHeader";
import { ProjectKnowledgeModal } from "./ProjectKnowledgeModal";
import { ProjectTeamDrawer } from "./ProjectTeamDrawer";
import { useProjects } from "./projects-context";

export interface WorkspaceProjectConversationProps {
  account: () => CentralAuthUser;
}

export function WorkspaceProjectConversation(props: WorkspaceProjectConversationProps) {
  const projects = useProjects();
  const { setActiveAgentId } = useAgents();

  const activeProject = () => projects.activeProject();
  const activeThread = () => projects.activeThread();

  // Sync active agent with the selected thread's lead agent
  createEffect(() => {
    const leadId = activeThread()?.leadAgentId;
    if (leadId) {
      setActiveAgentId(leadId);
    }
  });

  return (
    <div class="project-workspace-conversation">
      {/* Sleek single 38px Project Header */}
      <ProjectHeader />

      {/* Main Conversation or Empty State */}
      <Show
        when={activeProject() && activeThread()}
        fallback={
          <div class="flex-1 flex flex-col items-center justify-center p-8 text-center bg-muted/5 select-none">
            <div class="size-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4 shadow-xs">
              <Folder class="size-8" />
            </div>
            <h2 class="text-base font-semibold text-foreground">
              {activeProject() ? "Select a Thread Workstream" : "No Project Workspace Open"}
            </h2>
            <p class="text-xs text-muted-foreground max-w-md mt-1.5 leading-relaxed">
              {activeProject()
                ? "Choose or create a thread workstream from the top tab bar to begin collaborating."
                : "Create or select a project workspace to collaborate on a local codebase."}
            </p>
            <div class="mt-4 flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  if (activeProject()) {
                    projects.setCreateThreadDialogOpen(true);
                  } else {
                    projects.setCreateProjectDialogOpen(true);
                  }
                }}
              >
                <FolderPlus class="size-4 mr-1.5" />
                <span>{activeProject() ? "New Thread" : "Create Workspace"}</span>
              </Button>
            </div>
          </div>
        }
      >
        {/* Full-height real conversation with the workstream's lead agent */}
        <div class="flex-1 overflow-hidden relative">
          <WorkspaceConversation account={props.account} />
        </div>
      </Show>

      {/* Modals & Drawers */}
      <CreateProjectDialog />
      <CreateThreadDialog />
      <ProjectKnowledgeModal />
      <ProjectTeamDrawer />
    </div>
  );
}
