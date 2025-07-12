import React, { useRef, useState } from "react"
import SignatureCanvas from "react-signature-canvas"
import { Button } from "@/components/ui/button"

interface SignatureModalProps {
  open: boolean
  onClose: () => void
  onSave: (dataUrl: string) => void
}

const COLORS = [
  { name: "black", code: "#000000" },
  { name: "blue", code: "#2563eb" },
  { name: "red", code: "#ef4444" },
]

export default function SignatureModal({ open, onClose, onSave }: SignatureModalProps) {
  const sigCanvasRef = useRef<SignatureCanvas>(null)
  const [penColor, setPenColor] = useState(COLORS[0].code)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-10 relative">
        <h2 className="text-lg font-semibold mb-4">서명 만들기</h2>
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
          />
        </div>
        {/* 버튼 영역 */}
        <div className="flex justify-between items-center mt-2">
          <div className="space-x-2">
            <Button variant="outline" size="sm" onClick={() => sigCanvasRef.current?.clear()}>
              지우기
            </Button>
            <Button variant="outline" size="sm" onClick={onClose}>
              취소
            </Button>
          </div>
          <Button
            size="sm"
            className="bg-blue-600 text-white hover:bg-blue-700"
            onClick={() => {
              if (sigCanvasRef.current && !sigCanvasRef.current.isEmpty()) {
                onSave(sigCanvasRef.current.getTrimmedCanvas().toDataURL("image/png"))
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