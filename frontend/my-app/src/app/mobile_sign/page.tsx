"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import SignatureModal from "@/components/SignatureModal";

export default function MobileSignPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");
  const socketRef = useRef<WebSocket | null>(null);
  const sigPadRef = useRef<any>(null);

  useEffect(() => {
    if (!sessionId) return;
    const wsUrl = `wss://sign2gether-api-production.up.railway.app/signs/ws?sessionId=${sessionId}`;
    socketRef.current = new WebSocket(wsUrl);

    socketRef.current.onopen = () => {
      console.log("WebSocket 연결 성공!");
    };
    socketRef.current.onclose = () => {
      console.log("WebSocket 연결 종료");
    };
    socketRef.current.onerror = (e) => {
      console.error("WebSocket 에러:", e);
    };
    socketRef.current.onmessage = (event) => {
      console.log("서버 메시지:", event.data);
    };

    return () => {
      socketRef.current?.close();
    };
  }, [sessionId]);

  // 실시간 stroke 전송 함수
  const handleStrokeEnd = () => {
    if (sigPadRef.current && socketRef.current && socketRef.current.readyState === 1) {
      const strokes = sigPadRef.current.toData();
      socketRef.current.send(JSON.stringify({
        type: "stroke",
        strokes,
        sessionId,
      }));
    }
  };

  return (
    <SignatureModal
      open={true}
      onClose={() => window.history.back()}
      onSave={(dataUrl) => {
        if (socketRef.current && socketRef.current.readyState === 1) {
          socketRef.current.send(JSON.stringify({
            type: "sign",
            dataUrl,
            sessionId,
          }));
          alert("서명이 서버로 전송되었습니다!");
        } else {
          alert("WebSocket 연결이 안 되어 있습니다.");
        }
      }}
      sigPadRef={sigPadRef}
      onStrokeEnd={handleStrokeEnd}
    />
  );
} 