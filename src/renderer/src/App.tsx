import { NotificationObserver, Toaster } from "@openbot/ui";
import { ErrorBoundary } from "solid-js";
import { AppAccessGate } from "./AppView";
import { type AppProps, AppProviders } from "./app-providers";
import { reportNotification } from "./error-reports";
import { nativeBrowserPageShown } from "./native-browser-page";

export function App(props: AppProps = {}) {
  return (
    <NotificationObserver onShown={reportNotification}>
      <ErrorBoundary
        fallback={(err, reset) => (
          <div
            style={{
              padding: "40px",
              color: "#f87171",
              "font-family": "system-ui, -apple-system, sans-serif",
              height: "100vh",
              "box-sizing": "border-box",
              "background-color": "#18181b",
              display: "flex",
              "flex-direction": "column",
              "justify-content": "center",
              "align-items": "center",
              "text-align": "center",
            }}
          >
            <h2 style={{ "font-size": "22px", "font-weight": "600", "margin-bottom": "12px", color: "#f43f5e" }}>
              Application Render Error
            </h2>
            <p style={{ "font-size": "14px", color: "#a1a1aa", "max-width": "600px", "margin-bottom": "20px" }}>
              OpenBot encountered an unhandled exception while mounting interface providers:
            </p>
            <pre
              style={{
                background: "#27272a",
                color: "#e4e4e7",
                padding: "16px",
                "border-radius": "8px",
                "max-width": "800px",
                "max-height": "250px",
                "overflow-y": "auto",
                "text-align": "left",
                "font-size": "12px",
                border: "1px solid #3f3f46",
              }}
            >
              {err instanceof Error ? err.stack || err.message : String(err)}
            </pre>
            <div style={{ "margin-top": "24px", display: "flex", gap: "12px" }}>
              <button
                type="button"
                style={{
                  padding: "10px 20px",
                  background: "#4f46e5",
                  color: "#ffffff",
                  border: "none",
                  "border-radius": "6px",
                  cursor: "pointer",
                  "font-weight": "500",
                }}
                onClick={reset}
              >
                Retry Interface Mount
              </button>
              <button
                type="button"
                style={{
                  padding: "10px 20px",
                  background: "#27272a",
                  color: "#e4e4e7",
                  border: "1px solid #3f3f46",
                  "border-radius": "6px",
                  cursor: "pointer",
                  "font-weight": "500",
                }}
                onClick={() => window.location.reload()}
              >
                Reload Window
              </button>
            </div>
          </div>
        )}
      >
        <AppProviders
          landingPreview={props.landingPreview}
          peopleEnabled={props.peopleEnabled}
          chatWindow={props.chatWindow}
        >
          <AppAccessGate />
        </AppProviders>
      </ErrorBoundary>
      <Toaster hidden={nativeBrowserPageShown()} onToastShown={reportNotification} />
    </NotificationObserver>
  );
}
