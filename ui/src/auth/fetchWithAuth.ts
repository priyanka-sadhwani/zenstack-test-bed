import { FetchFn } from '@zenstackhq/tanstack-query/runtime-v5'
import { useAuth } from './AuthContext'

// Simple fetch function that adds authentication headers
export const fetchWithAuth: FetchFn = async (url, options) => {
  // Get the current user from context (this will be set by our simple auth)
  const user = JSON.parse(localStorage.getItem('auth-user') || 'null')
  
  // Create headers object
  const headers = new Headers(options?.headers || {})
  
  // Add authentication headers if user exists
  if (user?.id) {
    headers.set('x-user-id', user.id)
    headers.set('x-user-email', user.email)
    headers.set('authorization', `Bearer ${user.id}`) // Simple token using user ID
  }
  
  // Make the request with headers
  return fetch(url, { ...options, headers })
}
