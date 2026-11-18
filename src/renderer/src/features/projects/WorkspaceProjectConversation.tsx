import type { CentralAuthUser } from "@openbot/contracts/ipc";
import {
  ArrowRight,
  Bot,
  Crown,
  Folder,
  FolderPlus,
  GitBranch,
  Paperclip,
  Send,
  Sparkles,
  Users,
  Zap,
} from "@openbot/ui";
import { createSignal, For, Show } from "solid-js";
import { useAgents } from "../agents/agents-context";
import { CreateProjectDialog } from "./CreateProjectDialog";
import { CreateThreadDialog } from "./CreateThreadDialog";
import { ProjectHeader } from "./ProjectHeader";
import { ProjectKnowledgeModal } from "./ProjectKnowledgeModal";
import { ProjectTeamDrawer } from "./ProjectTeamDrawer";
import { useProjects } from "./projects-context";

export interface WorkspaceProjectConversationProps {
  account: () => CentralAuthUser;
}

interface ThreadMessage {
  id: string;
  senderName: string;
  senderRole?: string;
  isLead?: boolean;
  avatarLetter: string;
  content: string;
  timestamp: string;
  isUser: boolean;
}

export function WorkspaceProjectConversation(props: WorkspaceProjectConversationProps) {
  const projects = useProjects();
  const { agentList } = useAgents();

  const [inputMessage, setInputMessage] = createSignal("");
  const [threadMessages, setThreadMessages] = createSignal<ThreadMessage[]>([
    {
      id: "welcome-1",
      senderName: "Project Orchestrator",
      senderRole: "System",
      avatarLetter: "O",
      content:
        "Welcome to your Project Workspace. Workstreams are isolated in dedicated Git worktrees to prevent concurrency collisions. Use `@AgentName` to direct tasks to a specialist, or send instructions directly to the Workstream Lead.",
      timestamp: "Just now",
      isUser: false,
    },
  ]);

  const activeProject = () => projects.activeProject();
  const activeThread = () => projects.activeThread();

  const activeMembers = () =>
    projects.threadMembers().filter((m) => m.status === "active");

  const leadMember = () =>
    activeMembers().find((m) => m.isLead) ?? activeMembers()[0];

  const leadAgent = () =>
    agentList().find((a) => a.id === leadMember()?.agentId);

  const handleSendMessage = (e?: Event) => {
    e?.preventDefault();
    const text = inputMessage().trim();
    if (!text) return;

    const userMsg: ThreadMessage = {
      id: `msg-${Date.now()}`,
      senderName: props.account()?.displayName || "You",
      avatarLetter: "U",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isUser: true,
    };

    setThreadMessages((prev) => [...prev, userMsg]);
    setInputMessage("");

    // Simulate agent acknowledgment/routing
    setTimeout(() => {
      const lead = leadAgent();
      const replyMsg: ThreadMessage = {
        id: `reply-${Date.now()}`,
        senderName: lead?.name || "Thread Lead",
        senderRole: "Lead Orchestrator",
        isLead: true,
        avatarLetter: lead?.name.charAt(0) || "L",
        content: `Received instruction for workstream #${activeThread()?.name || "main"}. Git policy is set to [${projects.gitPolicy() === "automatic" ? "⚡ Automatic" : "🔍 After Review"}]. Initializing task execution tracer...`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isUser: false,
      };
      setThreadMessages((prev) => [...prev, replyMsg]);
    }, 600);
  };

  const handleMentionClick = (agentName: string) => {
    setInputMessage((prev) => `@${agentName} ${prev}`);
  };

  return (
    <div class="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
      {/* Top Project Header Bar */}
      <ProjectHeader />

      {/* Main Area */}
      <Show
        when={activeProject() && activeThread()}
        fallback={
          <div class="flex-1 flex flex-col items-center justify-center p-8 text-center bg-muted/10">
            <div class="size-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4 shadow-sm">
              <Folder class="size-8" />
            </div>
            <h2 class="text-lg font-semibold text-foreground">
              {activeProject() ? "Select a Thread Workstream" : "No Project Workspace Open"}
            </h2>
            <p class="text-xs text-muted-foreground max-w-md mt-1.5 leading-relaxed">
              {activeProject()
                ? "Choose or create a thread workstream from the top tab bar to collaborate in an isolated git worktree."
                : "Create or select a project workspace with dedicated folder binding and multi-agent workstreams."}
            </p>
            <button
              type="button"
              class="mt-5 flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow-sm hover:opacity-90 transition-opacity"
              onClick={() => {
                if (activeProject()) {
                  projects.setCreateThreadDialogOpen(true);
                } else {
                  projects.setCreateProjectDialogOpen(true);
                }
              }}
            >
              <FolderPlus class="size-4" />
              <span>{activeProject() ? "Create Workstream Thread" : "Create New Project"}</span>
            </button>
          </div>
        }
      >
        <div class="flex-1 flex flex-col overflow-hidden relative">
          {/* Thread Workstream Status Banner */}
          <div class="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border/40 text-xs shrink-0">
            <div class="flex items-center gap-2">
              <span class="font-medium text-foreground">#{activeThread()?.name}</span>
              <span class="text-muted-foreground">•</span>
              <span class="text-muted-foreground font-mono text-[11px]" title={activeThread()?.worktreePath}>
                Worktree: {activeThread()?.worktreePath || "isolated branch"}
              </span>
            </div>

            <div class="flex items-center gap-2">
              <Show when={leadAgent()}>
                {(lead) => (
                  <span class="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Crown class="size-3 text-amber-500 fill-amber-500" />
                    <span>Lead: <strong>{lead().name}</strong></span>
                  </span>
                )}
              </Show>

              <span class="text-muted-foreground">•</span>

              <span class="text-[11px] text-muted-foreground">
                Policy:{" "}
                <strong
                  class={
                    projects.gitPolicy() === "automatic"
                      ? "text-emerald-500"
                      : "text-amber-500"
                  }
                >
                  {projects.gitPolicy() === "automatic" ? "⚡ Auto-Commit" : "🔍 After Review"}
                </strong>
              </span>
            </div>
          </div>

          {/* Conversation Stream */}
          <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            <For each={threadMessages()}>
              {(msg) => (
                <div
                  class={`flex gap-3 max-w-3xl ${msg.isUser ? "ml-auto flex-row-reverse" : ""}`}
                >
                  <div
                    class={`size-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 select-none shadow-xs ${
                      msg.isUser
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted border border-border text-foreground"
                    }`}
                  >
                    {msg.avatarLetter}
                  </div>

                  <div
                    class={`flex flex-col gap-1 rounded-2xl p-3.5 text-xs shadow-xs ${
                      msg.isUser
                        ? "bg-primary text-primary-foreground rounded-tr-xs"
                        : "bg-card border border-border/60 text-foreground rounded-tl-xs"
                    }`}
                  >
                    <div class="flex items-center gap-2 select-none">
                      <span class="font-semibold leading-none">{msg.senderName}</span>
                      <Show when={msg.senderRole}>
                        <span
                          class={`text-[9px] px-1 py-0.2 rounded font-medium opacity-80 ${
                            msg.isUser
                              ? "bg-primary-foreground/20"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {msg.senderRole}
                        </span>
                      </Show>
                      <span class="text-[10px] opacity-60 ml-auto">{msg.timestamp}</span>
                    </div>

                    <div class="text-xs leading-relaxed whitespace-pre-wrap mt-0.5">
                      {msg.content}
                    </div>
                  </div>
                </div>
              )}
            </For>
          </div>

          {/* Mentions Pill Bar & Routing Hint */}
          <div class="px-4 py-1.5 border-t border-border/30 bg-background/50 flex items-center justify-between text-[11px] text-muted-foreground shrink-0">
            <div class="flex items-center gap-1.5 overflow-x-auto">
              <span class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground shrink-0">
                Mention:
              </span>
              <For each={activeMembers()}>
                {(member) => {
                  const agent = () => agentList().find((a) => a.id === member.agentId);
                  return (
                    <button
                      type="button"
                      class="flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/60 hover:bg-primary/10 hover:text-primary transition-colors font-medium shrink-0"
                      onClick={() => handleMentionClick(agent()?.name || "agent")}
                    >
                      <Show when={member.isLead}>
                        <Crown class="size-2.5 text-amber-500 fill-amber-500" />
                      </Show>
                      <span>@{agent()?.name}</span>
                    </button>
                  );
                }}
              </For>
            </div>

            <span class="text-[10px] opacity-70 shrink-0 hidden sm:inline">
              Messages without @mention route to Workstream Lead
            </span>
          </div>

          {/* Chat Composer */}
          <form
            onSubmit={handleSendMessage}
            class="p-4 pt-1 border-t border-border/40 bg-background/95 backdrop-blur shrink-0"
          >
            <div class="flex items-end gap-2 rounded-xl border border-input bg-card p-2 shadow-xs focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all">
              <textarea
                rows={2}
                placeholder={`Message #${activeThread()?.name} or @mention a specialist...`}
                class="flex-1 bg-transparent resize-none border-0 p-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden"
                value={inputMessage()}
                onInput={(e) => setInputMessage(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <button
                type="submit"
                disabled={!inputMessage().trim()}
                class="size-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 disabled:opacity-40 transition-opacity shrink-0"
                title="Send instruction to workstream"
              >
                <Send class="size-3.5" />
              </button>
            </div>
          </form>
        </div>
      </Show>

      {/* Slide-Over Team Drawer */}
      <ProjectTeamDrawer />

      {/* Knowledge Bank Modal */}
      <ProjectKnowledgeModal />

      {/* Creation Dialogs */}
      <CreateProjectDialog />
      <CreateThreadDialog />
    </div>
  );
}
