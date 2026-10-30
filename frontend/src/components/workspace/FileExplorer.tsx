import { useState } from "react";
import { FaFile, FaFolder, FaFolderOpen, FaMarkdown, FaPython } from "react-icons/fa";
import { FiChevronDown, FiChevronRight, FiFileText, FiSettings } from "react-icons/fi";
import { VscCollapseAll, VscNewFile, VscNewFolder, VscRefresh } from "react-icons/vsc";
import { FILE_TREE, FINDINGS, PROJECT, type TreeNode } from "./data";

interface Props {
  selectedFileId: string | null;
  onSelectFile: (fileId: string) => void;
  onSelectFindingFile: (fileId: string) => void;
}

/* Colorful folders, VS Code (Seti-style): known names get a fixed hue,
   anything else falls back to a stable hash of the folder name. */
const FOLDER_COLORS: Record<string, string> = {
  app: "text-sky-400", api: "text-rose-400", schemas: "text-violet-400",
  services: "text-amber-400", db: "text-emerald-400", core: "text-teal-400",
  tests: "text-green-400", backend: "text-amber-500", frontend: "text-sky-500",
  src: "text-green-500", components: "text-yellow-400", landing: "text-rose-400",
  layout: "text-indigo-400", workspace: "text-sky-400", assets: "text-orange-400",
  public: "text-zinc-400", docs: "text-cyan-400",
};
const FOLDER_PALETTE = ["text-sky-400", "text-rose-400", "text-amber-400", "text-emerald-400", "text-violet-400", "text-cyan-400", "text-orange-400", "text-teal-400"];

function folderColor(name: string) {
  const known = FOLDER_COLORS[name.toLowerCase()];
  if (known) return known;
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return FOLDER_PALETTE[h % FOLDER_PALETTE.length];
}

function FileIcon({ node }: { node: TreeNode }) {
  if (node.kind === "py" || node.name.endsWith(".py")) return <FaPython className="size-4 shrink-0 text-[#4b8bbe]" aria-hidden />;
  if (node.kind === "md" || node.name.endsWith(".md")) return <FaMarkdown className="size-4 shrink-0 text-[#519aba]" aria-hidden />;
  if (node.name.endsWith(".toml") || node.name.endsWith(".txt") || node.kind === "config") return node.name.endsWith(".toml")
    ? <FiSettings className="size-4 shrink-0 text-amber-400" aria-hidden />
    : <FiFileText className="size-4 shrink-0 text-zinc-400" aria-hidden />;
  return <FaFile className="size-3.5 shrink-0 text-zinc-500" aria-hidden />;
}

