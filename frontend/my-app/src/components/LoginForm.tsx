"use client"

import { Button } from "@/components/ui/button"
import { Chrome } from "lucide-react" // Google 아이콘을 위해 Chrome 아이콘 사용
import { authService } from "@/services/auth"

export default function LoginForm() {
  const handleGoogleLogin = () => {
    console.log("구글 로그인 버튼 클릭됨")
    authService.initiateGoogleLogin()
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
      {/* 다른 소셜 로그인 버튼을 추가할 수 있음 */}
    </div>
  )
}
