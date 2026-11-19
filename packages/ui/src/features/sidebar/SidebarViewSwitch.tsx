/** The switch over the list: Projects, Channels, or Agents. */

import { Bot, Folder, Hash, SlidingTabs } from "@openbot/ui";
import { useText } from "../../text";
import { useSidebarScope } from "./sidebar-scope";
import type { SidebarView } from "./sidebar-types";

const VIEWS = ["projects", "channels", "agents"] as const satisfies readonly SidebarView[];

function isSidebarView(value: string): value is SidebarView {
  return VIEWS.some((view) => view === value);
}

export function SidebarViewSwitch() {
  const { props } = useSidebarScope();
  const { t } = useText();
  return (
    <div class="sidebar-view-switch">
      <SlidingTabs.Root
        value={props.view ?? "projects"}
        onChange={(value: string) => {
          if (isSidebarView(value)) props.onViewChange?.(value);
        }}
      >
        <SlidingTabs.List class="sidebar-view-tabs" aria-label="Sidebar view">
          <SlidingTabs.Trigger value="projects" class="sidebar-view-tab">
            <Folder aria-hidden="true" />
            Projects
          </SlidingTabs.Trigger>
          <SlidingTabs.Trigger value="channels" class="sidebar-view-tab">
            <Hash aria-hidden="true" />
            Channels
          </SlidingTabs.Trigger>
          <SlidingTabs.Trigger value="agents" class="sidebar-view-tab">
            <Bot aria-hidden="true" />
            Agents
          </SlidingTabs.Trigger>
        </SlidingTabs.List>
      </SlidingTabs.Root>
    </div>
  );
}
