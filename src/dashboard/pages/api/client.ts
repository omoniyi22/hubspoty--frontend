// frontend/src/api/client.ts
import axios from 'axios'
import { API_BASE_URL, getInstanceId } from './../lib/utils'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const instanceId = getInstanceId()
  if (instanceId) {
    config.params = { ...config.params, instance_id: instanceId }
  }
  return config
})

export const authApi = {
  connect: (): Window | null => {
    const instanceId = getInstanceId()
    const oauthUrl = `${API_BASE_URL}/auth/hubspot?instance_id=${instanceId}`

    const width = 600
    const height = 700
    const left = Math.round(window.screen.width / 2 - width / 2)
    const top = Math.round(window.screen.height / 2 - height / 2)

    const popup = window.open(
      oauthUrl,
      'hubspot-oauth',
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
    )

    if (!popup) {
      alert('Popup was blocked. Please allow popups for this site and try again.')
      return null
    }

    return popup
  },
  disconnect: async (instanceId: string) => {
    const response = await apiClient.get(`/auth/hubspot/disconnect/${instanceId}`)
    return response.data
  },
  getStatus: async (instanceId: string) => {
    const response = await apiClient.get(`/auth/status/${instanceId}`)
    return response.data
  },
}

export const mappingApi = {
  getMapping: async (instanceId: string) => {
    const response = await apiClient.get(`/api/mapping/${instanceId}`)
    // Response format: { mappings: [...] }
    return response.data
  },
  updateMapping: async (instanceId: string, updates: Array<{ wixField: string; direction?: string; transform?: string | null; isActive?: boolean }>) => {
    // New API expects { updates: [...] }
    console.log({ instanceId, updates })
    const response = await apiClient.put(`/api/mapping/${instanceId}`, { updates })
    return response.data
  },
  getAvailableFields: async (instanceId: string) => {
    // Use the new endpoint that returns fields for this specific instance
    const response = await apiClient.get(`/api/mapping/fields/${instanceId}`)
    return response.data
  },
}

export const syncApi = {
  getSyncLogs: async (instanceId: string, limit = 50, page = 1) => {
    const response = await apiClient.get(`/api/sync/logs/${instanceId}?limit=${limit}&page=${page}`)
    if (response.data?.success && response.data?.data?.logs) {
      return {
        logs: response.data.data.logs,
        pagination: response.data.data.pagination,
        stats: response.data.data.stats
      }
    }
    if (Array.isArray(response.data)) {
      return { logs: response.data, pagination: null, stats: null }
    }
    if (Array.isArray(response.data?.logs)) {
      return { logs: response.data.logs, pagination: null, stats: null }
    }
    return { logs: [], pagination: null, stats: null }
  },

  retrySync: async (logId: string) => {
    const response = await apiClient.post(`/api/sync/retry/${logId}`)
    return response.data
  },
  bulkSync: async (instanceId: string, direction: string = 'wix_to_hubspot') => {
    const response = await apiClient.post(`/api/sync/bulk/${instanceId}`, { direction })
    return response.data
  },
  getSyncStatus: async (instanceId: string) => {
    const response = await apiClient.get(`/api/sync/status/${instanceId}`)
    return response.data
  },
  getFailedSyncs: async (instanceId: string) => {
    const response = await apiClient.get(`/api/sync/failed/${instanceId}`)
    return response.data
  },
  getFormSubmissions: async (instanceId: string, limit = 50, page = 1) => {
    const response = await apiClient.get(`/api/forms/submissions/${instanceId}?limit=${limit}&page=${page}`)
    console.log("getFormSubmissions - Response:", response.data)
    if (response.data?.success && response.data?.data) {
      console.log("getFormSubmissions - Submissions data:", response.data.data)
      return response.data.data
    }
    console.log("getFormSubmissions - No data found, returning default")
    return { submissions: [], pagination: null, stats: null }
  },

  getFormStats: async (instanceId: string) => {
    const response = await apiClient.get(`/api/forms/stats/${instanceId}`)
    console.log("getFormStats - Response:", response.data)
    return response.data
  },

  updateLeadStatus: async (submissionId: string, leadStatus: string, leadScore?: number) => {
    const response = await apiClient.put(`/api/forms/submissions/${submissionId}/status`, { leadStatus, leadScore })
    console.log("updateLeadStatus - Request payload:", { submissionId, leadStatus, leadScore })
    console.log("updateLeadStatus - Response:", response.data)
    return response.data
  },
}

export default apiClient