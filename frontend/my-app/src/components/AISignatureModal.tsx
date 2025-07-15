import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import axios from '@/lib/axios';
import { generateSign, GenerateSignResponse } from "@/services/sign";
import { uploadSignDraw } from "@/services/document";

interface AISignatureModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data_base64: string) => void;
}

export default function AISignatureModal({ open, onClose, onSave }: AISignatureModalProps) {
  const [name, setName] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [aiSign, setAiSign] = React.useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    setAiSign(null);
    try {
      const res = await generateSign(name);
      setAiSign(res.sign_base64); // base64 PNG
    } catch (e: any) {
      setError("AI 서명 생성에 실패했습니다.");
      alert(e?.message || e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="fixed left-[75%] -translate-x-[75%] top-[10%]  -translate-y-[10%]">
        <DialogHeader>
          <DialogTitle>AI로 서명 생성</DialogTitle>
          <DialogDescription>이름을 입력하면 AI가 손글씨 서명을 만들어줍니다.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <input
            type="text"
            className="border rounded px-3 py-2 text-white"
            placeholder="이름을 입력하세요"
            value={name}
            onChange={e => setName(e.target.value)}
            disabled={loading}
          />
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-700 disabled:opacity-50"
            onClick={handleGenerate}
            disabled={loading || !name.trim()}
          >
            {loading ? "생성 중..." : aiSign ? "재생성" : "AI 서명 생성"}
          </button>
          {error && <div className="text-red-500 text-sm">{error}</div>}
          {aiSign && (
            <div className="flex flex-col items-center gap-2">
              <img src={aiSign} alt="AI 서명 미리보기" className="border rounded bg-white p-2 max-h-32" />
              <button
                className="bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700"
                onClick={async () => { 
                  await uploadSignDraw(aiSign);
                  alert('서명이 성공적으로 업로드되었습니다!');
                  onSave(aiSign);
                  onClose(); 
                }}
              >
                이 서명 사용하기
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 