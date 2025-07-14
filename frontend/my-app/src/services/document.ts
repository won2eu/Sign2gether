import { API_CONFIG, API_ENDPOINTS } from "@/constants/api";
import axios from '../lib/axios';

export async function getDocument(doc_filename: string) {
  const res = await fetch(
    API_CONFIG.BACKEND_URL + API_ENDPOINTS.DOCS.GET_DOCUMENT.replace('{doc_filename}', doc_filename),
    {
      method: "GET",
      credentials: "include",
    }
  );

  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "문서 조회 실패");
  return data;
}

export async function getDocumentSigners(doc_filename: string) {
  const res = await fetch(
    API_CONFIG.BACKEND_URL + API_ENDPOINTS.DOCS.GET_SIGNERS.replace('{doc_filename}', doc_filename),
    {
      method: "GET",
      credentials: "include",
    }
  );

  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "서명자 목록 조회 실패");
  return data;
}

export async function updateSignerStatus(doc_filename: string, signer_id: number, is_signed: boolean) {
  const res = await fetch(
    API_CONFIG.BACKEND_URL + 
    API_ENDPOINTS.DOCS.UPDATE_SIGNER_STATUS
      .replace('{doc_filename}', doc_filename)
      .replace('{signer_id}', signer_id.toString()),
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ is_signed }),
    }
  );

  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "서명 상태 업데이트 실패");
  return data;
} 

export async function getMyDocuments() {
  const res = await axios.get(API_ENDPOINTS.DOCS.GET_MY_DOCUMENTS);
  return res.data;
} 

export async function deleteDocument(doc_filename: string) {
  const res = await axios.delete(API_ENDPOINTS.DOCS.DELETE_DOCUMENT.replace('{doc_filename}', doc_filename));
  return res.data;
} 

export async function uploadSignDraw(imageData: string) {
  const res = await axios.post(API_ENDPOINTS.DOCS.UPLOAD_SIGN_DRAW, { image: imageData });
  return res.data;
} 