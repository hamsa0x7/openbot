import {
  Button,
  Folder,
  Hash,
  IconButton,
  Plus,
  Trash2,
} from "@openbot/ui";
import { toast } from "solid-sonner";
import { For, Show } from "solid-js";
import { useProjects } from "./projects-context";

export function WorkspaceProjectListView() {
  const projects = useProjects();

  const handleDeleteProject = (proj: { id: string; name: string }) => {
    if (confirm(`Remove project "${proj.name}" from OpenBot? Local workspace files remain untouched.`)) {
      void projects.deleteProject(proj.id).then(() => {
        toast.success(`Project "${proj.name}" removed`);
      });
    }
  };

  return (
    <div class="flex flex-col gap-1 p-2 select-none">
      {/* Section Header */}
      <div class="flex items-center justify-between px-2 py-1 text-muted-foreground">
        <span class="text-[11px] font-semibold uppercase tracking-wider">
          Projects
        </span>
        <IconButton
          label="New Project Workspace"
          variant="ghost"
          class="size-5 p-0 text-muted-foreground hover:text-foreground"
          onClick={() => projects.setCreateProjectDialogOpen(true)}
        >
          <Plus class="size-3.5" />
        </IconButton>
      </div>

      <Show
        when={projects.projects().length > 0}
        fallback={
          <div class="flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
            <Folder class="size-7 opacity-30 mb-2" />
            <p class="text-xs font-medium">No projects yet</p>
            <p class="text-[11px] opacity-75 mt-0.5">
              Bind a local workspace folder to begin
            </p>
            <Button
              variant="secondary"
              size="sm"
              class="mt-3 text-xs"
              onClick={() => projects.setCreateProjectDialogOpen(true)}
            >
              <Plus class="size-3 mr-1" />
              <span>Create Workspace</span>
            </Button>
          </div>
        }
      >
        <div class="flex flex-col gap-0.5">
          <For each={projects.projects()}>
            {(proj) => {
              const isSelected = () => projects.activeProjectId() === proj.id;
              return (
                <div class="flex flex-col">
                  {/* Project Row */}
                  <div
                    class={`group relative flex items-center justify-between h-9 px-2 rounded-lg cursor-pointer transition-colors ${
                      isSelected()
                        ? "bg-accent text-accent-foreground font-medium"
                        : "hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => void projects.selectProject(proj.id)}
                  >
                    <div class="flex items-center gap-2 min-w-0">
                      <div class="size-6 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Folder class="size-3.5" />
                      </div>
                      <div class="flex flex-col min-w-0 leading-tight">
                        <span class="text-xs truncate font-medium text-foreground">
                          {proj.name}
                        </span>
                        <span
                          class="text-[10px] text-muted-foreground truncate max-w-[170px]"
                          title={proj.workspacePath}
                        >
                          {proj.workspacePath}
                        </span>
                      </div>
                    </div>

                    <div class="opacity-0 group-hover:opacity-100 transition-opacity flex items-center shrink-0">
                      <IconButton
                        label="Delete project"
                        variant="ghost"
                        class="size-6 p-0 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProject(proj);
                        }}
                      >
                        <Trash2 class="size-3" />
                      </IconButton>
                    </div>
                  </div>

                  {/* Sub-threads (Workstreams) indented directly under the project */}
                  <Show when={isSelected()}>
                    <div class="flex flex-col gap-0.5 ml-4 pl-2 my-1 border-l border-border/40">
                      <div class="flex items-center justify-between px-1 py-0.5">
                        <span class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80">
                          Workstreams
                        </span>
                        <button
                          type="button"
                          class="text-[10px] text-primary hover:underline flex items-center gap-0.5 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            projects.setCreateThreadDialogOpen(true);
                          }}
                        >
                          <Plus class="size-2.5" />
                          <span>New</span>
                        </button>
                      </div>

                      <For each={projects.threads()}>
                        {(thread) => {
                          const isThreadActive = () => projects.activeThreadId() === thread.id;
                          return (
                            <button
                              type="button"
                              class={`flex items-center justify-between h-7 px-2 rounded-md text-xs cursor-pointer transition-colors text-left ${
                                isThreadActive()
                                  ? "bg-primary/15 text-primary font-medium"
                                  : "hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                              }`}
                              onClick={() => void projects.selectThread(thread.id)}
                            >
                              <div class="flex items-center gap-1.5 truncate">
                                <Hash class="size-3 shrink-0 opacity-60" />
                                <span class="truncate">#{thread.name}</span>
                              </div>
                              <span
                                class={`text-[9px] px-1 py-0.2 rounded font-mono uppercase shrink-0 ${
                                  thread.gitPolicy === "automatic"
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                }`}
                                title={`Git Policy: ${thread.gitPolicy}`}
                              >
                                {thread.gitPolicy === "automatic" ? "auto" : "review"}
                              </span>
                            </button>
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
