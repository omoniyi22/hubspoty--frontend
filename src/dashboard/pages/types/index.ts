// frontend/src/types/index.ts
export interface FieldMapping {
  wixField: string
  hubSpotProperty: string
  direction?: 'wix_to_hubspot' | 'hubspot_to_wix' | 'bidirectional'
  transform?: string | null
  isEssential?: boolean
  isActive?: boolean
  displayName?: string // Add this field
}

export interface FieldMappingConfig {
  mappings: FieldMapping[]
}

export interface ConnectionStatus {
  connected: boolean
  portalId?: string
  mapping?: FieldMappingConfig
}

export interface AvailableField {
  value: string
  label: string
}

export interface SyncLog {
  id: string
  syncType: string
  direction: string
  status: string
  createdAt: string
  errorMessage?: string
}

export interface FormSubmission {
  id: string
  formData: any
  utmParams: any
  submittedAt: string
  syncedToHubSpot: boolean
}