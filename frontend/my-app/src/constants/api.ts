// API 관련 상수

export const API_CONFIG = {
  BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000',
}

export const API_ENDPOINTS = {
  AUTH: {
    GOOGLE_LOGIN: '/auth/google/login',
    ME: '/auth/me', // 내 정보
    LOGOUT: '/auth/logout', // 로그아웃
  },
} 