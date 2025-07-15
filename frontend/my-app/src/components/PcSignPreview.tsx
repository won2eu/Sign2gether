import { useEffect, useRef } from "react";
import SignatureModal from "@/components/SignatureModal";

interface PcSignPreviewProps {
  sessionId: string;
  open: boolean;
  onClose: () => void;
  onSave: (dataUrl: string) => void;
}

export default function PcSignPreview({ sessionId, open, onClose, onSave }: PcSignPreviewProps) {
  const socketRef = useRef<WebSocket | null>(null);
  const sigPadRef = useRef<any>(null);

  useEffect(() => {
    console.log("[PC] sessionId:", sessionId);
    if (!sessionId) return;
    console.log("[PC] WebSocket 연결 시도");
    const wsUrl = `wss://sign2gether-api-production.up.railway.app/signs/ws?sessionId=${sessionId}`;
    socketRef.current = new WebSocket(wsUrl);

    socketRef.current.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        console.log("[PC] WebSocket 수신 메시지:", msg);
        if (msg.type === "stroke" && sigPadRef.current) {
          sigPadRef.current.fromData(msg.strokes);
        }
      } catch (e) {
        console.error("[PC] WebSocket 메시지 파싱 에러:", e, event.data);
      }
    };

    return () => {
      socketRef.current?.close();
    };
  }, [sessionId]);

  return (
    <SignatureModal
      open={open}
      onClose={onClose}
      onSave={onSave}
      sigPadRef={sigPadRef}
      sessionId={sessionId}
    />
  );
} 