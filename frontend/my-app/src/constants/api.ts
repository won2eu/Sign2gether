// API 관련 상수

export const API_CONFIG = {
  BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000',
}

export const API_ENDPOINTS = {
  AUTH: {
    GOOGLE_LOGIN: '/auth/google/login',
  },
} 