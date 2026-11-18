import type { ProjectGitPolicy } from "@openbot/contracts/ipc";
import {
  BookOpen,
  Check,
  CircleAlert,
  Copy,
  ExternalLink,
  Folder,
  GitBranch,
  GitCommitHorizontal,
  Plus,
  RefreshCw,
  Users,
  Zap,
} from "@openbot/ui";
import { For, Show } from "solid-js";
import { useProjects } from "./projects-context";

export function ProjectHeader() {
  const projects = useProjects();
  const proj = () => projects.activeProject();
  const thread = () => projects.activeThread();
  const telemetry = () => projects.gitTelemetry();

  const copyPath = () => {
    const path = proj()?.workspacePath;
    if (path) {
      void navigator.clipboard.writeText(path);
    }
  };

  const activeMembersCount = () => {
    return projects.threadMembers().filter((m) => m.status === "active").length;
  };

  return (
    <header class="flex flex-col border-b border-border/50 bg-background/95 backdrop-blur shrink-0 z-10">
      {/* Top Bar: Workspace Identity + Telemetry + Actions */}
      <div class="flex items-center justify-between px-4 py-2.5 gap-4">
        {/* Workspace Folder & Name */}
        <div class="flex items-center gap-3 min-w-0">
          <div class="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Folder class="size-4.5" />
          </div>
          <div class="flex flex-col min-w-0">
            <div class="flex items-center gap-2">
              <h1 class="text-sm font-semibold truncate text-foreground leading-tight">
                {proj()?.name ?? "Project Workspace"}
              </h1>
              <span class="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono">
                Project
              </span>
            </div>
            <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span class="truncate max-w-[280px] font-mono text-[11px]" title={proj()?.workspacePath}>
                {proj()?.workspacePath}
              </span>
              <button
                type="button"
                onClick={copyPath}
                class="hover:text-foreground transition-colors p-0.5 rounded"
                title="Copy Workspace Path"
              >
                <Copy class="size-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Live Git Telemetry Bar */}
        <div class="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-md border border-border/40 bg-muted/30 text-xs">
          <Show
            when={telemetry()}
            fallback={
              <div class="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                <GitBranch class="size-3.5 opacity-60" />
                <span>Reading Git Status...</span>
              </div>
            }
          >
            {(tele) => (
              <>
                {/* Branch */}
                <div class="flex items-center gap-1 font-mono font-medium text-foreground">
                  <GitBranch class="size-3.5 text-primary" />
                  <span>{tele().branch}</span>
                </div>

                <div class="h-3 w-px bg-border/60" />

                {/* Status: Clean or Dirty */}
                <div class="flex items-center gap-1">
                  <Show
                    when={tele().isClean}
                    fallback={
                      <span class="flex items-center gap-1 text-amber-500 font-medium text-[11px]">
                        <CircleAlert class="size-3" />
                        <span>{tele().uncommittedCount} dirty files</span>
                      </span>
                    }
                  >
                    <span class="flex items-center gap-1 text-emerald-500 font-medium text-[11px]">
                      <Check class="size-3" />
                      <span>Working Tree Clean</span>
                    </span>
                  </Show>
                </div>

                <div class="h-3 w-px bg-border/60" />

                {/* Last Commit */}
                <div
                  class="flex items-center gap-1 text-[11px] text-muted-foreground truncate max-w-[220px]"
                  title={`Last Commit: ${tele().lastCommitMessage} by ${tele().lastCommitAuthor} (${tele().lastCommitTime})`}
                >
                  <GitCommitHorizontal class="size-3.5 shrink-0 opacity-70" />
                  <span class="truncate font-mono">{tele().lastCommitHash}</span>
                  <span class="truncate">• {tele().lastCommitMessage}</span>
                  <span class="shrink-0">({tele().lastCommitTime})</span>
                </div>

                <button
                  type="button"
                  onClick={() => void projects.refreshTelemetry()}
                  class="p-0.5 rounded hover:bg-background text-muted-foreground hover:text-foreground transition-colors ml-0.5"
                  title="Refresh Git Status"
                >
                  <RefreshCw class="size-3" />
                </button>
              </>
            )}
          </Show>
        </div>

        {/* Right Action Buttons */}
        <div class="flex items-center gap-2 shrink-0">
          {/* Git Policy Selector */}
          <div class="flex items-center gap-1.5 bg-muted/40 rounded-lg p-0.5 border border-border/40 text-xs">
            <button
              type="button"
              class="flex items-center gap-1 px-2 py-1 rounded-md transition-colors"
              classList={{
                "bg-background font-medium text-foreground shadow-xs":
                  projects.gitPolicy() === "automatic",
                "text-muted-foreground hover:text-foreground":
                  projects.gitPolicy() !== "automatic",
              }}
              onClick={() => void projects.updateGitPolicy("automatic")}
              title="Automatic Mode: Auto-commits changes on agent completion"
            >
              <Zap class="size-3 text-emerald-500" />
              <span>⚡ Auto</span>
            </button>
            <button
              type="button"
              class="flex items-center gap-1 px-2 py-1 rounded-md transition-colors"
              classList={{
                "bg-background font-medium text-foreground shadow-xs":
                  projects.gitPolicy() === "review",
                "text-muted-foreground hover:text-foreground":
                  projects.gitPolicy() !== "review",
              }}
              onClick={() => void projects.updateGitPolicy("review")}
              title="Review Mode: Stage changes & prompt for user review before commit"
            >
              <span>🔍 Review</span>
            </button>
          </div>

          {/* Knowledge Bank Button */}
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
            onClick={() => projects.setKnowledgeModalOpen(true)}
            title="Knowledge Bank (Local Context Files)"
          >
            <BookOpen class="size-3.5 text-primary" />
            <span class="hidden sm:inline">Knowledge</span>
          </button>

          {/* Team Drawer Toggle Button */}
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
            classList={{
              "border-primary text-primary bg-primary/10": projects.teamDrawerOpen(),
            }}
            onClick={() => projects.setTeamDrawerOpen(!projects.teamDrawerOpen())}
            title="Manage Thread Team Members"
          >
            <Users class="size-3.5" />
            <span>Team ({activeMembersCount()})</span>
          </button>
        </div>
      </div>

      {/* Bottom Tabs: Thread Workstreams */}
      <div class="flex items-center gap-1 px-4 border-t border-border/40 overflow-x-auto py-1">
        <span class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mr-1">
          Workstreams:
        </span>
        <For each={projects.threads()}>
          {(th) => {
            const isActive = () => projects.activeThreadId() === th.id;
            return (
              <button
                type="button"
                class="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors shrink-0"
                classList={{
                  "bg-primary text-primary-foreground font-medium shadow-xs": isActive(),
                  "hover:bg-accent text-muted-foreground hover:text-foreground": !isActive(),
                }}
                onClick={() => void projects.selectThread(th.id)}
              >
                <GitBranch class="size-3 opacity-80" />
                <span>#{th.name}</span>
                <span
                  class="text-[9px] px-1 py-0.2 rounded font-mono uppercase"
                  classList={{
                    "bg-white/20 text-primary-foreground": isActive(),
                    "bg-muted text-muted-foreground": !isActive(),
                  }}
                >
                  {th.gitPolicy === "automatic" ? "⚡ auto" : "🔍 review"}
                </span>
              </button>
            );
          }}
        </For>
        <button
          type="button"
          class="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          onClick={() => projects.setCreateThreadDialogOpen(true)}
          title="Create New Thread Workstream"
        >
          <Plus class="size-3" />
          <span>New Thread</span>
        </button>
      </div>
    </header>
  );
}
