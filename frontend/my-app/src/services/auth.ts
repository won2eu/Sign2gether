// 인증 관련 API 서비스
import { API_CONFIG, API_ENDPOINTS } from '@/constants/api'

export const authService = {
  // 구글 로그인 시작
  initiateGoogleLogin: () => {
    window.location.href = `${API_CONFIG.BACKEND_URL}${API_ENDPOINTS.AUTH.GOOGLE_LOGIN}`
  }
} 