"use client"

import React, { useEffect, useState } from 'react';
import { getMyDocuments } from '@/services/document';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMyDocuments()
      .then(setDocuments)
      .catch(() => setError("로그인이 필요합니다."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><div className="text-white">로딩 중...</div></div>;
  if (error) return <div className="min-h-screen bg-black flex items-center justify-center"><div className="text-white">{error}</div></div>;

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
                <div className="text-white font-medium text-lg">{doc.original_filename}</div>
                <div className="text-gray-400 text-sm mt-1">업로드: {new Date(doc.uploaded_at).toLocaleString()}</div>
                <div className="text-gray-500 text-xs mt-1">{(doc.file_size/1024).toFixed(1)} KB</div>
              </div>
              <div className="flex space-x-2">
                <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">보기</a>
                <a href={doc.file_url} download className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 text-sm">다운로드</a>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
} 