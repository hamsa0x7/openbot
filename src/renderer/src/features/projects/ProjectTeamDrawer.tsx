import type { ProjectMemberMemoryMode, ProjectThreadMember } from "@openbot/contracts/ipc";
import {
  Bot,
  Button,
  Check,
  Crown,
  History,
  IconButton,
  Plus,
  RotateCcw,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sparkles,
  UserMinus,
  UserPlus,
  X,
  Zap,
} from "@openbot/ui";
import { toast } from "solid-sonner";
import { createMemo, createSignal, For, Show } from "solid-js";
import { useAgents } from "../agents/agents-context";
import { useProjects } from "./projects-context";

interface AgentOption {
  id: string;
  name: string;
}

export function ProjectTeamDrawer() {
  const projects = useProjects();
  const { agentList, openAgentSetup } = useAgents();

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

  const availableAgentOptions = createMemo<AgentOption[]>(() => [
    { id: "", name: "Choose an agent..." },
    ...availableAgentsToAdd().map((a) => ({ id: a.id, name: `${a.name} (${a.provider})` })),
  ]);

  const [selectedAgentId, setSelectedAgentId] = createSignal("");

  const selectedAgentOption = createMemo(() => {
    const id = selectedAgentId();
    return availableAgentOptions().find((opt) => opt.id === id) ?? availableAgentOptions()[0];
  });

  const handleAddAgent = async () => {
    const threadId = projects.activeThreadId();
    const agentId = selectedAgentId();
    if (!threadId || !agentId) return;

    try {
      await projects.setMemberStatus({
        threadId,
        agentId,
        status: "active",
        memoryMode: "fresh",
      });
      toast.success("Agent added to workstream");
      setSelectedAgentId("");
    } catch (e: any) {
      toast.error(e?.message || "Failed to add agent");
    }
  };

  const handleRemoveMember = async (agentId: string) => {
    const threadId = projects.activeThreadId();
    if (!threadId) return;
    try {
      await projects.setMemberStatus({
        threadId,
        agentId,
        status: "inactive",
      });
      toast.success("Agent removed from workstream");
    } catch (e: any) {
      toast.error(e?.message || "Failed to remove agent");
    }
  };

  const handleReaddConfirm = async (memoryMode: ProjectMemberMemoryMode) => {
    const target = projects.readdModalMember();
    const threadId = projects.activeThreadId();
    if (!target || !threadId) return;

    try {
      await projects.setMemberStatus({
        threadId,
        agentId: target.agentId,
        status: "active",
        memoryMode,
      });
      toast.success("Agent re-added to workstream");
      projects.setReaddModalMember(null);
    } catch (e: any) {
      toast.error(e?.message || "Failed to re-add agent");
    }
  };

  return (
    <Show when={projects.teamDrawerOpen()}>
      <div class="fixed top-[42px] bottom-0 right-0 z-40 w-96 max-w-full bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 select-none">
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
          <IconButton label="Close" variant="ghost" onClick={() => projects.setTeamDrawerOpen(false)}>
            <X class="size-4" />
          </IconButton>
        </div>

        {/* Drawer Content */}
        <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
          {/* Active Members Section */}
          <div class="flex flex-col gap-2">
            <span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Active Members ({activeMembers().length})
            </span>

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
                    return (
                      <div class="flex items-center justify-between p-2.5 rounded-lg border border-border/50 bg-background hover:border-border transition-colors">
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
                                <span class="text-[9px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1 py-0.2 rounded font-medium">
                                  Lead
                                </span>
                              </Show>
                            </div>
                            <span class="text-[10px] text-muted-foreground truncate">
                              {agent()?.provider} / {agent()?.model}
                            </span>
                          </div>
                        </div>

                        <Show when={!member.isLead}>
                          <IconButton
                            label="Remove agent"
                            variant="ghost"
                            class="text-muted-foreground hover:text-destructive shrink-0"
                            onClick={() => void handleRemoveMember(member.agentId)}
                          >
                            <UserMinus class="size-3.5" />
                          </IconButton>
                        </Show>
                      </div>
                    );
                  }}
                </For>
              </div>
            </Show>
          </div>

          {/* Inactive Members Section */}
          <Show when={inactiveMembers().length > 0}>
            <div class="flex flex-col gap-2">
              <span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Previous Members ({inactiveMembers().length})
              </span>
              <div class="flex flex-col gap-1.5">
                <For each={inactiveMembers()}>
                  {(member) => {
                    const agent = () => agentList().find((a) => a.id === member.agentId);
                    return (
                      <div class="flex items-center justify-between p-2 rounded-lg border border-border/30 bg-muted/20 opacity-75 hover:opacity-100 transition-opacity">
                        <div class="flex items-center gap-2 min-w-0">
                          <div class="size-7 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-bold text-[11px] shrink-0">
                            {agent()?.name.charAt(0) ?? "A"}
                          </div>
                          <span class="text-xs text-foreground truncate">{agent()?.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => projects.setReaddModalMember(member)}
                        >
                          <RotateCcw class="size-3 mr-1" />
                          Re-add
                        </Button>
                      </div>
                    );
                  }}
                </For>
              </div>
            </div>
          </Show>

          {/* Add Agent to Thread */}
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
                <span>New Agent</span>
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
                <Select<AgentOption>
                  options={availableAgentOptions()}
                  value={selectedAgentOption()}
                  onChange={(opt) => setSelectedAgentId(opt?.id ?? "")}
                  itemComponent={(item) => (
                    <SelectItem item={item.item}>{item.item.rawValue.name}</SelectItem>
                  )}
                >
                  <SelectTrigger size="sm">
                    <SelectValue<AgentOption>>
                      {(state) => state.selectedOption()?.name ?? "Choose an agent..."}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent />
                </Select>

                <Button
                  variant="primary"
                  size="sm"
                  disabled={!selectedAgentId()}
                  onClick={() => void handleAddAgent()}
                >
                  <UserPlus class="size-3.5 mr-1" />
                  Add to #{activeThread()?.name ?? "Workstream"}
                </Button>
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
                    <IconButton
                      label="Close"
                      variant="ghost"
                      onClick={() => projects.setReaddModalMember(null)}
                    >
                      <X class="size-4" />
                    </IconButton>
                  </div>

                  <p class="text-xs text-muted-foreground">
                    Choose how this agent resumes working on this workstream:
                  </p>

                  <div class="flex flex-col gap-2">
                    <button
                      type="button"
                      class="flex flex-col p-2.5 rounded-lg border border-border hover:border-primary bg-background text-left transition-colors cursor-pointer"
                      onClick={() => void handleReaddConfirm("fresh")}
                    >
                      <span class="text-xs font-semibold text-foreground flex items-center gap-1">
                        <Sparkles class="size-3 text-primary" />
                        Fresh Context
                      </span>
                      <span class="text-[10px] text-muted-foreground mt-0.5">
                        Start with a clean context window for this thread.
                      </span>
                    </button>

                    <button
                      type="button"
                      class="flex flex-col p-2.5 rounded-lg border border-border hover:border-primary bg-background text-left transition-colors cursor-pointer"
                      onClick={() => void handleReaddConfirm("resume")}
                    >
                      <span class="text-xs font-semibold text-foreground flex items-center gap-1">
                        <History class="size-3 text-emerald-500" />
                        Resume History
                      </span>
                      <span class="text-[10px] text-muted-foreground mt-0.5">
                        Retain previous conversation and work context.
                      </span>
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
