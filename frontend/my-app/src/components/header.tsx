"use client"

import { Button } from "@/components/ui/button"
import { Download, Pencil } from "lucide-react"
import SignatureModal from "@/components/SignatureModal"
import React, { useEffect, useState } from "react";
import { getMySigns, deleteSign } from "@/services/sign";

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
import AISignatureModal from "@/components/AISignatureModal";

// 흰색 배경을 투명하게 만드는 함수 (SignatureModal.tsx에서 복사)
function removeWhiteBgFromDataUrl(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(dataUrl);
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] > 220 && data[i+1] > 220 && data[i+2] > 220) {
          data[i+3] = 0;
        }
      }
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = dataUrl;
  });
}

export default function Header() {
  const [signsRefreshKey, setSignsRefreshKey] = useState(0);
  // 서명 모달 오픈 상태
  const [signatureOpen, setSignatureOpen] = React.useState(false)
  // AI 서명 모달 오픈 상태
  const [aiSignatureOpen, setAiSignatureOpen] = React.useState(false)
  // 서명 이미지 데이터 (base64)
  const [signatureData, setSignatureData] = React.useState<string | null>(null)
  // 로그인 상태
  const [isLoggedIn, setIsLoggedIn] = React.useState<null | boolean>(null)

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

  if (isLoggedIn === null) return null;

  return (
    <div className="w-full bg-black">
      {/* Main Navigation Bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white">
        {/* 로고 */}
        <a href="/" className="flex items-center">
          <img src="/sign2gether.png" alt="Sign2gether 로고" className="w-8 h-8 mr-2" />
          <span className="text-xl font-semibold text-white">Sign2gether</span>
        </a>

        {/* Top Navigation Bar */}
        <nav className="flex items-center space-x-6">
          {/* AI 서명 생성 링크 - 네비게이션 가장 왼쪽 */}
          <button
            type="button"
            className="text-blue-300 hover:text-blue-500 font-bold whitespace-nowrap mr-30 focus:outline-none"
            onClick={() => {
              if (!isLoggedIn) {
                alert('로그인 해야 사용할 수 있어요!');
                return;
              }
              setAiSignatureOpen(true);
            }}
          >
            <span
              className="text-blue-400 transition-all duration-200 group-hover:text-blue-300"
              style={{ textShadow: '0 0 1px #60a5fa, 0 0 3px #60a5fa' }}
              onMouseEnter={e => e.currentTarget.style.textShadow = '0 0 6px #60a5fa, 0 0 16px #60a5fa, 0 0 32px #60a5fa'}
              onMouseLeave={e => e.currentTarget.style.textShadow = '0 0 1px #60a5fa, 0 0 3px #60a5fa'}
            >
              AI로 서명을 생성해보세요.
            </span>
          </button>
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
          window.dispatchEvent(new CustomEvent('addSignature', { detail: dataUrl }))
        }}
        onSignSaved={() => setSignsRefreshKey(k => k + 1)}
      />
      {/* AI 서명 모달 */}
      <AISignatureModal
        open={aiSignatureOpen}
        onClose={() => setAiSignatureOpen(false)}
        onSave={(dataUrl) => {
          setSignatureData(dataUrl);
          setAiSignatureOpen(false);
          setSignsRefreshKey(k => k + 1);
        }}
      />
      {/* 로그인한 사용자의 모든 서명 이미지 썸네일 */}
      <MySignThumbnails refreshKey={signsRefreshKey} />
    </div>
  )
}

function MySignThumbnails({ refreshKey }: { refreshKey?: number }) {
  const [signs, setSigns] = useState<any[]>([]);

  useEffect(() => {
    getMySigns()
      .then(setSigns)
      .catch(() => setSigns([]));
  }, [refreshKey]);

  if (signs.length === 0) return null;

  return (
    <div className="flex justify-end px-6 mt-2 gap-2">
      {signs.map((sign) => (
        <div key={sign.sign_filename} className="flex flex-col items-center">
          <img
            src={`https://sign2gether-api-production.up.railway.app${sign.file_url}`}
            alt="서명"
            className="h-12 w-auto border border-black rounded cursor-pointer"
            style={{ filter: "invert(1)", background: "black" }}
            title={sign.sign_filename}
            onClick={async () => {
              const response = await fetch(`https://sign2gether-api-production.up.railway.app${sign.file_url}`);
              const blob = await response.blob();
              const reader = new FileReader();
              reader.onloadend = async function() {
                const base64data = reader.result as string;
                const transparentDataUrl = await removeWhiteBgFromDataUrl(base64data);
                window.dispatchEvent(new CustomEvent('addSignature', { detail: transparentDataUrl }));
              };
              reader.readAsDataURL(blob);
            }}
          />
          <button
            onClick={async () => {
              if (window.confirm('정말 삭제하시겠습니까?')) {
                try {
                  await deleteSign(sign.sign_filename);
                  setSigns(signs => signs.filter(s => s.sign_filename !== sign.sign_filename));
                } catch {
                  alert('삭제에 실패했습니다.');
                }
              }
            }}
            className="mt-1 text-white text-base hover:underline focus:outline-none"
            title="삭제"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
