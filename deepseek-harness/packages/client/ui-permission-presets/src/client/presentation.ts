/** Machine value of the preset that requires an explicit GUI risk gate. */
export const FULL_ACCESS_PRESET = 'danger-full-access'

/** Stable dictionary keys for the built-in permission presets. */
export type PermissionPresetLabelKey = 'preset.readOnly' | 'preset.workspaceWrite' | 'preset.fullAccess'

export function permissionPresetLabelKey(value: string): PermissionPresetLabelKey | undefined {
  if (value === 'read-only') return 'preset.readOnly'
  if (value === 'workspace-write') return 'preset.workspaceWrite'
  if (value === FULL_ACCESS_PRESET) return 'preset.fullAccess'
  return undefined
}

/**
 * Convert conventional kebab-case preset names into user-facing title case.
 * @param name - host-supplied preset label or key.
 * @returns the title-cased conventional key, or a non-kebab label unchanged.
 */
export function displayPresetName(name: string): string {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) return name
  return name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

/**
 * Render a permission preset under its product label.
 * @param value - preset machine value.
 * @param name - host-supplied preset name.
 * @returns the Full access product label or the conventional display name.
 */
export function displayPermissionPreset(value: string, name: string, translate?: (key: PermissionPresetLabelKey) => string): string {
  const key = permissionPresetLabelKey(value)
  if (key !== undefined && translate !== undefined) return translate(key)
  return value === FULL_ACCESS_PRESET ? 'Full access' : displayPresetName(name)
}
