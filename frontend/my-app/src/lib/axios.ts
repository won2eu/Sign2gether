import axios from 'axios'

const instance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000',
  withCredentials: true, // 쿠키 포함
})

export default instance