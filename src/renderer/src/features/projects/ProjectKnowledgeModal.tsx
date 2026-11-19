import type { ProjectKnowledgeScope } from "@openbot/contracts/ipc";
import {
  BookOpen,
  Button,
  Dialog,
  FileCode,
  FileText,
  Globe,
  IconButton,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Trash2,
  X,
} from "@openbot/ui";
import { toast } from "solid-sonner";
import { createMemo, createSignal, For, Show } from "solid-js";
import { useAgents } from "../agents/agents-context";
import { useProjects } from "./projects-context";

interface AgentOption {
  id: string;
  name: string;
}

export function ProjectKnowledgeModal() {
  const projects = useProjects();
  const { agentList } = useAgents();

  const [title, setTitle] = createSignal("");
  const [content, setContent] = createSignal("");
  const [scope, setScope] = createSignal<ProjectKnowledgeScope>("project");
  const [selectedAgentId, setSelectedAgentId] = createSignal("");
  const [sourceUrl, setSourceUrl] = createSignal("");
  const [isSubmitting, setIsSubmitting] = createSignal(false);

  const activeThread = () => projects.activeThread();

  const agentOptions = createMemo<AgentOption[]>(() => [
    { id: "", name: "Select agent..." },
    ...agentList().map((a) => ({ id: a.id, name: `${a.name} (${a.provider})` })),
  ]);

  const selectedAgentOption = createMemo(() => {
    const id = selectedAgentId();
    return agentOptions().find((opt) => opt.id === id) ?? agentOptions()[0];
  });

  const closeDialog = () => {
    projects.setKnowledgeModalOpen(false);
  };

  const handleAddSource = async (e: Event) => {
    e.preventDefault();
    const projId = projects.activeProjectId();
    const docTitle = title().trim();
    const docContent = content().trim();
    if (!projId || !docTitle || !docContent) {
      toast.error("Title and content are required");
      return;
    }

    setIsSubmitting(true);
    try {
      await projects.addKnowledge({
        projectId: projId,
        threadId: scope() === "thread" ? projects.activeThreadId() ?? undefined : undefined,
        agentId: scope() === "agent" ? selectedAgentId() || undefined : undefined,
        scope: scope(),
        title: docTitle,
        content: docContent,
        sourceUrl: sourceUrl().trim() || undefined,
      });

      toast.success(`Knowledge source "${docTitle}" added`);
      setTitle("");
      setContent("");
      setSourceUrl("");
    } catch (err: any) {
      console.error("Failed to add knowledge source", err);
      toast.error(err?.message || "Failed to add knowledge source");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getScopeBadge = (s: ProjectKnowledgeScope) => {
    switch (s) {
      case "project":
        return { label: "Project Wide", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" };
      case "thread":
        return { label: "Thread Specific", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" };
      case "agent":
        return { label: "Agent Specific", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400" };
    }
  };

  return (
    <Dialog.Root open={projects.knowledgeModalOpen()} onOpenChange={(open) => !open && closeDialog()}>
      <Dialog.Portal>
        <Dialog.Overlay class="custom-provider-backdrop" />
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
          <Dialog.Content
            as="section"
            class="custom-provider-dialog w-full max-w-2xl max-h-[90vh] flex flex-col pointer-events-auto shadow-2xl rounded-2xl bg-card border border-border p-0 overflow-hidden"
          >
            {/* Header */}
            <div class="flex items-center justify-between px-6 py-4 border-b border-border/60">
              <div class="flex items-center gap-2.5">
                <div class="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <BookOpen class="size-4.5" />
                </div>
                <div>
                  <Dialog.Title as="h2" class="text-base font-semibold text-foreground leading-tight">
                    Project Knowledge
                  </Dialog.Title>
                  <p class="text-xs text-muted-foreground leading-tight">
                    Context documentation and domain references for this project
                  </p>
                </div>
              </div>
              <IconButton label="Close" variant="ghost" onClick={closeDialog}>
                <X class="size-4" />
              </IconButton>
            </div>

            {/* Modal Body */}
            <div class="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
              {/* Knowledge Sources List */}
              <div class="flex flex-col gap-2">
                <span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Attached Sources ({projects.knowledgeSources().length})
                </span>

                <Show
                  when={projects.knowledgeSources().length > 0}
                  fallback={
                    <div class="p-6 text-center border border-dashed border-border/60 rounded-xl text-muted-foreground">
                      <p class="text-xs">No knowledge documents attached yet.</p>
                      <p class="text-[11px] opacity-75 mt-0.5">
                        Add project guides, specifications, or rules below.
                      </p>
                    </div>
                  }
                >
                  <div class="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                    <For each={projects.knowledgeSources()}>
                      {(doc) => {
                        const badge = () => getScopeBadge(doc.scope);
                        return (
                          <div class="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background hover:border-border transition-colors">
                            <div class="flex items-center gap-3 min-w-0">
                              <FileText class="size-4 shrink-0 text-primary" />
                              <div class="flex flex-col min-w-0">
                                <span class="text-xs font-semibold text-foreground truncate">
                                  {doc.title}
                                </span>
                                <div class="flex items-center gap-2 text-[10px] text-muted-foreground">
                                  <span class={`px-1.5 py-0.2 rounded font-medium ${badge().color}`}>
                                    {badge().label}
                                  </span>
                                  <span class="font-mono truncate">{doc.filePath}</span>
                                </div>
                              </div>
                            </div>

                            <IconButton
                              label="Delete knowledge source"
                              variant="ghost"
                              class="text-muted-foreground hover:text-destructive"
                              onClick={() => void projects.deleteKnowledge(doc.id)}
                            >
                              <Trash2 class="size-3.5" />
                            </IconButton>
                          </div>
                        );
                      }}
                    </For>
                  </div>
                </Show>
              </div>

              {/* Add New Knowledge Form */}
              <form onSubmit={handleAddSource} class="flex flex-col gap-3.5 border-t border-border/50 pt-4">
                <span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Add Knowledge Document
                </span>

                {/* Scope Selector */}
                <div class="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    class={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-center transition-colors cursor-pointer ${
                      scope() === "project"
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-border bg-card text-muted-foreground hover:border-border/80"
                    }`}
                    onClick={() => setScope("project")}
                  >
                    <Globe class="size-4 mb-1" />
                    <span class="text-xs">Project Wide</span>
                    <span class="text-[10px] opacity-75">All threads</span>
                  </button>

                  <button
                    type="button"
                    class={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-center transition-colors cursor-pointer ${
                      scope() === "thread"
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-border bg-card text-muted-foreground hover:border-border/80"
                    }`}
                    onClick={() => setScope("thread")}
                  >
                    <FileCode class="size-4 mb-1" />
                    <span class="text-xs">Thread Specific</span>
                    <span class="text-[10px] opacity-75">#{activeThread()?.name ?? "Workstream"}</span>
                  </button>

                  <button
                    type="button"
                    class={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-center transition-colors cursor-pointer ${
                      scope() === "agent"
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-border bg-card text-muted-foreground hover:border-border/80"
                    }`}
                    onClick={() => setScope("agent")}
                  >
                    <BookOpen class="size-4 mb-1" />
                    <span class="text-xs">Agent Specific</span>
                    <span class="text-[10px] opacity-75">Specific Specialist</span>
                  </button>
                </div>

                {/* Agent Picker if Scope is Agent */}
                <Show when={scope() === "agent"}>
                  <div class="flex flex-col gap-1">
                    <label class="text-[11px] font-medium text-muted-foreground">Target Agent</label>
                    <Select<AgentOption>
                      options={agentOptions()}
                      value={selectedAgentOption()}
                      onChange={(opt) => setSelectedAgentId(opt?.id ?? "")}
                      itemComponent={(item) => (
                        <SelectItem item={item.item}>{item.item.rawValue.name}</SelectItem>
                      )}
                    >
                      <SelectTrigger size="sm">
                        <SelectValue<AgentOption>>
                          {(state) => state.selectedOption()?.name ?? "Select agent..."}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent />
                    </Select>
                  </div>
                </Show>

                <div class="grid grid-cols-2 gap-3">
                  <div class="flex flex-col gap-1">
                    <label class="text-[11px] font-medium text-muted-foreground">Title / Topic</label>
                    <Input
                      type="text"
                      required
                      placeholder="e.g. API Contracts, Architecture Rules"
                      value={title()}
                      onInput={(e) => setTitle(e.currentTarget.value)}
                    />
                  </div>

                  <div class="flex flex-col gap-1">
                    <label class="text-[11px] font-medium text-muted-foreground">Source URL (Optional)</label>
                    <Input
                      type="url"
                      placeholder="e.g. https://example.com/docs"
                      value={sourceUrl()}
                      onInput={(e) => setSourceUrl(e.currentTarget.value)}
                    />
                  </div>
                </div>

                <div class="flex flex-col gap-1">
                  <label class="text-[11px] font-medium text-muted-foreground">
                    Markdown Content / Rules
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Enter documentation notes, code guidelines, or specifications..."
                    class="rounded-lg border border-border bg-background p-2.5 text-xs font-mono text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                    value={content()}
                    onInput={(e) => setContent(e.currentTarget.value)}
                  />
                </div>

                <div class="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                  <Button type="button" variant="ghost" size="sm" onClick={closeDialog}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={isSubmitting() || !title() || !content()}
                  >
                    <Show when={isSubmitting()} fallback="Save Knowledge">
                      Saving...
                    </Show>
                  </Button>
                </div>
              </form>
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
