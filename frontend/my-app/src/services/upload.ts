import { API_CONFIG, API_ENDPOINTS } from "@/constants/api";

export async function uploadPdfWithSigners(file: File, signers: { name: string; email: string; role: string }[]) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("signers", JSON.stringify(signers));

  const res = await fetch(
    API_CONFIG.BACKEND_URL + API_ENDPOINTS.DOCS.PDF_UPLOAD,
    {
      method: "POST",
      body: formData,
      credentials: "include", // 쿠키(토큰)도 함께 전송하기
    }
  );

  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "업로드 실패");
  return data;
} 