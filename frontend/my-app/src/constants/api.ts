// API 관련 상수

export const API_CONFIG = {
  BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'https://sign2gether-api-production.up.railway.app',
}

export const API_ENDPOINTS = {
  AUTH: {
    GOOGLE_LOGIN: '/auth/google/login',
    ME: '/auth/me', // 내 정보
    LOGOUT: '/auth/logout', // 로그아웃
  },
  DOCS: {
    PDF_UPLOAD: '/upload/docs/pdf',
    GET_DOCUMENT: '/documents/{doc_filename}',
    GET_SIGNERS: '/documents/{doc_filename}/signer',
    UPDATE_SIGNER_STATUS: '/documents/{doc_filename}/signer/{signer_id}',
    GET_MY_DOCUMENTS: '/documents/',
  },
} 