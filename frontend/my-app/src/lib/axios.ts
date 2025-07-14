import axios from 'axios'

const instance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL || 'https://sign2gether-api-production.up.railway.app',
  withCredentials: true, // 쿠키 포함
})

export default instance