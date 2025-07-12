"use client"

import { Button } from "@/components/ui/button"
import { Chrome } from "lucide-react" // Google 아이콘을 위해 Chrome 아이콘 사용

export default function LoginForm() {
  const handleGoogleLogin = () => {
    // 백엔드의 구글 로그인 엔드포인트로 리다이렉트
    console.log("구글 로그인 버튼 클릭됨")
    window.location.href = 'http://localhost:8000/auth/google/login'
  }

  return (
    <div className="py-4 text-center">
      <Button
        onClick={handleGoogleLogin}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
      >
        <Chrome className="w-5 h-5" />
        <span>Google로 로그인</span>
      </Button>
      {/* 다른 소셜 로그인 버튼을 추가할 수 있습니다. */}
    </div>
  )
}
