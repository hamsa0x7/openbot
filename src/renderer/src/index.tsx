import { installPointerFocusGuard } from "@openbot/ui/pointer-focus";
import { render } from "@solidjs/web";
// Copying a selection with a formula in it gives its LaTeX source, not the typeset glyphs twice.
import "katex/contrib/copy-tex";
// Copying a selection gives clean HTML, without the theme colors of the app.
import "./selection-copy";
import { App } from "./App";
import { startActionSounds } from "./action-sounds";
import { syncAppearance } from "./appearance-choice";
// A dev build shows the color and the branch of its worktree.
import "./dev-worktree";
import { WindowBackdropBubbles } from "./features/window/backdrop-bubbles";
import { readChatWindowTarget } from "./features/window/chat-window";
import { syncLogoColor } from "./logo-color";
import { startRendererTiming } from "./renderer-timing";
import "./styles.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Renderer root element was not found.");
}

// A startup mark for `dev:bench`, after the bundle is parsed.
performance.mark("openbot:renderer-start");
installPointerFocusGuard();
syncAppearance({ windowGlass: true });
syncLogoColor();
startActionSounds();
startRendererTiming();

// `App` must stay a static import. Main sends the first runtime snapshot on `did-finish-load`,
// which does not wait for a dynamic import, and `App` would subscribe after it. The helper windows
// load `helper.html` instead.
try {
  render(
    () => (
      <WindowBackdropBubbles>
        <App chatWindow={readChatWindowTarget(window.location.search)} />
      </WindowBackdropBubbles>
    ),
    root,
  );
} catch (error) {
  console.error("[CRITICAL RENDER MOUNT ERROR]", error);
  const detail = error instanceof Error ? `${error.message}\n${error.stack || ""}` : String(error);
  const box = document.createElement("div");
  box.style.cssText =
    "position:fixed;top:32px;left:16px;right:16px;bottom:16px;background:#18181b;color:#f87171;border:2px solid #ef4444;border-radius:8px;padding:20px;font-family:monospace;font-size:12px;z-index:999999999;overflow:auto;white-space:pre-wrap;";
  box.innerText = `CRITICAL RENDER MOUNT ERROR:\n\n${detail}`;
  root.appendChild(box);
}
