# Technical Specification: Project-Centric Workspace & Multi-Thread Architecture

> **Document**: `docs/superpowers/specs/2026-11-18-project-centric-workspace-design.md`  
> **Target System**: OpenBot Desktop (`E:\Data\Users\JoJo\Desktop\NDD\OpenBot`)  
> **Status**: Final Specification (Refined & Approved) — Ready for Phased Implementation  
> **Date**: November 18, 2026  

---

## 1. Executive Summary & Core Philosophy

Standard OpenBot arranges all agents and marketplace plugins in a single flat list, with workspaces tied to individual agents. 

This specification redesigns OpenBot into a **Project-Centric Workspace**:
1. **Projects Anchor the Work:** A Project represents a real local directory (e.g. `Axo`, `VellumX`) with live Git telemetry.
2. **Concurrent Workstream Threads:** Multiple isolated threads per project (e.g. `#frontend-ui`, `#backend-api`) running in dedicated **Git Worktrees** to prevent index collisions and file clobbering.
3. **Flexible Lead & Team Assignment:** Re-use an existing Lead agent or create a tailored Lead on the fly for non-technical or specialized domains.
4. **Dynamic Model Intelligence:** Context limit warnings and role-based model recommendations evaluated dynamically against the user's active/connected providers.
5. **3-Tier Scoped Knowledge Bank:** Local documentation and reference files stored on disk and queried on demand, scoped by Project, Thread, or specific Agent.
6. **Graceful Member Lifecycle:** Removed agents remain in transcripts; re-adding them includes an automated **Catch-Up Briefing** with full memory retention.

---

