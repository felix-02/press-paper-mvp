import { useEffect, useRef } from "react";
import { Bold, Italic, Heading2, Heading3, List, ListOrdered, Quote, Link2, Undo2, Redo2 } from "lucide-react";

/**
 * A lightweight WYSIWYG editor (contenteditable + formatting toolbar) that emits
 * HTML. Intentionally dependency-free to keep the single-file bundle small.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write the full release…",
  minHeight = 280,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Seed the initial HTML once (uncontrolled thereafter to preserve the caret).
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emit = () => onChange(ref.current?.innerHTML ?? "");

  const exec = (command: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    emit();
  };

  const addLink = () => {
    const url = window.prompt("Link URL");
    if (url) exec("createLink", url.startsWith("http") ? url : `https://${url}`);
  };

  const Btn = ({ icon, title, onClick }: { icon: React.ReactNode; title: string; onClick: () => void }) => (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      style={{ width: 32, height: 32, borderRadius: 7, display: "grid", placeItems: "center", color: "var(--text-secondary)", background: "transparent" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {icon}
    </button>
  );

  const Divider = () => <span style={{ width: 1, height: 20, background: "var(--border)", margin: "0 4px" }} />;

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: "var(--r-md)", overflow: "hidden", background: "var(--surface-1)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 2, padding: "6px 8px", borderBottom: "1px solid var(--border)", flexWrap: "wrap", background: "var(--surface-2)" }}>
        <Btn icon={<Bold size={16} />} title="Bold" onClick={() => exec("bold")} />
        <Btn icon={<Italic size={16} />} title="Italic" onClick={() => exec("italic")} />
        <Divider />
        <Btn icon={<Heading2 size={16} />} title="Heading" onClick={() => exec("formatBlock", "h2")} />
        <Btn icon={<Heading3 size={16} />} title="Subheading" onClick={() => exec("formatBlock", "h3")} />
        <Btn icon={<Quote size={16} />} title="Quote" onClick={() => exec("formatBlock", "blockquote")} />
        <Divider />
        <Btn icon={<List size={16} />} title="Bullet list" onClick={() => exec("insertUnorderedList")} />
        <Btn icon={<ListOrdered size={16} />} title="Numbered list" onClick={() => exec("insertOrderedList")} />
        <Btn icon={<Link2 size={16} />} title="Link" onClick={addLink} />
        <Divider />
        <Btn icon={<Undo2 size={16} />} title="Undo" onClick={() => exec("undo")} />
        <Btn icon={<Redo2 size={16} />} title="Redo" onClick={() => exec("redo")} />
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onBlur={emit}
        data-placeholder={placeholder}
        className="pp-rte"
        style={{ minHeight, padding: "14px 16px", fontSize: 15, lineHeight: 1.7, color: "var(--text)", outline: "none" }}
      />
    </div>
  );
}
