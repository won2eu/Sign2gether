import React, { useRef, useState } from "react"
import SignatureCanvas from "react-signature-canvas"
import { Button } from "@/components/ui/button"
import { uploadSignDraw } from '@/services/document';
import QRCode from "react-qr-code";
import { v4 as uuidv4 } from "uuid";
import { useEffect } from "react";

interface SignatureModalProps {
  open: boolean
  onClose: () => void
  onSave: (dataUrl: string) => void
  onSignSaved?: () => void
  sigPadRef?: React.RefObject<any>
  onStrokeEnd?: () => void
  sessionId?: string | null
}

const COLORS = [
  { name: "black", code: "#000000" },
  { name: "blue", code: "#2563eb" },
  { name: "red", code: "#ef4444" },
]

// 흰색 배경을 투명하게 만드는 함수
function removeWhiteBgFromDataUrl(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        // 밝은 픽셀(흰색 계열)만 투명하게
        if (data[i] > 220 && data[i+1] > 220 && data[i+2] > 220) {
          data[i+3] = 0; // alpha = 0 (완전 투명)
        }
      }
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = dataUrl;
  });
}

export default function SignatureModal({ open, onClose, onSave, onSignSaved, sigPadRef, onStrokeEnd, sessionId: propSessionId }: SignatureModalProps) {
  const sigCanvasRef = sigPadRef ?? useRef<SignatureCanvas>(null)
  const [penColor, setPenColor] = useState(COLORS[0].code)
  const [uploading, setUploading] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (propSessionId) {
        setSessionId(propSessionId);
      } else {
        setSessionId(uuidv4());
      }
    }
  }, [open, propSessionId]);

  const mobileUrl = sessionId
    ? `https://sign2gether.vercel.app/mobile_sign?session=${sessionId}`
    : "";

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-10 relative">
        <h2 className="text-lg font-semibold mb-4">서명 만들기</h2>
        {/* QR코드 영역 */}
        {sessionId && (
          <div className="flex flex-col items-center mb-4">
            <div className="mb-2 text-sm text-gray-500">모바일에서 QR코드를 스캔해 서명하세요</div>
            <QRCode value={mobileUrl} size={128} />
          </div>
        )}
        {/* 색상 선택 */}
        <div className="flex items-center space-x-4 mb-4">
          {COLORS.map((color) => (
            <button
              key={color.name}
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${penColor === color.code ? "border-blue-500" : "border-gray-300"}`}
              style={{ background: color.code }}
              onClick={() => setPenColor(color.code)}
            />
          ))}
        </div>
        {/* 서명 그리기 영역 */}
        <div className="bg-gray-50 border rounded-lg flex items-center justify-center mb-4" style={{ height: 260 }}>
          <SignatureCanvas
            ref={sigCanvasRef}
            penColor={penColor}
            minWidth={3}
            maxWidth={3}
            backgroundColor="#f9fafb"
            canvasProps={{ width: 600, height: 240, className: "rounded-lg" }}
            //한 획 그릴때마다
            onEnd={() => {
              setHasDrawn(true);
              if (onStrokeEnd) onStrokeEnd();
            }}
          />
        </div>
        {/* 버튼 영역 */}
        <div className="flex justify-between items-center mt-2">
          <div className="space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                sigCanvasRef.current?.clear();
                setHasDrawn(false);
              }}
            >
              지우기
            </Button>
            <Button variant="outline" size="sm" onClick={onClose}>
              취소
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={uploading || !hasDrawn}
              onClick={async () => {
                if (sigCanvasRef.current && !sigCanvasRef.current.isEmpty()) {
                  setUploading(true);
                  const rawDataUrl = sigCanvasRef.current.getCanvas().toDataURL("image/png");
                  try {
                    await uploadSignDraw(rawDataUrl);
                    alert('서명이 성공적으로 업로드되었습니다!');
                    if (typeof onSignSaved === 'function') onSignSaved();
                  } catch {
                    alert('서명 업로드에 실패했습니다.');
                  } finally {
                    setUploading(false);
                  }
                }
              }}
            >
              {uploading ? '저장 중...' : '사인 저장'}
            </Button>
          </div>
          <Button
            size="sm"
            className="bg-blue-600 text-white hover:bg-blue-700"
            onClick={async () => {
              if (sigCanvasRef.current && !sigCanvasRef.current.isEmpty()) {
                const rawDataUrl = sigCanvasRef.current.getCanvas().toDataURL("image/png");
                const transparentDataUrl = await removeWhiteBgFromDataUrl(rawDataUrl);
                onSave(transparentDataUrl);
              }
            }}
          >
            만들기
          </Button>
        </div>
        {/* 닫기 버튼 */}
        <button
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-700"
          onClick={onClose}
        >
          <span className="sr-only">닫기</span>
          ×
        </button>
      </div>
    </div>
  )
} 