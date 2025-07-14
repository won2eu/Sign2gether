import axios from '@/lib/axios';

export async function getMySigns() {
  const res = await axios.get('/signs/');
  return res.data;
}

export async function deleteSign(sign_filename: string) {
  const res = await axios.delete(`/signs/${sign_filename}`);
  return res.data;
}

// 문서에 서명 이미지 삽입
export async function insertSignToDocument(doc_filename: string, signer_id: number, signs: Array<{base64: string, x: number, y: number, width: number, height: number, num_page: number}>) {
  const res = await axios.post(`/documents/${doc_filename}/sign/${signer_id}`, signs);
  return res.data;
} 