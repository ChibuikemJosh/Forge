import type { ForgeProject } from '../../../core/project-model/types'

interface EmptyProjectStateProps {
  project: ForgeProject
}

export function EmptyProjectState({ project }: EmptyProjectStateProps) {
  return (
    <section className="empty-state" aria-live="polite">
      <h2>{project.name}</h2>
      <p>
        This workspace is ready for the Forge foundation. Visual graph editing,
        code-editor integration, and AI-scoped change proposals will be added in
        future stages.
      </p>
      <dl>
        <div>
          <dt>Language focus</dt>
          <dd>{project.language}</dd>
        </div>
        <div>
          <dt>Project model version</dt>
          <dd>{project.version}</dd>
        </div>
        <div>
          <dt>Graph nodes</dt>
          <dd>{project.graph.nodes.length}</dd>
        </div>
      </dl>
    </section>
  )
}
