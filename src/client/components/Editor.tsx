// CodeMirror 6 editor, mounted manually (no React wrapper). We own the
// EditorView instance and replace its document when the caller selects a
// different note. The component is controlled-ish: the parent owns the
// buffer in `useNoteBuffer` and feeds it back via the `note.body` prop; we
// only mirror it when the note id changes, not on every draft change (that
// would create a feedback loop with the onChange callback).

import { useEffect, useRef } from "preact/hooks";

import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";

export type EditorProps = {
  value: string;
  onChange: (body: string) => void;
};


// Obsidian-ish in-place rendering: headings get larger font and weight, bold
// and italic render as such, inline code becomes monospaced, and the leading
// markers (# ** * `) are dimmed so the source stays visible but reads like
// formatted prose. CM keeps the raw text — no separate preview pane.
const markdownHighlightStyle = HighlightStyle.define([
  { tag: t.heading1, fontSize: "1.8em", fontWeight: "700", lineHeight: "1.25" },
  { tag: t.heading2, fontSize: "1.5em", fontWeight: "700", lineHeight: "1.3" },
  { tag: t.heading3, fontSize: "1.3em", fontWeight: "600", lineHeight: "1.35" },
  { tag: t.heading4, fontSize: "1.15em", fontWeight: "600" },
  { tag: t.heading5, fontSize: "1.05em", fontWeight: "600" },
  { tag: t.heading6, fontSize: "1em", fontWeight: "600" },
  { tag: t.strong, fontWeight: "700" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.strikethrough, textDecoration: "line-through" },
  { tag: t.link, color: "#60a5fa", textDecoration: "underline" },
  { tag: t.url, color: "#60a5fa" },
  {
    tag: t.monospace,
    fontFamily:
      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    color: "#f0abfc",
    background: "rgba(148, 163, 184, 0.12)",
  },
  { tag: t.quote, color: "#9ca3af", fontStyle: "italic" },
  // Leading markers: #, **, *, `, >, etc.
  { tag: t.processingInstruction, color: "rgba(148, 163, 184, 0.55)" },
  { tag: t.meta, color: "rgba(148, 163, 184, 0.55)" },
]);

const editorTheme = EditorView.theme({
  "&": {
    height: "100%",
    fontSize: "1rem",
  },
  ".cm-scroller": {
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    lineHeight: "1.6",
    padding: "1rem 1.25rem",
  },
  ".cm-content": {
    margin: "0 auto",
    caretColor: "black",
  },
  ".cm-line": {
    padding: "0 0",
  },
});

function makeExtensions(
  onChange: (body: string) => void,
) {
  return [
    history(),
    keymap.of([...defaultKeymap, ...historyKeymap]),
    markdown(),
    syntaxHighlighting(markdownHighlightStyle),
    EditorView.lineWrapping,
    editorTheme,
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChange(update.state.doc.toString());
      }
    }),
  ];
}

export function Editor(props: EditorProps) {
  const { value, onChange} = props;
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Mount / tear down the view.
  useEffect(() => {
    if (!hostRef.current) return;
    const view = new EditorView({
      parent: hostRef.current,
      state: EditorState.create({
        doc: value,
        extensions: makeExtensions(
          (body) => onChangeRef.current(body),
        ),
      }),
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // We intentionally mount only once; the extensions above are stable
    // (they read from refs). Note switching is handled in the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-full w-full min-h-0 flex-col">
      <div
        ref={hostRef}
        className="min-h-0 flex-1 overflow-auto"
        data-testid="cm-host"
      />
    </div>
  );
}
