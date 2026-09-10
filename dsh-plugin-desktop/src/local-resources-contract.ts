/** Local, portable resources shared by the desktop Host and settings page. */
export const LOCAL_RESOURCES_PATH = '/api/desktop/local-resources'
export type ResourceKind = 'skill' | 'preset'
export interface LocalResource {
  key: string
  kind: ResourceKind
  id: string
  name: string
  description: string
  scope: string
}
export interface ResourceFile { path: string; size: number }
export interface ResourcePreview {
  kind: ResourceKind
  id: string
  name: string
  description: string
  files: ResourceFile[]
}
