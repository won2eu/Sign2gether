"use client"

import { Button } from "@/components/ui/button"
import { Download, Pencil } from "lucide-react"
import SignatureModal from "@/components/SignatureModal"
import React from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

import LoginForm from "./LoginForm"
import { authService } from '@/services/auth'

export default function Header() {
  // 서명 모달 오픈 상태
  const [signatureOpen, setSignatureOpen] = React.useState(false)
  // 서명 이미지 데이터 (base64)
  const [signatureData, setSignatureData] = React.useState<string | null>(null)
  // 로그인 상태
  const [isLoggedIn, setIsLoggedIn] = React.useState(false)

  // 로그인 상태 확인
  React.useEffect(() => {
    const checkLogin = async () => {
      try {
        await authService.getMe()
        setIsLoggedIn(true)
      } catch (e) {
        setIsLoggedIn(false)
      }
    }
    checkLogin()
  }, [])

  // 서명 모달 열기 이벤트 리스너
  React.useEffect(() => {
    const handleOpenSignatureModal = () => {
      setSignatureOpen(true)
    }

    window.addEventListener('openSignatureModal', handleOpenSignatureModal)
    
    return () => {
      window.removeEventListener('openSignatureModal', handleOpenSignatureModal)
    }
  }, [])

  // 서명 추가 이벤트 리스너
  React.useEffect(() => {
    const handleAddSignature = (event: CustomEvent) => {
      setSignatureData(event.detail)
      // 서명이 추가되면 모달 닫기
      setSignatureOpen(false)
    }

    window.addEventListener('addSignature', handleAddSignature as EventListener)
    
    return () => {
      window.removeEventListener('addSignature', handleAddSignature as EventListener)
    }
  }, [])

  return (
    <div className="w-full bg-black">
      {/* Main Navigation Bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white">
        {/* 로고 */}
        <div className="flex items-center">
          <div className="w-6 h-6 bg-white rounded-sm mr-3 flex items-center justify-center">
            <div className="w-3 h-3 bg-black rounded-sm transform rotate-45"></div>
          </div>
          <span className="text-xl font-semibold text-white">Sign2gether</span>
        </div>

        {/* Top Navigation Bar */}
        <nav className="flex items-center space-x-6">
          <a href="/" className="text-white hover:text-blue-400 font-medium">
            Home
          </a>
          {isLoggedIn && (
            <a href="/documents" className="text-white hover:text-blue-400 font-medium">
              Documents
            </a>
          )}
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium">
            New
          </Button>
          {isLoggedIn ? (
            <a
              href="#"
              className="text-white hover:text-blue-400 font-medium"
              onClick={async (e) => {
                e.preventDefault();
                try {
                  await authService.logout();
                  setIsLoggedIn(false);
                  window.location.reload();
                } catch (e) {
                  // 로그아웃 실패 시 /auth/me로 재확인
                  try {
                    await authService.getMe();
                    // 여전히 로그인 상태라면 아무것도 하지 않음
                  } catch {
                    // /auth/me도 실패하면 강제로 로그아웃 UI로 전환
                    setIsLoggedIn(false);
                    window.location.reload();
                  }
                  alert('로그아웃에 실패했습니다.');
                }
              }}
            >
              Logout
            </a>
          ) : (
            <Dialog>
              <DialogTrigger asChild>
                <a href="#" className="text-white hover:text-blue-400 font-medium">
                  Sign In
                </a>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>로그인</DialogTitle>
                  <DialogDescription>
                    계정에 로그인하여 서명을 저장하고 관리하세요.
                  </DialogDescription>
                </DialogHeader>
                <LoginForm />
              </DialogContent>
            </Dialog>
          )}
        </nav>
      </header>

      <div className="flex justify-end px-6 py-3 space-x-2">
        {/* 사인 버튼 */}
        <Button
          variant="outline"
          size="sm"
          className="flex items-center space-x-2 text-white border-gray-600 bg-transparent"
          onClick={() => setSignatureOpen(true)}
        >
          <Pencil className="w-4 h-4" />
          <span>Signature</span>
        </Button>

        {/* 다운로드 버튼 */}
        <Button
          variant="outline"
          size="sm"
          className="flex items-center space-x-2 text-white border-gray-600 bg-transparent"
        >
          <Download className="w-4 h-4" />
          <span>Download</span>
        </Button>
      </div>

      {/* 서명 모달 */}
      <SignatureModal
        open={signatureOpen}
        onClose={() => setSignatureOpen(false)}
        onSave={(dataUrl) => {
          // 서명 데이터를 전역 이벤트로 전달
          window.dispatchEvent(new CustomEvent('addSignature', { detail: dataUrl }))
        }}
      />
      {/* (선택) 서명 이미지 미리보기 */}
      {signatureData && (
        <div className="flex justify-end px-6 mt-2">
          <img src={signatureData} alt="서명 미리보기" className="h-12 border rounded bg-white" />
        </div>
      )}
    </div>
  )
}
