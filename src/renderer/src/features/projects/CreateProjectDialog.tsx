import {
  Button,
  Crown,
  Dialog,
  Folder,
  FolderPlus,
  IconButton,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  X,
} from "@openbot/ui";
import { toast } from "solid-sonner";
import { createMemo, createSignal, Show } from "solid-js";
import { useAgents } from "../agents/agents-context";
import { useProjects } from "./projects-context";

interface AgentOption {
  id: string;
  name: string;
}

export function CreateProjectDialog() {
  const projects = useProjects();
  const { agentList, openAgentSetup } = useAgents();

  const [name, setName] = createSignal("");
  const [workspacePath, setWorkspacePath] = createSignal("");
  const [description, setDescription] = createSignal("");
  const [leadAgentId, setLeadAgentId] = createSignal("");
  const [initialThreadName, setInitialThreadName] = createSignal("general");
  const [isSubmitting, setIsSubmitting] = createSignal(false);

  const agentOptions = createMemo<AgentOption[]>(() => [
    { id: "", name: "Select Lead Agent..." },
    ...agentList().map((a) => ({ id: a.id, name: `${a.name} (${a.provider})` })),
  ]);

  const selectedAgentOption = createMemo(() => {
    const id = leadAgentId();
    return agentOptions().find((opt) => opt.id === id) ?? agentOptions()[0];
  });

  const handleBrowseDirectory = async () => {
    try {
      const chooseFn =
        (window as any).openbot?.hostedSites?.chooseDirectory ??
        (window as any).openbot?.app?.chooseDirectory;
      if (!chooseFn) return;
      const selected = await chooseFn();
      if (selected && typeof selected === "string") {
        setWorkspacePath(selected);
        if (!name()) {
          const parts = selected.split(/[\\/]/).filter(Boolean);
          if (parts.length > 0) setName(parts[parts.length - 1]);
        }
      }
    } catch (e) {
      console.error("Failed to browse directory", e);
    }
  };

  const closeDialog = () => {
    projects.setCreateProjectDialogOpen(false);
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    const projName = name().trim();
    const path = workspacePath().trim();
    if (!projName || !path) {
      toast.error("Project name and local workspace folder are required");
      return;
    }

    setIsSubmitting(true);
    try {
      const proj = await projects.createProject({
        name: projName,
        workspacePath: path,
        description: description() || undefined,
        leadAgentId: leadAgentId() || undefined,
      });

      if (initialThreadName() && initialThreadName() !== "general") {
        await projects.createThread({
          projectId: proj.id,
          name: initialThreadName(),
          leadAgentId: leadAgentId() || undefined,
        });
      }

      toast.success(`Project "${projName}" created`);
      closeDialog();
      setName("");
      setWorkspacePath("");
      setDescription("");
      setLeadAgentId("");
      setInitialThreadName("general");
    } catch (err: any) {
      console.error("Failed to create project", err);
      toast.error(err?.message || "Failed to create project");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={projects.createProjectDialogOpen()} onOpenChange={(open) => !open && closeDialog()}>
      <Dialog.Portal>
        <Dialog.Overlay class="custom-provider-backdrop" />
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
          <Dialog.Content
            as="section"
            class="custom-provider-dialog w-full max-w-lg pointer-events-auto"
          >
            {/* Native OpenBot Dialog Header */}
            <header class="custom-provider-header">
              <div class="custom-provider-mark">
                <FolderPlus class="size-4" />
              </div>
              <div class="custom-provider-title">
                <Dialog.Title as="h2" class="text-sm font-semibold text-foreground leading-tight">
                  New Project Workspace
                </Dialog.Title>
                <p class="text-xs text-muted-foreground leading-tight">
                  Bind a dedicated local repository folder to start collaborating
                </p>
              </div>
              <IconButton label="Close" variant="ghost" class="custom-provider-close" onClick={closeDialog}>
                <X class="size-4" />
              </IconButton>
            </header>

            {/* Native OpenBot Form */}
            <form onSubmit={handleSubmit} class="custom-provider-form">
              <div class="custom-provider-fields">
                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-semibold text-foreground">Project Name</label>
                  <Input
                    type="text"
                    required
                    placeholder="e.g. WebApp, MobileClient, CoreEngine"
                    value={name()}
                    onInput={(e) => setName(e.currentTarget.value)}
                  />
                </div>

                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-semibold text-foreground">
                    Workspace Folder Path (Local Directory)
                  </label>
                  <div class="flex items-center gap-2">
                    <Input
                      type="text"
                      required
                      placeholder="e.g. C:/Projects/my-app"
                      class="flex-1 font-mono text-xs"
                      value={workspacePath()}
                      onInput={(e) => setWorkspacePath(e.currentTarget.value)}
                    />
                    <Button type="button" variant="secondary" size="sm" onClick={handleBrowseDirectory}>
                      <Folder class="size-3.5 mr-1" />
                      Browse
                    </Button>
                  </div>
                  <p class="text-[11px] text-muted-foreground">
                    Git status and worktrees will be managed inside this folder.
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
                        class="text-[10px] text-primary hover:underline cursor-pointer"
                        onClick={() => {
                          closeDialog();
                          openAgentSetup();
                        }}
                      >
                        + New Agent
                      </button>
                    </div>
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

                  <div class="flex flex-col gap-1.5">
                    <label class="text-xs font-semibold text-foreground">Initial Thread</label>
                    <Input
                      type="text"
                      placeholder="e.g. general or feature-work"
                      value={initialThreadName()}
                      onInput={(e) => setInitialThreadName(e.currentTarget.value)}
                    />
                  </div>
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
                  disabled={isSubmitting() || !name() || !workspacePath()}
                >
                  <Show when={isSubmitting()} fallback="Create Workspace">
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
