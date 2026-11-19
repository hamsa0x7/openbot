import type { ProjectGitPolicy } from "@openbot/contracts/ipc";
import {
  Button,
  Crown,
  Dialog,
  GitBranch,
  IconButton,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  X,
  Zap,
} from "@openbot/ui";
import { toast } from "solid-sonner";
import { createMemo, createSignal, Show } from "solid-js";
import { useAgents } from "../agents/agents-context";
import { useProjects } from "./projects-context";

interface AgentOption {
  id: string;
  name: string;
}

export function CreateThreadDialog() {
  const projects = useProjects();
  const { agentList } = useAgents();

  const [name, setName] = createSignal("");
  const [gitPolicy, setGitPolicy] = createSignal<ProjectGitPolicy>("review");
  const [leadAgentId, setLeadAgentId] = createSignal("");
  const [isSubmitting, setIsSubmitting] = createSignal(false);

  const activeProject = () => projects.activeProject();

  const agentOptions = createMemo<AgentOption[]>(() => [
    { id: "", name: "No Lead Agent (Unassigned)" },
    ...agentList().map((a) => ({ id: a.id, name: `${a.name} (${a.provider})` })),
  ]);

  const selectedAgentOption = createMemo(() => {
    const id = leadAgentId();
    return agentOptions().find((opt) => opt.id === id) ?? agentOptions()[0];
  });

  const closeDialog = () => {
    projects.setCreateThreadDialogOpen(false);
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    const projId = projects.activeProjectId();
    const threadName = name().trim();
    if (!projId || !threadName) {
      toast.error("Workstream thread name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      await projects.createThread({
        projectId: projId,
        name: threadName,
        gitPolicy: gitPolicy(),
        leadAgentId: leadAgentId() || undefined,
      });

      toast.success(`Thread #${threadName} created`);
      closeDialog();
      setName("");
      setGitPolicy("review");
      setLeadAgentId("");
    } catch (err: any) {
      console.error("Failed to create thread", err);
      toast.error(err?.message || "Failed to create thread");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={projects.createThreadDialogOpen()} onOpenChange={(open) => !open && closeDialog()}>
      <Dialog.Portal>
        <Dialog.Overlay class="custom-provider-backdrop" />
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
          <Dialog.Content
            as="section"
            class="custom-provider-dialog w-full max-w-md pointer-events-auto"
          >
            {/* Header */}
            <header class="custom-provider-header">
              <div class="custom-provider-mark">
                <GitBranch class="size-4" />
              </div>
              <div class="custom-provider-title">
                <Dialog.Title as="h2" class="text-sm font-semibold text-foreground leading-tight">
                  New Thread Workstream
                </Dialog.Title>
                <p class="text-xs text-muted-foreground leading-tight">
                  In project: {activeProject()?.name}
                </p>
              </div>
              <IconButton label="Close" variant="ghost" class="custom-provider-close" onClick={closeDialog}>
                <X class="size-4" />
              </IconButton>
            </header>

            {/* Form */}
            <form onSubmit={handleSubmit} class="custom-provider-form">
              <div class="custom-provider-fields">
                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-semibold text-foreground">Thread Name</label>
                  <Input
                    type="text"
                    required
                    placeholder="e.g. backend, ui-redesign, auth"
                    value={name()}
                    onInput={(e) => setName(e.currentTarget.value)}
                  />
                  <p class="text-[11px] text-muted-foreground">
                    An isolated git worktree branch will be managed for this thread.
                  </p>
                </div>

                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-semibold text-foreground">Git Action Policy</label>
                  <div class="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      class={`flex flex-col p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                        gitPolicy() === "automatic"
                          ? "border-primary bg-primary/10 text-primary font-medium"
                          : "border-border bg-background text-muted-foreground hover:border-border/80"
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
                      class={`flex flex-col p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                        gitPolicy() === "review"
                          ? "border-primary bg-primary/10 text-primary font-medium"
                          : "border-border bg-background text-muted-foreground hover:border-border/80"
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
                    Workstream Lead
                  </label>
                  <Select<AgentOption>
                    options={agentOptions()}
                    value={selectedAgentOption()}
                    onChange={(opt) => setLeadAgentId(opt?.id ?? "")}
                    itemComponent={(item) => (
                      <SelectItem item={item.item}>{item.item.rawValue.name}</SelectItem>
                    )}
                  >
                    <SelectTrigger size="sm">
                      <SelectValue<AgentOption>>
                        {(state) => state.selectedOption()?.name ?? "Select Lead Agent..."}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent />
                  </Select>
                </div>
              </div>

              <div class="flex items-center justify-end gap-2 pt-3 border-t border-border/50">
                <Button type="button" variant="ghost" size="sm" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSubmitting() || !name()}
                >
                  <Show when={isSubmitting()} fallback="Create Thread">
                    Creating...
                  </Show>
                </Button>
              </div>
            </form>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
