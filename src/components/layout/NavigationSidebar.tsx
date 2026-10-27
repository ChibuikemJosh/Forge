const plannedModules = [
  'Project',
  'Graph',
  'Code Editor',
  'Validation',
  'AI Proposals',
]

export function NavigationSidebar() {
  return (
    <aside className="sidebar" aria-label="Main navigation">
      <h2>Modules</h2>
      <ul>
        {plannedModules.map((moduleName) => (
          <li key={moduleName}>{moduleName}</li>
        ))}
      </ul>
    </aside>
  )
}
