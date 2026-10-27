/**
 * Foundation project model.
 *
 * Task A deliberately keeps this minimal: these types exist only where the
 * current UI has a concrete use for them. The full future model (components,
 * ports, typed connections, source mapping, validation state) is documented in
 * docs/project-model.md and will be introduced incrementally with its features.
 */

export type ProjectLanguage = 'python'

export interface ForgeProject {
  id: string
  name: string
  language: ProjectLanguage
  version: string
}
