import type { ReactNode } from "react";
import { TopBar } from "./TopBar";
import { SidebarInstitution } from "./SidebarInstitution";
import { SidebarIndividual } from "./SidebarIndividual";

/**
 * Frame for every logged-in screen: a fixed top bar, a fixed sidebar (chosen by
 * `kind`) and a scrollable content column. `maxWidth` constrains the content so
 * wide screens stay readable; pass a custom value or `false` to fill.
 */
export function AppShell({
  kind,
  children,
  maxWidth = 1320,
  contentPad = 28,
}: {
  kind: "institution" | "individual";
  children: ReactNode;
  maxWidth?: number | false;
  contentPad?: number;
}) {
  return (
    <div
      className="pp-app-min"
      style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)" }}
    >
      <TopBar kind={kind} />
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {kind === "institution" ? <SidebarInstitution /> : <SidebarIndividual />}
        <main style={{ flex: 1, overflowY: "auto" }}>
          <div
            style={{
              maxWidth: maxWidth === false ? "none" : maxWidth,
              margin: "0 auto",
              padding: contentPad,
            }}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
