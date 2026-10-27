/**
 * Planned Forge modules. These are labels for orientation only in Task A;
 * the corresponding features (graph editor, code editor, validation, AI
 * proposals) are not implemented yet.
 */
const plannedModules = [
  'Project',
  'Graph',
  'Code Editor',
  'Validation',
  'AI Proposals',
]

export function NavigationSidebar() {
  return (
    <aside className="sidebar" aria-label="Forge navigation">
      <h2 className="sidebar__heading">Modules</h2>
      <ul className="sidebar__list">
        {plannedModules.map((moduleName) => (
          <li key={moduleName} className="sidebar__item">
            {moduleName}
          </li>
        ))}
      </ul>
    </aside>
  )
}
