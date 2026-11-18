import type { ProjectMemberMemoryMode, ProjectThreadMember } from "@openbot/contracts/ipc";
import {
  AlertTriangle,
  Bot,
  Check,
  Crown,
  History,
  Plus,
  RotateCcw,
  Sparkles,
  UserMinus,
  UserPlus,
  X,
  Zap,
} from "@openbot/ui";
import { createMemo, createSignal, For, Show } from "solid-js";
import { useAgents } from "../agents/agents-context";
import { useProjects } from "./projects-context";

export function ProjectTeamDrawer() {
  const projects = useProjects();
  const { agentList, modelOptions, openAgentSetup } = useAgents();

  const activeThread = () => projects.activeThread();
  const members = () => projects.threadMembers();

  const activeMembers = createMemo(() =>
    members().filter((m) => m.status === "active"),
  );

  const inactiveMembers = createMemo(() =>
    members().filter((m) => m.status === "inactive"),
  );

  const availableAgentsToAdd = createMemo(() => {
    const currentAgentIds = new Set(members().map((m) => m.agentId));
    return agentList().filter((a) => !currentAgentIds.has(a.id));
  });

  // State for Add Agent form
  const [selectedAgentId, setSelectedAgentId] = createSignal("");
  const [selectedProvider, setSelectedProvider] = createSignal("");
  const [selectedModel, setSelectedModel] = createSignal("");
  const [asLead, setAsLead] = createSignal(false);

  const handleAddAgent = async () => {
    const threadId = projects.activeThreadId();
    const agentId = selectedAgentId();
    if (!threadId || !agentId) return;

    await projects.setMemberStatus({
      threadId,
      agentId,
      status: "active",
      memoryMode: "fresh",
    });

    setSelectedAgentId("");
    setSelectedProvider("");
    setSelectedModel("");
    setAsLead(false);
  };

  const handleRemoveMember = async (agentId: string) => {
    const threadId = projects.activeThreadId();
    if (!threadId) return;
    await projects.setMemberStatus({
      threadId,
      agentId,
      status: "inactive",
    });
  };

  const handleReaddConfirm = async (memoryMode: ProjectMemberMemoryMode) => {
    const target = projects.readdModalMember();
    const threadId = projects.activeThreadId();
    if (!target || !threadId) return;

    await projects.setMemberStatus({
      threadId,
      agentId: target.agentId,
      status: "active",
      memoryMode,
    });

    projects.setReaddModalMember(null);
  };

  // Model recommendation badges
  const getRecommendationBadge = (modelName: string) => {
    const m = modelName.toLowerCase();
    if (m.includes("claude-3-7") || m.includes("opus") || m.includes("reasoning")) {
      return { label: "Deep Reasoning", color: "text-purple-500 bg-purple-500/10" };
    }
    if (m.includes("sonnet") || m.includes("gpt-4o") || m.includes("coder") || m.includes("glm")) {
      return { label: "Top Coder", color: "text-emerald-500 bg-emerald-500/10" };
    }
    if (m.includes("flash") || m.includes("haiku") || m.includes("mini")) {
      return { label: "Fast & Light", color: "text-blue-500 bg-blue-500/10" };
    }
    return null;
  };

  return (
    <Show when={projects.teamDrawerOpen()}>
      <div class="fixed inset-y-0 right-0 z-40 w-96 max-w-full bg-background border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 select-none">
        {/* Drawer Header */}
        <div class="flex items-center justify-between px-4 py-3 border-b border-border/60">
          <div class="flex items-center gap-2">
            <Bot class="size-4.5 text-primary" />
            <div>
              <h2 class="text-sm font-semibold text-foreground leading-tight">
                Thread Team
              </h2>
              <p class="text-[11px] text-muted-foreground leading-tight">
                #{activeThread()?.name ?? "Workstream"}
              </p>
            </div>
          </div>
          <button
            type="button"
            class="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            onClick={() => projects.setTeamDrawerOpen(false)}
          >
            <X class="size-4" />
          </button>
        </div>

        {/* Drawer Content */}
        <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
          {/* Active Members Section */}
          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Active Members ({activeMembers().length})
              </span>
            </div>

            <Show
              when={activeMembers().length > 0}
              fallback={
                <p class="text-xs text-muted-foreground italic py-2">
                  No active agents in this thread. Add an agent below.
                </p>
              }
            >
              <div class="flex flex-col gap-1.5">
                <For each={activeMembers()}>
                  {(member) => {
                    const agent = () => agentList().find((a) => a.id === member.agentId);
                    const badge = () =>
                      getRecommendationBadge(member.modelOverride || agent()?.model || "");
                    return (
                      <div class="flex items-center justify-between p-2.5 rounded-lg border border-border/50 bg-card hover:border-border transition-colors">
                        <div class="flex items-center gap-2.5 min-w-0">
                          <div class="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 relative">
                            {agent()?.name.charAt(0) ?? "A"}
                            <Show when={member.isLead}>
                              <Crown class="size-3 text-amber-500 absolute -top-1 -right-1 fill-amber-500" />
                            </Show>
                          </div>
                          <div class="flex flex-col min-w-0">
                            <div class="flex items-center gap-1.5">
                              <span class="text-xs font-semibold text-foreground truncate">
                                {agent()?.name ?? "Unknown Agent"}
                              </span>
                              <Show when={member.isLead}>
                                <span class="text-[9px] bg-amber-500/15 text-amber-600 dark:text-amber-400 px-1 rounded font-medium">
                                  Lead
                                </span>
                              </Show>
                            </div>
                            <div class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              <span class="truncate">
                                {member.modelOverride || agent()?.model || "Default Model"}
                              </span>
                              <Show when={badge()}>
                                {(b) => (
                                  <span class={`text-[9px] px-1 rounded font-medium ${b().color}`}>
                                    {b().label}
                                  </span>
                                )}
                              </Show>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          class="p-1 rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                          onClick={() => void handleRemoveMember(member.agentId)}
                          title="Remove from thread (old work remains visible)"
                        >
                          <UserMinus class="size-3.5" />
                        </button>
                      </div>
                    );
                  }}
                </For>
              </div>
            </Show>
          </div>

          {/* Inactive / Removed Members (Grayed out with full history preserved) */}
          <Show when={inactiveMembers().length > 0}>
            <div class="flex flex-col gap-2 pt-2 border-t border-border/50">
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Past Members ({inactiveMembers().length})
                </span>
                <span class="text-[10px] text-muted-foreground">Context preserved</span>
              </div>

              <div class="flex flex-col gap-1.5">
                <For each={inactiveMembers()}>
                  {(member) => {
                    const agent = () => agentList().find((a) => a.id === member.agentId);
                    return (
                      <div class="flex items-center justify-between p-2 rounded-lg border border-dashed border-border/40 bg-muted/20 opacity-60 hover:opacity-100 transition-opacity">
                        <div class="flex items-center gap-2.5 min-w-0">
                          <div class="size-7 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-bold text-xs shrink-0 grayscale">
                            {agent()?.name.charAt(0) ?? "A"}
                          </div>
                          <div class="flex flex-col min-w-0">
                            <span class="text-xs font-medium text-foreground truncate">
                              {agent()?.name ?? "Former Agent"}
                            </span>
                            <span class="text-[10px] text-muted-foreground">
                              Removed • Previous transcripts intact
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          class="flex items-center gap-1 rounded bg-accent px-2 py-1 text-[11px] font-medium text-accent-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                          onClick={() => projects.setReaddModalMember(member)}
                          title="Re-add this agent to the thread"
                        >
                          <RotateCcw class="size-3" />
                          <span>Re-add</span>
                        </button>
                      </div>
                    );
                  }}
                </For>
              </div>
            </div>
          </Show>

          {/* Add New Agent to Thread */}
          <div class="flex flex-col gap-3 pt-3 border-t border-border/50">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Add Agent to Workstream
              </span>
              <button
                type="button"
                class="text-[11px] font-medium text-primary hover:underline flex items-center gap-0.5"
                onClick={() => {
                  projects.setTeamDrawerOpen(false);
                  openAgentSetup();
                }}
              >
                <Plus class="size-3" />
                <span>Create New Agent</span>
              </button>
            </div>

            <Show
              when={availableAgentsToAdd().length > 0}
              fallback={
                <p class="text-xs text-muted-foreground">
                  All registered agents are already in this thread.
                </p>
              }
            >
              <div class="flex flex-col gap-2.5 bg-muted/30 p-3 rounded-lg border border-border/40">
                <div class="flex flex-col gap-1">
                  <label class="text-[11px] font-medium text-muted-foreground">
                    Select Agent
                  </label>
                  <select
                    class="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                    value={selectedAgentId()}
                    onChange={(e) => setSelectedAgentId(e.currentTarget.value)}
                  >
                    <option value="">Choose an agent...</option>
                    <For each={availableAgentsToAdd()}>
                      {(agent) => (
                        <option value={agent.id}>
                          {agent.name} ({agent.provider} / {agent.model})
                        </option>
                      )}
                    </For>
                  </select>
                </div>

                <button
                  type="button"
                  class="flex items-center justify-center gap-1.5 rounded-md bg-primary py-1.5 px-3 text-xs font-medium text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
                  disabled={!selectedAgentId()}
                  onClick={() => void handleAddAgent()}
                >
                  <UserPlus class="size-3.5" />
                  <span>Add to #{activeThread()?.name ?? "Workstream"}</span>
                </button>
              </div>
            </Show>
          </div>
        </div>

        {/* Re-Add Choice Modal */}
        <Show when={projects.readdModalMember()}>
          {(target) => {
            const agent = () => agentList().find((a) => a.id === target().agentId);
            return (
              <div class="absolute inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4">
                <div class="bg-card border border-border shadow-xl rounded-xl p-5 flex flex-col gap-4 max-w-sm w-full animate-in zoom-in-95 duration-150">
                  <div class="flex items-center justify-between">
                    <h3 class="text-sm font-semibold text-foreground">
                      Re-add {agent()?.name}
                    </h3>
                    <button
                      type="button"
                      class="text-muted-foreground hover:text-foreground"
                      onClick={() => projects.setReaddModalMember(null)}
                    >
                      <X class="size-4" />
                    </button>
                  </div>

                  <p class="text-xs text-muted-foreground">
                    How should {agent()?.name} rejoin #{activeThread()?.name}?
                  </p>

                  <div class="flex flex-col gap-2">
                    {/* Keep Memory Intact Option */}
                    <button
                      type="button"
                      class="flex flex-col gap-1 p-3 rounded-lg border border-primary/40 bg-primary/5 hover:bg-primary/10 text-left transition-colors"
                      onClick={() => void handleReaddConfirm("intact")}
                    >
                      <div class="flex items-center justify-between">
                        <span class="text-xs font-semibold text-primary flex items-center gap-1.5">
                          <History class="size-3.5" />
                          Keep Memory Intact (Recommended)
                        </span>
                        <span class="text-[9px] bg-primary text-primary-foreground px-1.5 py-0.2 rounded font-medium">
                          Catch-Up
                        </span>
                      </div>
                      <p class="text-[11px] text-muted-foreground">
                        Retains full conversation memory. The orchestrator will provide an automated
                        catch-up briefing of all thread updates while away.
                      </p>
                    </button>

                    {/* Fresh Start Option */}
                    <button
                      type="button"
                      class="flex flex-col gap-1 p-3 rounded-lg border border-border bg-card hover:bg-accent text-left transition-colors"
                      onClick={() => void handleReaddConfirm("fresh")}
                    >
                      <span class="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Sparkles class="size-3.5 text-muted-foreground" />
                        Fresh Start
                      </span>
                      <p class="text-[11px] text-muted-foreground">
                        Joins cleanly without previous conversational baggage or memory dependencies.
                      </p>
                    </button>
                  </div>
                </div>
              </div>
            );
          }}
        </Show>
      </div>
    </Show>
  );
}
