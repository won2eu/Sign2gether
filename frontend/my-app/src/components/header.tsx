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

export default function Header() {
  // 서명 모달 오픈 상태
  const [signatureOpen, setSignatureOpen] = React.useState(false)
  // 서명 이미지 데이터 (base64)
  const [signatureData, setSignatureData] = React.useState<string | null>(null)

  return (
    <div className="w-full bg-white">
      {/* Main Navigation Bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        {/* 로고 */}
        <div className="flex items-center">
          <div className="w-6 h-6 bg-black rounded-sm mr-3 flex items-center justify-center">
            <div className="w-3 h-3 bg-white rounded-sm transform rotate-45"></div>
          </div>
          <span className="text-xl font-semibold text-gray-900">Sign2gether</span>
        </div>

        {/* Top Navigation Bar */}
        <nav className="flex items-center space-x-6">
          <a href="#" className="text-gray-700 hover:text-gray-900 font-medium">
            Home
          </a>
          <a href="#" className="text-gray-700 hover:text-gray-900 font-medium">
            Documents
          </a>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium">
            New
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <a href="#" className="text-gray-700 hover:text-gray-900 font-medium">
                Sign In
              </a>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>로그인</DialogTitle>
                <DialogDescription>구글 계정으로 간편하게 로그인하세요.</DialogDescription>
              </DialogHeader>
              <LoginForm />
            </DialogContent>
          </Dialog>
        </nav>
      </header>



      <div className="flex justify-end px-6 py-3 space-x-2">
        {/* 사인 버튼 */}
        <Button
          variant="outline"
          size="sm"
          className="flex items-center space-x-2 text-gray-700 border-gray-300 hover:bg-gray-50 bg-transparent"
          onClick={() => setSignatureOpen(true)}
        >
          <Pencil className="w-4 h-4" />
          <span>Signature</span>
        </Button>

        {/* 다운로드 버튼 */}
        <Button
          variant="outline"
          size="sm"
          className="flex items-center space-x-2 text-gray-700 border-gray-300 hover:bg-gray-50 bg-transparent"
        >
          <Download className="w-4 h-4" />
          <span>Download</span>
        </Button>
      </div>
      {/* SignatureModal 연동 */}
      <SignatureModal
        open={signatureOpen}
        onClose={() => setSignatureOpen(false)}
        onSave={(dataUrl) => {
          setSignatureData(dataUrl)
          setSignatureOpen(false)
          // 우선 콘솔에 출력, 추후 DropFileZone 등과 연동 가능
          console.log("서명 이미지(base64):", dataUrl)
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
