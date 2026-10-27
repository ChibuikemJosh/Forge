import type { ForgeProject } from '../../../core/project-model/types'

interface EmptyProjectStateProps {
  project: ForgeProject
}

export function EmptyProjectState({ project }: EmptyProjectStateProps) {
  return (
    <section className="empty-state">
      <h2 className="empty-state__title">{project.name}</h2>
      <p className="empty-state__copy">
        This workspace is ready for the Forge foundation. The visual graph
        editor, code-editor integration, validation, and AI-assisted change
        workflows are planned for future stages.
      </p>
      <dl className="empty-state__meta">
        <div>
          <dt>Language focus</dt>
          <dd>{project.language}</dd>
        </div>
        <div>
          <dt>Project model version</dt>
          <dd>{project.version}</dd>
        </div>
        <div>
          <dt>Project id</dt>
          <dd>{project.id}</dd>
        </div>
      </dl>
    </section>
  )
}
