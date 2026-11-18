import {
  Crown,
  Folder,
  FolderPlus,
  Plus,
  X,
} from "@openbot/ui";
import { createSignal, For, Show } from "solid-js";
import { useAgents } from "../agents/agents-context";
import { useProjects } from "./projects-context";

export function CreateProjectDialog() {
  const projects = useProjects();
  const { agentList, openAgentSetup } = useAgents();

  const [name, setName] = createSignal("");
  const [workspacePath, setWorkspacePath] = createSignal("");
  const [description, setDescription] = createSignal("");
  const [leadAgentId, setLeadAgentId] = createSignal("");
  const [initialThreadName, setInitialThreadName] = createSignal("general");
  const [isSubmitting, setIsSubmitting] = createSignal(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!name() || !workspacePath()) return;

    setIsSubmitting(true);
    try {
      const proj = await projects.createProject({
        name: name(),
        workspacePath: workspacePath(),
        description: description() || undefined,
        leadAgentId: leadAgentId() || undefined,
      });

      // If initial thread name is not "general", or if we want to create specific initial thread
      if (initialThreadName() && initialThreadName() !== "general") {
        await projects.createThread({
          projectId: proj.id,
          name: initialThreadName(),
          leadAgentId: leadAgentId() || undefined,
        });
      }

      projects.setCreateProjectDialogOpen(false);
      setName("");
      setWorkspacePath("");
      setDescription("");
      setLeadAgentId("");
      setInitialThreadName("general");
    } catch (err) {
      console.error("Failed to create project", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Show when={projects.createProjectDialogOpen()}>
      <div class="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-card border border-border shadow-2xl rounded-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
          <div class="flex items-center justify-between px-6 py-4 border-b border-border/60">
            <div class="flex items-center gap-2.5">
              <div class="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <FolderPlus class="size-4.5" />
              </div>
              <div>
                <h2 class="text-base font-semibold text-foreground leading-tight">
                  New Project Workspace
                </h2>
                <p class="text-xs text-muted-foreground leading-tight">
                  Bind a dedicated local repository folder to start collaborating
                </p>
              </div>
            </div>
            <button
              type="button"
              class="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              onClick={() => projects.setCreateProjectDialogOpen(false)}
            >
              <X class="size-4.5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} class="p-6 flex flex-col gap-4">
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-semibold text-foreground">Project Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Axo, VellumX, LandingPage"
                class="rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                value={name()}
                onInput={(e) => setName(e.currentTarget.value)}
              />
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-semibold text-foreground">
                Workspace Folder Path (Local Directory)
              </label>
              <div class="flex items-center gap-2">
                <input
                  type="text"
                  required
                  placeholder="e.g. E:\Data\Users\JoJo\Desktop\NDD\Axo"
                  class="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-xs font-mono text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  value={workspacePath()}
                  onInput={(e) => setWorkspacePath(e.currentTarget.value)}
                />
              </div>
              <p class="text-[11px] text-muted-foreground">
                Git status and worktrees will be initialized inside this folder.
              </p>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="flex flex-col gap-1.5">
                <div class="flex items-center justify-between">
                  <label class="text-xs font-semibold text-foreground flex items-center gap-1">
                    <Crown class="size-3 text-amber-500 fill-amber-500" />
                    Project Lead
                  </label>
                  <button
                    type="button"
                    class="text-[10px] text-primary hover:underline"
                    onClick={() => {
                      projects.setCreateProjectDialogOpen(false);
                      openAgentSetup();
                    }}
                  >
                    + New Agent
                  </button>
                </div>
                <select
                  class="rounded-lg border border-input bg-background px-2.5 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  value={leadAgentId()}
                  onChange={(e) => setLeadAgentId(e.currentTarget.value)}
                >
                  <option value="">Select Domain Lead...</option>
                  <For each={agentList()}>
                    {(agent) => (
                      <option value={agent.id}>
                        {agent.name} ({agent.provider})
                      </option>
                    )}
                  </For>
                </select>
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-semibold text-foreground">Initial Thread</label>
                <input
                  type="text"
                  placeholder="e.g. frontend-ui or general"
                  class="rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  value={initialThreadName()}
                  onInput={(e) => setInitialThreadName(e.currentTarget.value)}
                />
              </div>
            </div>

            <div class="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
              <button
                type="button"
                class="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                onClick={() => projects.setCreateProjectDialogOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting() || !name() || !workspacePath()}
                class="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50"
              >
                <Plus class="size-3.5" />
                <span>Create Workspace</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Show>
  );
}
