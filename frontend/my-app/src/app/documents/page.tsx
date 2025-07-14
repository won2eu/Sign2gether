"use client"

import React, { useEffect, useState } from 'react';
import { getMyDocuments, deleteDocument } from '@/services/document';

function truncateFileName(name: string, maxLength = 30) {
  return name.length > maxLength ? name.slice(0, maxLength) + "..." : name;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    getMyDocuments()
      .then(setDocuments)
      .catch(() => setError("로그인이 필요합니다."))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (doc_filename: string) => {
    setDeleting(doc_filename);
    try {
      await deleteDocument(doc_filename);
      setDocuments((docs) => docs.filter((doc) => doc.doc_filename !== doc_filename));
    } catch {
      alert('문서 삭제에 실패했습니다.');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><div className="text-white">로딩 중...</div></div>;
  if (error) return <div className="min-h-screen bg-black flex items-center justify-center"><div className="text-white">{error}</div></div>;

  const backendUrl = "https://sign2gether-api-production.up.railway.app";

  return (
    <div className="min-h-screen bg-black py-10 px-4">
      <h1 className="text-2xl font-bold text-white mb-8">나의 문서</h1>
      <div className="space-y-4">
        {documents.length === 0 ? (
          <div className="text-gray-400">업로드한 문서가 없습니다.</div>
        ) : (
          documents.map((doc) => (
            <div key={doc.doc_filename} className="bg-gray-900 rounded-lg p-4 flex items-center justify-between shadow">
              <div>
                <div className="text-white font-medium text-lg">
                  <a
                    href={`https://sign2gether.vercel.app/${doc.doc_filename}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {truncateFileName(doc.original_filename)}
                  </a>
                </div>
                <div className="text-gray-400 text-sm mt-1">업로드: {new Date(doc.uploaded_at).toLocaleString()}</div>
                <div className="text-gray-500 text-xs mt-1">{(doc.file_size/1024).toFixed(1)} KB</div>
              </div>
              <div className="flex space-x-2">
                <a href={`${backendUrl}${doc.file_url}`} target="_blank" rel="noopener noreferrer" className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">보기</a>
                <a href={`${backendUrl}${doc.file_url}`} download className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 text-sm">다운로드</a>
                <button
                  onClick={() => handleDelete(doc.doc_filename)}
                  disabled={deleting === doc.doc_filename}
                  className={`px-3 py-1 rounded text-sm ${deleting === doc.doc_filename ? 'bg-red-300 text-white' : 'bg-red-600 text-white hover:bg-red-700'}`}
                >
                  {deleting === doc.doc_filename ? '삭제 중...' : '삭제'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
} 