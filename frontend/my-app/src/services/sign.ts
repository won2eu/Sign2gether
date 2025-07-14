import axios from '@/lib/axios';

export interface GenerateSignResponse {
  message: string;
  sign_base64: string;
}

export async function getMySigns() {
  const res = await axios.get('/signs/');
  return res.data;
}

export async function deleteSign(sign_filename: string) {
  const res = await axios.delete(`/signs/${sign_filename}`);
  return res.data;
} 

export async function generateSign(name: string): Promise<GenerateSignResponse> {
  const res = await axios.get<GenerateSignResponse>(`/signs/generate/${name}`);
  return res.data;
}