## 2. Complete UI Topology

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ TOP NAVIGATION                                                                             [ ─ ]  [ □ ]  [ ✕ ]         │
├────────────────────────────────┬───────────────────────────────────────────────────────────────────────────────────────┤
│ 🔍 Search chats, files...  [+] │ 📦 Axo  📁 E:\Data\Users\JoJo\Desktop\Axo                                             │
├────────────────────────────────┤ 🌿 main • ● 3 uncommitted files • "feat(auth)" (14m ago)  [Git: ⚡ Auto ▾]  [👥 Team]   │
│ [📁 Projects] [💬 Channels] [🤖]├───────────────────────────────────────────────────────────────────────────────────────┤
│ ▼ 📁 ACTIVE PROJECTS           │ [ # general ]  [ # frontend-ui ]  [ # backend-api ]  [ + New Thread ]                 │
│ ├── 📦 Axo                     ├───────────────────────────────────────────────────────────────┬───────────────────────┤
│ │   ├── # general              │ CONVERSATION STREAM                                           │ 👥 THREAD TEAM (PANEL)│
│ │   ├── # frontend-ui (2)      │                                                               │                       │
│ │   └── # backend-api (2)      │ 🤖 @Frontend Lead (Claude 3.7 Sonnet)                         │ THREAD LEAD 👑        │
│ ├── 📦 VellumX                 │ Created responsive navbar in `src/components/Navbar.astro`.   │ 🤖 @Frontend Lead     │
│ └── ➕ New Project             │                                                               │    Provider: Claude3.7│
│                                │ 🎨 @Stylist (GLM-5 / OpenCode)                                │                       │
│                                │ Applied Tailwind v4 color tokens and fluid spacing.           │ TEAMMATES             │
│                                │                                                               │ 🎨 @Stylist (GLM-5)   │
│                                │                                                               │    [Remove]           │
│                                │                                                               ├───────────────────────┤
│                                │                                                               │ INACTIVE CONTRIBUTORS │
│                                │                                                               │ 🔘 @DB Auditor (Codex)│
│                                │                                                               │    [Re-add to Thread] │
│                                │                                                               ├───────────────────────┤
│                                │                                                               │ 📚 KNOWLEDGE BANK     │
│                                │                                                               │ 📁 shared/ (Project)  │
│                                │                                                               │ 📄 tailwind.md (Thread│
│                                │                                                               │ 📄 astro.md (@Stylist)│
│                                ├───────────────────────────────────────────────────────────────┤ [➕ Add Reference]    │
│                                │ [ 💬 Message #frontend-ui...                                ] │                       │
└────────────────────────────────┴───────────────────────────────────────────────────────────────┴───────────────────────┘
```

---

## 3. Subsystem Specifications

### 3.1 Three-Segmented Sidebar Navigation (`SidebarNav.tsx`)
* Segmented tabs placed directly below the search bar:
  * `[📁 Projects]`: Lists all local repository projects and their nested threads.
  * `[💬 Channels]`: Cross-project team discussion channels.
  * `[🤖 Agents]`: Direct 1-on-1 isolated agent chats.

### 3.2 Project Workspace & Live Git Telemetry Header (`ProjectHeader.tsx`)
* **Project Name & Local Folder Path**: Displays the user-defined name and filesystem location (click to open in Windows File Explorer or VS Code).
* **Live Git Telemetry Engine**:
  * Active Git Branch (`git rev-parse --abbrev-ref HEAD`).
  * Dirty/Clean State (`git status --porcelain` count).
  * Last Git Activity (action type, commit hash, commit message, and relative time).
* **Per-Thread Git Action Policy**:
  * `[⚡ Automatic]`: Agent commits to the thread branch automatically upon task completion and test verification.
  * `[🔍 After Review]`: Agent stages files and presents an interactive diff card with **`[Approve & Commit]`** button.

### 3.3 Concurrent Workstream Threads & Git Worktrees
* **Worktree Isolation**: To prevent Git index lock collisions (`.git/index.lock`) and simultaneous file editing conflicts, each thread operates in an isolated worktree:
  * Path: `.openbot/worktrees/<project-slug>/<thread-slug>/`
* **Isolated Conversation Context**: Transcripts and queue turns remain strictly segregated per thread.

### 3.4 Dynamic Lead Assignment & Creation
When creating a Project or a new Thread:
* **Option A:** Select an existing Lead from the agent roster (e.g. `@TechLead`, `@ProductManager`, `@MarketingLead`).
* **Option B:** Click **`[➕ Create New Lead Agent]`** on the fly to configure a domain-specific persona tailored to non-technical or specialized projects.

### 3.5 Team Management Drawer & Lifecycle
Toggled via the **`[👥 Team]`** button in the thread header:
* **Active Members**:
  * Shows avatar, name, and role.
  * One member holds the **Lead Crown 👑** (receives unmentioned tasks by default).
  * Direct removal button.
* **Inactive / Historical Members (Graceful Preservation)**:
  * Removed agents retain their past conversation messages and tool cards in the thread history.
  * Appear grayed out under **Inactive Contributors** with a **`[Re-add to Thread]`** button.
  * **Catch-Up Briefing**: Upon re-adding with `Keep Memory Intact`, OpenBot compiles an automated summary of turns, commits, and file changes that took place during their absence.
  * **Fresh Start Option**: Allows re-adding the agent with clean thread memory if desired.

### 3.6 Connected-Provider Dynamic Model Intelligence
When selecting or overriding an agent's model for a thread:
* **Live Discovery**: Inspects the user's active and connected provider sign-ins (Claude, OpenAI/Codex, Google Gemini/Antigravity, Cursor, OpenCode, Ollama, etc.).
* **Context Limit Badges**: Shows model window size (`[200k]`, `[128k]`, `[32k]`).
* **Dynamic Role Recommendations**:
  * Lead / Planning: Recommends highest-reasoning models currently signed in.
  * Code & Styling: Recommends fast, high-token-efficiency models currently signed in.
* **Capacity Overflow Warning**:
  * If thread history token count approaches or exceeds the selected model's context window, an alert warning is shown with automatic compaction notice.

### 3.7 Three-Tier Scoped Knowledge Bank
Reference documentation and specifications are saved locally on disk under `.openbot/projects/<project>/knowledge/` and queried on demand via `search_knowledge` / `read_knowledge` tools:
* **`shared/` (Project Scope)**: Accessible to all agents across all threads in the project (e.g. architecture specs, DB schemas, brand guidelines).
* **`threads/<thread-slug>/` (Thread Scope)**: Accessible only to members in that thread (e.g. Tailwind v4 guidelines in `#frontend-ui`).
* **`agents/<agent-id>/` (Agent Scope)**: Private to a single agent (e.g. Astro UI framework docs specifically for `@Stylist`).

---

## 4. SQLite Schema Extension (`openbot.db`)

```sql
-- Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    workspace_path TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Project Threads Table
CREATE TABLE IF NOT EXISTS project_threads (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    worktree_path TEXT NOT NULL,
    git_policy TEXT NOT NULL DEFAULT 'automatic' CHECK(git_policy IN ('automatic', 'review')),
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE(project_id, slug)
);

-- Project Thread Members Table
CREATE TABLE IF NOT EXISTS project_thread_members (
    id TEXT PRIMARY KEY,
    thread_id TEXT NOT NULL REFERENCES project_threads(id) ON DELETE CASCADE,
    agent_id TEXT NOT NULL,
    is_lead INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL CHECK(status IN ('active', 'inactive')),
    provider_override TEXT,
    model_override TEXT,
    reasoning_override TEXT,
    joined_at INTEGER NOT NULL,
    left_at INTEGER,
    memory_mode TEXT NOT NULL DEFAULT 'intact' CHECK(memory_mode IN ('intact', 'fresh')),
    UNIQUE(thread_id, agent_id)
);

-- Knowledge Bank Sources Table
CREATE TABLE IF NOT EXISTS project_knowledge_sources (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    thread_id TEXT REFERENCES project_threads(id) ON DELETE CASCADE,
    agent_id TEXT, -- NULL applies to all agents in scope
    scope TEXT NOT NULL CHECK(scope IN ('project', 'thread', 'agent')),
    title TEXT NOT NULL,
    file_path TEXT NOT NULL,
    source_url TEXT,
    created_at INTEGER NOT NULL
);
```

---

## 5. Phased Implementation Plan

* **Phase 1: Database Migration & Core IPC Handlers**
  * Register SQLite migration in `apps/auth-api` / local D1 migrations.
  * Implement Project & Thread IPC services in `src/main/` (`project-service.ts`, `git-service.ts`, `knowledge-service.ts`).
* **Phase 2: Segmented Sidebar (`Projects` | `Channels` | `Agents`)**
  * Update `SidebarViewSwitch.tsx` and `SidebarNav.tsx` to add Projects tab, project tree list, and "+ New Project" modal.
* **Phase 3: Project Header, Git Telemetry & Worktree Management**
  * Implement `ProjectHeader.tsx` with live Git branch, uncommitted diffs, last commit action, and Git Policy toggle.
  * Automate thread Git worktree creation and teardown.
* **Phase 4: Team Drawer, Lead Creator & Model Intelligence**
  * Build `ProjectTeamDrawer.tsx` with Lead 👑 indicator, Active / Inactive member lists, and re-add Catch-Up Briefing.
  * Integrate dynamic provider-model recommendation and context warning system.
  * Add the 3-tier Knowledge Bank manager with local file drop and URL saving.
