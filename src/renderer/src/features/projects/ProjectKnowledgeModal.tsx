import type { ProjectKnowledgeScope } from "@openbot/contracts/ipc";
import {
  BookOpen,
  FileCode,
  FileText,
  Globe,
  Plus,
  Trash2,
  X,
} from "@openbot/ui";
import { createSignal, For, Show } from "solid-js";
import { useAgents } from "../agents/agents-context";
import { useProjects } from "./projects-context";

export function ProjectKnowledgeModal() {
  const projects = useProjects();
  const { agentList } = useAgents();

  const [title, setTitle] = createSignal("");
  const [content, setContent] = createSignal("");
  const [scope, setScope] = createSignal<ProjectKnowledgeScope>("project");
  const [selectedAgentId, setSelectedAgentId] = createSignal("");
  const [sourceUrl, setSourceUrl] = createSignal("");
  const [isSubmitting, setIsSubmitting] = createSignal(false);

  const activeProject = () => projects.activeProject();
  const activeThread = () => projects.activeThread();

  const handleAddSource = async (e: Event) => {
    e.preventDefault();
    const projId = projects.activeProjectId();
    if (!projId || !title() || !content()) return;

    setIsSubmitting(true);
    try {
      await projects.addKnowledge({
        projectId: projId,
        threadId: scope() === "thread" ? projects.activeThreadId() ?? undefined : undefined,
        agentId: scope() === "agent" ? selectedAgentId() || undefined : undefined,
        scope: scope(),
        title: title(),
        content: content(),
        sourceUrl: sourceUrl() || undefined,
      });

      setTitle("");
      setContent("");
      setSourceUrl("");
    } catch (err) {
      console.error("Failed to add knowledge source", err);
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
    <Show when={projects.knowledgeModalOpen()}>
      <div class="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-card border border-border shadow-2xl rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
          {/* Header */}
          <div class="flex items-center justify-between px-6 py-4 border-b border-border/60">
            <div class="flex items-center gap-2.5">
              <div class="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <BookOpen class="size-4.5" />
              </div>
              <div>
                <h2 class="text-base font-semibold text-foreground leading-tight">
                  Knowledge Bank
                </h2>
                <p class="text-xs text-muted-foreground leading-tight">
                  Local context files stored in .openbot/knowledge/ to prevent hallucinations
                </p>
              </div>
            </div>
            <button
              type="button"
              class="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              onClick={() => projects.setKnowledgeModalOpen(false)}
            >
              <X class="size-4.5" />
            </button>
          </div>

          {/* Modal Body */}
          <div class="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
            {/* Knowledge Sources List */}
            <div class="flex flex-col gap-2">
              <span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Current Sources ({projects.knowledgeSources().length})
              </span>

              <Show
                when={projects.knowledgeSources().length > 0}
                fallback={
                  <div class="p-6 text-center border border-dashed border-border/60 rounded-xl text-muted-foreground">
                    <p class="text-xs">No knowledge documents attached yet.</p>
                    <p class="text-[11px] opacity-75 mt-0.5">
                      Add framework guides (e.g. Astro docs, API specs) below.
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

                          <button
                            type="button"
                            class="p-1 rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0"
                            onClick={() => void projects.deleteKnowledge(doc.id)}
                            title="Delete knowledge source"
                          >
                            <Trash2 class="size-3.5" />
                          </button>
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
                  class="flex flex-col items-center justify-center p-2.5 rounded-lg border text-center transition-colors"
                  classList={{
                    "border-primary bg-primary/10 text-primary font-medium": scope() === "project",
                    "border-border bg-card text-muted-foreground hover:border-border/80": scope() !== "project",
                  }}
                  onClick={() => setScope("project")}
                >
                  <Globe class="size-4 mb-1" />
                  <span class="text-xs">Project Wide</span>
                  <span class="text-[10px] opacity-75">All threads</span>
                </button>

                <button
                  type="button"
                  class="flex flex-col items-center justify-center p-2.5 rounded-lg border text-center transition-colors"
                  classList={{
                    "border-primary bg-primary/10 text-primary font-medium": scope() === "thread",
                    "border-border bg-card text-muted-foreground hover:border-border/80": scope() !== "thread",
                  }}
                  onClick={() => setScope("thread")}
                >
                  <FileCode class="size-4 mb-1" />
                  <span class="text-xs">Thread Specific</span>
                  <span class="text-[10px] opacity-75">#{activeThread()?.name ?? "Workstream"}</span>
                </button>

                <button
                  type="button"
                  class="flex flex-col items-center justify-center p-2.5 rounded-lg border text-center transition-colors"
                  classList={{
                    "border-primary bg-primary/10 text-primary font-medium": scope() === "agent",
                    "border-border bg-card text-muted-foreground hover:border-border/80": scope() !== "agent",
                  }}
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
                  <select
                    class="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                    value={selectedAgentId()}
                    onChange={(e) => setSelectedAgentId(e.currentTarget.value)}
                  >
                    <option value="">Select agent...</option>
                    <For each={agentList()}>
                      {(agent) => <option value={agent.id}>{agent.name}</option>}
                    </For>
                  </select>
                </div>
              </Show>

              <div class="grid grid-cols-2 gap-3">
                <div class="flex flex-col gap-1">
                  <label class="text-[11px] font-medium text-muted-foreground">Title / Topic</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Astro 5 Island Architecture Rules"
                    class="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                    value={title()}
                    onInput={(e) => setTitle(e.currentTarget.value)}
                  />
                </div>

                <div class="flex flex-col gap-1">
                  <label class="text-[11px] font-medium text-muted-foreground">Source URL (Optional)</label>
                  <input
                    type="url"
                    placeholder="e.g. https://docs.astro.build"
                    class="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
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
                  placeholder="Paste documentation rules, code conventions, or design tokens here..."
                  class="rounded-md border border-input bg-background p-2 text-xs font-mono text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  value={content()}
                  onInput={(e) => setContent(e.currentTarget.value)}
                />
              </div>

              <div class="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  class="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => projects.setKnowledgeModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting() || !title() || !content()}
                  class="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50"
                >
                  <Plus class="size-3.5" />
                  <span>Save Knowledge</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Show>
  );
}