function TreeRow({ node, depth, selectedFileId, collapseTick, expandTick, onSelectFile }: {
  node: TreeNode; depth: number; selectedFileId: string | null;
  collapseTick: number; expandTick: number; onSelectFile: (id: string) => void;
}) {
  const [open, setOpen] = useState(depth < 2);
  const [seenTicks, setSeenTicks] = useState({ collapseTick, expandTick });
  if (seenTicks.collapseTick !== collapseTick || seenTicks.expandTick !== expandTick) {
    setSeenTicks({ collapseTick, expandTick });
    setOpen(seenTicks.expandTick !== expandTick ? depth < 2 : false);
  }
  const isFolder = node.kind === "folder";
  const selected = node.fileId != null && node.fileId === selectedFileId;
  const errors = node.fileId ? FINDINGS.filter((x) => x.fileId === node.fileId && x.severity === "critical").length : 0;
  return (
    <div>
      <button
        type="button"
        aria-expanded={isFolder ? open : undefined}
        onClick={() => { if (isFolder) setOpen(!open); else if (node.fileId) onSelectFile(node.fileId); }}
        className={`relative flex w-full items-center gap-1.5 rounded-sm px-1.5 py-[3px] text-left text-[12.5px] focus-visible:outline-2 focus-visible:outline-ide-blue ${selected ? "bg-ember/25 text-zinc-50" : "text-zinc-400 hover:bg-ide-hover hover:text-zinc-200"}`}
        style={{ paddingLeft: `${6 + depth * 14}px` }}
      >
        <span className="grid w-3.5 shrink-0 place-items-center text-zinc-500" aria-hidden>
          {isFolder ? (open ? <FiChevronDown className="size-3.5" /> : <FiChevronRight className="size-3.5" />) : null}
        </span>
        {isFolder
          ? (open
            ? <FaFolderOpen className={`size-4 shrink-0 ${folderColor(node.name)}`} aria-hidden />
            : <FaFolder className={`size-4 shrink-0 ${folderColor(node.name)}`} aria-hidden />)
          : <FileIcon node={node} />}
        <span className={`truncate ${isFolder ? "font-medium text-zinc-300" : ""}`}>{node.name}</span>
        {errors > 0 ? <span className="ml-auto grid size-4 shrink-0 place-items-center rounded-full bg-sev-critical/20 font-mono text-[9px] font-bold text-sev-critical" title={`${errors} critical finding`}>{errors}</span> : null}
      </button>
      {isFolder && open && node.children?.length ? (
        <div className="relative">
          {/* Indent guide: faint always, brighter while hovering the tree (VS Code). */}
          <span aria-hidden className="pointer-events-none absolute top-0 bottom-0 w-px bg-white/[0.07] transition-colors duration-100 group-hover/tree:bg-white/[0.18]"
            style={{ left: `${13 + depth * 14}px` }} />
          {node.children.map((c) => (
            <TreeRow key={c.path} node={c} depth={depth + 1} selectedFileId={selectedFileId}
              collapseTick={collapseTick} expandTick={expandTick} onSelectFile={onSelectFile} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

const toolBtn = "grid size-6 place-items-center rounded text-zinc-400 hover:bg-ide-hover hover:text-zinc-100 focus-visible:outline-2 focus-visible:outline-ide-blue";

/** Left sidebar — Explorer for the open (mock) Python project. */
export function FileExplorer({ selectedFileId, onSelectFile, onSelectFindingFile }: Props) {
  const [query, setQuery] = useState("");
  const [tree, setTree] = useState<TreeNode[]>(FILE_TREE);
  const [collapseTick, setCollapseTick] = useState(0);
  const [expandTick, setExpandTick] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [creating, setCreating] = useState<"file" | "folder" | null>(null);
  const [newName, setNewName] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const matches = query.trim() ? FINDINGS.filter((x) => x.title.toLowerCase().includes(query.toLowerCase())) : [];

  const refresh = () => {
    setTree(FILE_TREE);
    setExpandTick((t) => t + 1);
    setSpinning(true);
    setNotice("Explorer refreshed");
    window.setTimeout(() => setSpinning(false), 500);
  };

  const commitCreate = () => {
    const name = newName.trim().replace(/^\/+|\/+$/g, "");
    setCreating(null);
    setNewName("");
    if (!name) return;
    if (tree.some((n) => n.path === name)) { setNotice(`"${name}" already exists`); return; }
    const node: TreeNode = creating === "folder"
      ? { name, path: name, kind: "folder", children: [] }
      : { name, path: name, kind: name.endsWith(".md") ? "md" : name.endsWith(".py") ? "py" : "config" };
    setTree((t) => creating === "folder" ? [node, ...t] : [...t, node]);
    setNotice(creating === "folder" ? `Folder "${name}" created (mock)` : `File "${name}" created (mock)`);
  };

  return (
    <aside className="group/explorer flex h-full w-full flex-col overflow-hidden rounded-lg border border-line bg-panel font-ui" aria-label="Explorer">
      <div className="flex items-center justify-between px-3 pt-3">
        <h2 className="text-[11px] font-semibold tracking-[0.12em] text-zinc-400">EXPLORER</h2>
        {/* VS Code explorer actions: visible on hover / keyboard focus. */}
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover/explorer:opacity-100 group-focus-within/explorer:opacity-100">
          <button type="button" title="New File..." aria-label="New File" className={toolBtn}
            onClick={() => { setCreating("file"); setNewName("untitled.py"); }}><VscNewFile className="size-4" /></button>
          <button type="button" title="New Folder..." aria-label="New Folder" className={toolBtn}
            onClick={() => { setCreating("folder"); setNewName("new-folder"); }}><VscNewFolder className="size-4" /></button>
          <button type="button" title="Refresh Explorer" aria-label="Refresh Explorer" className={toolBtn} onClick={refresh}>
            <VscRefresh className={`size-4 ${spinning ? "animate-spin" : ""}`} /></button>
          <button type="button" title="Collapse Folders in Explorer" aria-label="Collapse Folders in Explorer" className={toolBtn}
            onClick={() => setCollapseTick((t) => t + 1)}><VscCollapseAll className="size-4" /></button>
        </div>
      </div>
      <label className="mx-3 mt-2 flex items-center gap-2 rounded-md border border-line bg-ide-bar px-2 py-1.5 text-[12px] text-zinc-500 focus-within:border-ide-blue">
        <span aria-hidden>⌕</span>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter findings…" className="w-full bg-transparent text-zinc-200 outline-none placeholder:text-zinc-600" aria-label="Filter findings" />
      </label>
      {query.trim() ? (
        <div className="mt-2 px-2" aria-live="polite">
          {matches.length ? matches.map((x) => (
            <button key={x.id} type="button" onClick={() => onSelectFindingFile(x.fileId)} className="mb-1 block w-full rounded bg-ide-hover px-2 py-1.5 text-left text-[12px] text-zinc-300 hover:text-white">{x.id} · {x.title}</button>
          )) : <p className="px-1 py-2 text-[12px] text-zinc-500">No findings match.</p>}
        </div>
      ) : null}
      <div className="workspace-scroll group/tree mt-3 flex-1 overflow-y-auto px-1.5 pb-2">
        <p className="flex items-center gap-1 px-1.5 py-1 text-[11px] font-bold tracking-wider text-zinc-300">
          <FiChevronDown className="size-3.5 text-zinc-500" aria-hidden /> {PROJECT.root.toUpperCase()}
          <span className="ml-auto rounded bg-ide-active px-1.5 py-0.5 font-mono text-[9px] font-normal text-zinc-400">{PROJECT.language}</span>
        </p>
        {creating ? (
          <div className="flex items-center gap-1.5 px-1.5 py-[3px]" style={{ paddingLeft: 6 }}>
            <span className="w-3.5 shrink-0" aria-hidden />
            {creating === "folder"
              ? <FaFolder className="size-4 shrink-0 text-zinc-400" aria-hidden />
              : <FileIcon node={{ name: newName || "file", path: newName, kind: "py" }} />}
            <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") commitCreate(); if (e.key === "Escape") { setCreating(null); setNewName(""); } }}
              onBlur={commitCreate} aria-label={creating === "folder" ? "New folder name" : "New file name"}
              className="min-w-0 flex-1 rounded-sm border border-ide-blue bg-ide-bar px-1 py-0.5 text-[12.5px] text-zinc-100 outline-none" />
          </div>
        ) : null}
        {tree.map((n) => (
          <TreeRow key={n.path} node={n} depth={0} selectedFileId={selectedFileId}
            collapseTick={collapseTick} expandTick={expandTick} onSelectFile={onSelectFile} />
        ))}
        {notice ? <p className="px-1.5 pt-2 font-mono text-[10px] text-zinc-600" role="status">{notice}</p> : null}
      </div>
      <div className="border-t border-line px-3 py-2 text-[11px] text-zinc-500">
        <p className="flex justify-between py-0.5"><span>▸ Outline</span><span className="font-mono text-[10px]">symbols</span></p>
        <p className="flex justify-between py-0.5"><span>▸ Timeline</span><span className="font-mono text-[10px]">local history</span></p>
      </div>
    </aside>
  );
}
