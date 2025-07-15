"use client";

import SignatureModal from "@/components/SignatureModal";

export default function MobileSignPage() {
  return (
    <SignatureModal
      open={true}
      onClose={() => {
        window.history.back();
      }}
      onSave={() => {
        alert("서명이 저장되었습니다!");
      }}
    />
  );
} 