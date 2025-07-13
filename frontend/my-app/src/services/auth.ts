// 인증 관련 API 서비스
import { API_CONFIG, API_ENDPOINTS } from '@/constants/api'
import axios from '@/lib/axios'

export const authService = {
  // 구글 로그인 시작
  initiateGoogleLogin: () => {
    window.location.href = `${API_CONFIG.BACKEND_URL}${API_ENDPOINTS.AUTH.GOOGLE_LOGIN}`
  },
  // 내 정보 조회
  getMe: async () => {
    const res = await axios.get(API_ENDPOINTS.AUTH.ME)
    return res.data
  },
  // 로그아웃
  logout: async () => {
    await axios.get(API_ENDPOINTS.AUTH.LOGOUT)
  }
} 