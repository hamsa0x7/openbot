import {
  Folder,
  FolderPlus,
  GitBranch,
  GitCommitHorizontal,
  Plus,
  Trash2,
} from "@openbot/ui";
import { For, Show } from "solid-js";
import { useProjects } from "./projects-context";

export function WorkspaceProjectListView() {
  const projects = useProjects();

  return (
    <div class="flex flex-col gap-2 p-2 select-none">
      <div class="flex items-center justify-between px-1.5 py-1">
        <span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Projects
        </span>
        <button
          type="button"
          class="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium hover:bg-accent text-accent-foreground transition-colors"
          onClick={() => projects.setCreateProjectDialogOpen(true)}
          title="Create New Project Workspace"
        >
          <FolderPlus class="size-3.5" />
          <span>New</span>
        </button>
      </div>

      <Show
        when={projects.projects().length > 0}
        fallback={
          <div class="flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
            <Folder class="size-8 opacity-40 mb-2" />
            <p class="text-xs font-medium">No projects created yet</p>
            <p class="text-[11px] opacity-75 mt-0.5">
              Bind a local workspace folder to start a project
            </p>
            <button
              type="button"
              class="mt-3 flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground shadow-sm hover:opacity-90"
              onClick={() => projects.setCreateProjectDialogOpen(true)}
            >
              <Plus class="size-3.5" />
              <span>Create Project</span>
            </button>
          </div>
        }
      >
        <div class="flex flex-col gap-1">
          <For each={projects.projects()}>
            {(proj) => {
              const isSelected = () => projects.activeProjectId() === proj.id;
              return (
                <div class="flex flex-col rounded-md border border-border/40 overflow-hidden bg-card/40">
                  {/* Project Summary Row */}
                  <div
                    class="flex items-center justify-between px-2.5 py-2 cursor-pointer transition-colors hover:bg-accent/50"
                    classList={{
                      "bg-accent/80 font-medium": isSelected(),
                    }}
                    onClick={() => void projects.selectProject(proj.id)}
                  >
                    <div class="flex items-center gap-2 min-w-0">
                      <Folder class="size-4 shrink-0 text-primary" />
                      <div class="flex flex-col min-w-0">
                        <span class="text-xs font-semibold truncate leading-tight text-foreground">
                          {proj.name}
                        </span>
                        <span
                          class="text-[10px] text-muted-foreground truncate leading-tight"
                          title={proj.workspacePath}
                        >
                          {proj.workspacePath}
                        </span>
                      </div>
                    </div>
                    <div class="flex items-center gap-1 shrink-0 ml-1">
                      <button
                        type="button"
                        class="p-1 rounded hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors"
                        title="Delete project"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete project "${proj.name}"? Workspace files remain untouched.`)) {
                            void projects.deleteProject(proj.id);
                          }
                        }}
                      >
                        <Trash2 class="size-3" />
                      </button>
                    </div>
                  </div>

                  {/* Nested Threads Workstreams */}
                  <Show when={isSelected()}>
                    <div class="flex flex-col gap-0.5 px-2 py-1.5 bg-muted/20 border-t border-border/30">
                      <div class="flex items-center justify-between px-1 pb-1">
                        <span class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          Thread Workstreams
                        </span>
                        <button
                          type="button"
                          class="flex items-center gap-1 text-[10px] font-medium text-primary hover:underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            projects.setCreateThreadDialogOpen(true);
                          }}
                        >
                          <Plus class="size-3" />
                          <span>Add Thread</span>
                        </button>
                      </div>

                      <For each={projects.threads()}>
                        {(thread) => {
                          const isThreadActive = () => projects.activeThreadId() === thread.id;
                          return (
                            <div
                              class="flex items-center justify-between rounded px-2 py-1 text-xs cursor-pointer transition-colors"
                              classList={{
                                "bg-primary/15 text-primary font-medium": isThreadActive(),
                                "hover:bg-accent/60 text-muted-foreground": !isThreadActive(),
                              }}
                              onClick={() => void projects.selectThread(thread.id)}
                            >
                              <div class="flex items-center gap-1.5 truncate">
                                <GitBranch class="size-3.5 shrink-0 opacity-70" />
                                <span class="truncate">#{thread.name}</span>
                              </div>
                              <div class="flex items-center gap-1">
                                <span
                                  class="text-[9px] px-1 py-0.2 rounded font-mono uppercase"
                                  classList={{
                                    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400":
                                      thread.gitPolicy === "automatic",
                                    "bg-amber-500/10 text-amber-600 dark:text-amber-400":
                                      thread.gitPolicy === "review",
                                  }}
                                  title={`Git Policy: ${thread.gitPolicy}`}
                                >
                                  {thread.gitPolicy === "automatic" ? "⚡ auto" : "🔍 review"}
                                </span>
                              </div>
                            </div>
                          );
                        }}
                      </For>
                    </div>
                  </Show>
                </div>
              );
            }}
          </For>
        </div>
      </Show>
    </div>
  );
}
