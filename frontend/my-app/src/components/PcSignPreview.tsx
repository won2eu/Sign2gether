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
    if (!sessionId) return;
    const wsUrl = `wss://sign2gether-api-production.up.railway.app/signs/ws?sessionId=${sessionId}`;
    socketRef.current = new WebSocket(wsUrl);

    socketRef.current.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "stroke" && sigPadRef.current) {
          sigPadRef.current.fromData(msg.strokes);
        }
      } catch (e) {
        // ignore
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