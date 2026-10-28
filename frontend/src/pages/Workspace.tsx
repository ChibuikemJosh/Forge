import { Link } from "react-router-dom"
import { GraphWorkspace } from "../features/graph/GraphWorkspace"

export default function Workspace() {
  return (
    <div className="min-h-screen bg-coal font-sans text-zinc-100">
      <header className="border-b border-line bg-coal/95">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-5">
          <Link to="/" className="flex items-baseline gap-2.5" aria-label="Return to Forge home">
            <span className="grid size-7 place-items-center rounded-sm bg-ember font-mono text-[13px] font-bold text-white">F</span>
            <span className="text-[19px] font-black tracking-tight">Forge</span>
          </Link>
          <span className="ml-auto font-mono text-[11px] tracking-wide text-zinc-500">WORKSPACE</span>
        </div>
      </header>
      <GraphWorkspace />
    </div>
  )
}
