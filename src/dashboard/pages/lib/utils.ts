// frontend/src/lib/utils.ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const API_BASE_URL = "https://hubspoty.onrender.com"

export const getInstanceId = (): string | null => {
  const params = new URLSearchParams(window.location.search)
  
  // Wix passes it as 'instance' — a signed JWT
  const instance = params.get('instance')
  console.log('Extracted instanceId:', instance)

  if (!instance) return null

  try {
    // Decode the JWT payload (middle part between the two dots)
    const payload = instance.split('.')[1]
    const decoded = JSON.parse(atob(payload))
    
    console.log('Wix instance payload:', decoded)
    // decoded.instanceId is the actual instance ID
    return decoded.instanceId || null
  } catch (e) {
    console.error('Failed to decode Wix instance token:', e)
    return null
  }
}

export const setInstanceId = (id: string) => {
  localStorage.setItem('wix_instance_id', id)
}