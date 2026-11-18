import type { ProjectGitPolicy } from "@openbot/contracts/ipc";
import {
  Crown,
  GitBranch,
  Plus,
  X,
  Zap,
} from "@openbot/ui";
import { createSignal, For, Show } from "solid-js";
import { useAgents } from "../agents/agents-context";
import { useProjects } from "./projects-context";

export function CreateThreadDialog() {
  const projects = useProjects();
  const { agentList } = useAgents();

  const [name, setName] = createSignal("");
  const [gitPolicy, setGitPolicy] = createSignal<ProjectGitPolicy>("review");
  const [leadAgentId, setLeadAgentId] = createSignal("");
  const [isSubmitting, setIsSubmitting] = createSignal(false);

  const activeProject = () => projects.activeProject();

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    const projId = projects.activeProjectId();
    if (!projId || !name()) return;

    setIsSubmitting(true);
    try {
      await projects.createThread({
        projectId: projId,
        name: name(),
        gitPolicy: gitPolicy(),
        leadAgentId: leadAgentId() || undefined,
      });

      projects.setCreateThreadDialogOpen(false);
      setName("");
      setGitPolicy("review");
      setLeadAgentId("");
    } catch (err) {
      console.error("Failed to create thread", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Show when={projects.createThreadDialogOpen()}>
      <div class="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-card border border-border shadow-2xl rounded-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
          <div class="flex items-center justify-between px-6 py-4 border-b border-border/60">
            <div class="flex items-center gap-2.5">
              <div class="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <GitBranch class="size-4.5" />
              </div>
              <div>
                <h2 class="text-base font-semibold text-foreground leading-tight">
                  New Thread Workstream
                </h2>
                <p class="text-xs text-muted-foreground leading-tight">
                  In project: {activeProject()?.name}
                </p>
              </div>
            </div>
            <button
              type="button"
              class="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              onClick={() => projects.setCreateThreadDialogOpen(false)}
            >
              <X class="size-4.5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} class="p-6 flex flex-col gap-4">
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-semibold text-foreground">Thread Name</label>
              <input
                type="text"
                required
                placeholder="e.g. backend-api, auth-flow, design-system"
                class="rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                value={name()}
                onInput={(e) => setName(e.currentTarget.value)}
              />
              <p class="text-[11px] text-muted-foreground">
                An isolated git worktree will be created at .openbot/worktrees/{activeProject()?.name}/{name() || "thread"}
              </p>
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-semibold text-foreground">Git Action Policy</label>
              <div class="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  class={`flex flex-col p-2.5 rounded-lg border text-left transition-colors ${
                    gitPolicy() === "automatic"
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border bg-card text-muted-foreground hover:border-border/80"
                  }`}
                  onClick={() => setGitPolicy("automatic")}
                >
                  <div class="flex items-center gap-1 text-xs">
                    <Zap class="size-3 text-emerald-500" />
                    <span>⚡ Automatic</span>
                  </div>
                  <span class="text-[10px] opacity-75 mt-0.5">Auto-commit on task complete</span>
                </button>

                <button
                  type="button"
                  class={`flex flex-col p-2.5 rounded-lg border text-left transition-colors ${
                    gitPolicy() === "review"
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border bg-card text-muted-foreground hover:border-border/80"
                  }`}
                  onClick={() => setGitPolicy("review")}
                >
                  <div class="flex items-center gap-1 text-xs">
                    <span>🔍 After Review</span>
                  </div>
                  <span class="text-[10px] opacity-75 mt-0.5">Stage & prompt before commit</span>
                </button>
              </div>
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-semibold text-foreground flex items-center gap-1">
                <Crown class="size-3 text-amber-500 fill-amber-500" />
                Workstream Lead (Optional)
              </label>
              <select
                class="rounded-lg border border-input bg-background px-2.5 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                value={leadAgentId()}
                onChange={(e) => setLeadAgentId(e.currentTarget.value)}
              >
                <option value="">Select thread lead...</option>
                <For each={agentList()}>
                  {(agent) => (
                    <option value={agent.id}>
                      {agent.name} ({agent.provider})
                    </option>
                  )}
                </For>
              </select>
            </div>

            <div class="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
              <button
                type="button"
                class="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                onClick={() => projects.setCreateThreadDialogOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting() || !name()}
                class="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50"
              >
                <Plus class="size-3.5" />
                <span>Create Thread</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Show>
  );
}
