// Shared types for all apps
export interface User {
  id: string
  email: string
  name?: string | null
  createdAt: Date
}

export type ApiResponse<T> = {
  success: boolean
  data?: T
  error?: string
}
