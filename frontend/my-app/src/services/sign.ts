import axios from '@/lib/axios';

export async function getMySigns() {
  const res = await axios.get('/signs/');
  return res.data;
}

export async function deleteSign(sign_filename: string) {
  const res = await axios.delete(`/signs/${sign_filename}`);
  return res.data;
} 