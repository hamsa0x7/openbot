import type { ProjectGitPolicy } from "@openbot/contracts/ipc";
import {
  BookOpen,
  Button,
  Check,
  CircleAlert,
  Copy,
  Folder,
  GitBranch,
  IconButton,
  Plus,
  RefreshCw,
  Users,
  Zap,
} from "@openbot/ui";
import { toast } from "solid-sonner";
import { For, Show } from "solid-js";
import { useProjects } from "./projects-context";

export function ProjectHeader() {
  const projects = useProjects();
  const proj = () => projects.activeProject();
  const telemetry = () => projects.gitTelemetry();

  const copyPath = () => {
    const path = proj()?.workspacePath;
    if (path) {
      void navigator.clipboard.writeText(path);
      toast.success("Workspace path copied to clipboard");
    }
  };

  const activeMembersCount = () => {
    return projects.threadMembers().filter((m) => m.status === "active").length;
  };

  return (
    <header class="window-drag project-conversation-header">
      {/* Left: Project identity & Workstream Thread tabs */}
      <div class="conversation-heading-group">
        <div class="conversation-title no-drag flex items-center gap-1.5 cursor-default">
          <div class="size-6 rounded-md bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
            <Folder class="size-3.5" />
          </div>
          <span class="font-semibold text-xs text-foreground truncate max-w-[150px]" title={proj()?.name}>
            {proj()?.name ?? "Project Workspace"}
          </span>
          <Show when={proj()?.workspacePath}>
            <IconButton
              label="Copy Workspace Path"
              variant="ghost"
              class="size-5 p-0 text-muted-foreground hover:text-foreground opacity-60 hover:opacity-100"
              onClick={copyPath}
            >
              <Copy class="size-3" />
            </IconButton>
          </Show>
        </div>

        {/* Workstream Thread Tabs inline in header */}
        <div class="flex items-center gap-1 no-drag ml-1 pl-2 border-l border-border/40">
          <For each={projects.threads()}>
            {(th) => {
              const isActive = () => projects.activeThreadId() === th.id;
              return (
                <button
                  type="button"
                  class={`flex items-center gap-1 h-6 px-2.5 rounded-md text-xs font-medium transition-colors cursor-pointer select-none ${
                    isActive()
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => void projects.selectThread(th.id)}
                >
                  <span class="opacity-70">#</span>
                  <span>{th.name}</span>
                </button>
              );
            }}
          </For>
          <IconButton
            label="New Workstream Thread"
            variant="ghost"
            class="size-6 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => projects.setCreateThreadDialogOpen(true)}
          >
            <Plus class="size-3.5" />
          </IconButton>
        </div>
      </div>

      {/* Right: Telemetry, Policy switch, Knowledge, Team drawer */}
      <div class="conversation-header-actions no-drag">
        {/* Live Git Telemetry */}
        <Show when={telemetry()}>
          {(tele) => (
            <div
              class="hidden sm:flex items-center gap-1.5 h-6 px-2 rounded-md bg-muted/40 border border-border/40 text-[11px] text-muted-foreground"
              title={`Git Branch: ${tele().branch}`}
            >
              <GitBranch class="size-3 text-primary shrink-0" />
              <span class="font-mono text-foreground font-medium">{tele().branch}</span>
              <span class="opacity-40">•</span>
              <span class={tele().isClean ? "text-emerald-500 font-medium" : "text-amber-500 font-medium"}>
                {tele().isClean ? "Clean" : `${tele().uncommittedCount} modified`}
              </span>
              <IconButton
                label="Refresh Git Status"
                variant="ghost"
                class="size-4 p-0 ml-0.5 text-muted-foreground hover:text-foreground"
                onClick={() => void projects.refreshTelemetry()}
              >
                <RefreshCw class="size-2.5" />
              </IconButton>
            </div>
          )}
        </Show>

        {/* Policy Switcher */}
        <div class="flex items-center h-6 bg-muted/40 rounded-md p-0.5 border border-border/40 text-[10px]">
          <button
            type="button"
            class={`h-5 px-1.5 rounded transition-colors cursor-pointer ${
              projects.gitPolicy() === "automatic"
                ? "bg-background font-medium text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => void projects.updateGitPolicy("automatic")}
            title="Automatic Mode: Auto-commits on agent task completion"
          >
            <span>⚡ Auto</span>
          </button>
          <button
            type="button"
            class={`h-5 px-1.5 rounded transition-colors cursor-pointer ${
              projects.gitPolicy() === "review"
                ? "bg-background font-medium text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => void projects.updateGitPolicy("review")}
            title="Review Mode: Prompt for review before commit"
          >
            <span>Review</span>
          </button>
        </div>

        {/* Knowledge Button */}
        <Button
          variant="ghost"
          size="sm"
          class="h-6 px-2 text-xs font-normal"
          onClick={() => projects.setKnowledgeModalOpen(true)}
          title="Project Knowledge Bank"
        >
          <BookOpen class="size-3.5 mr-1 text-primary" />
          <span class="hidden md:inline">Knowledge</span>
        </Button>

        {/* Team Button */}
        <Button
          variant={projects.teamDrawerOpen() ? "primary" : "ghost"}
          size="sm"
          class="h-6 px-2 text-xs font-normal"
          onClick={() => projects.setTeamDrawerOpen(!projects.teamDrawerOpen())}
          title="Workstream Team Members"
        >
          <Users class="size-3.5 mr-1" />
          <span>Team ({activeMembersCount()})</span>
        </Button>
      </div>
    </header>
  );
}
