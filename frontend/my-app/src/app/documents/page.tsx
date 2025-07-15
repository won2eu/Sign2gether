"use client"

import React, { useEffect, useState, useRef } from 'react';
import { getMyDocuments, deleteDocument, getDocumentSigners } from '@/services/document';
import gsap from 'gsap';

function truncateFileName(name: string, maxLength = 30) {
  return name.length > maxLength ? name.slice(0, maxLength) + "..." : name;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [signerStatus, setSignerStatus] = useState<{ [doc_filename: string]: { total: number, signed: number } }>({});

  // 카드 refs
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const titleRef = useRef<HTMLHeadingElement>(null);

  // 제목 관련
  const titles = ["My Docs Hub", "나의 문서 모음"];
  const [titleIdx, setTitleIdx] = useState(0);
  const titleChars = titles[titleIdx].split("");
  const charRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    function handleScroll() {
      const centerY = window.innerHeight * 0.6;
      let minDist = Infinity;
      let closestIdx = -1;

      cardRefs.current.forEach((ref, i) => {
        if (!ref) return;
        const rect = ref.getBoundingClientRect();
        const cardCenter = (rect.top + rect.bottom) / 2;
        const dist = Math.abs(centerY - cardCenter);
        if (dist < minDist) {
          minDist = dist;
          closestIdx = i;
        }
      });

      // 스크롤이 맨 아래에 닿았는지 체크
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight;
      const winHeight = window.innerHeight;
      const bottomGap = docHeight - (scrollY + winHeight);

      // 맨 아래(10px 이하)면 마지막 카드, 40px 이하면 마지막에서 두 번째 카드
      if (bottomGap <= 5 && documents.length > 0) {
        closestIdx = documents.length - 1;
      } else if (bottomGap <= 20 && documents.length > 1) {
        closestIdx = documents.length - 2;
      }

      cardRefs.current.forEach((ref, i) => {
        if (!ref) return;
        const scale = i === closestIdx ? 1.15 : 1;
        gsap.to(ref, { scale, duration: 0.3, overwrite: 'auto' });
      });
    }
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [documents]);

  useEffect(() => {
    if (!loading && !error) {
      // 초기 상태로 세팅
      gsap.set(charRefs.current, { opacity: 0, y: -60, scale: 0.8 });
      // 등장 애니메이션
      gsap.to(charRefs.current, {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.7,
        ease: "bounce.out",
        stagger: 0.07,
        onComplete: () => {
          // 1.2초 후 사라지는 애니메이션
          setTimeout(() => {
            gsap.to(charRefs.current, {
              opacity: 0,
              y: -60,
              scale: 0.8,
              duration: 0.5,
              stagger: 0.05,
              onComplete: () => {
                setTitleIdx(idx => (idx + 1) % titles.length);
              }
            });
          }, 1200);
        }
      });
    }
  }, [titleIdx, loading, error]);

  useEffect(() => {
    getMyDocuments()
      .then(async (docs) => {
        setDocuments(docs);
        const statusObj: { [doc_filename: string]: { total: number, signed: number } } = {};
        await Promise.all(
          docs.map(async (doc: any) => {
            try {
              const signers = await getDocumentSigners(doc.doc_filename);
              statusObj[doc.doc_filename] = {
                total: signers.length,
                signed: signers.filter((s: any) => s.is_signed).length,
              };
            } catch {
              statusObj[doc.doc_filename] = { total: 0, signed: 0 };
            }
          })
        );
        setSignerStatus(statusObj);
      })
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

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><div className="text-white"></div></div>;
  if (error) return <div className="min-h-screen bg-black flex items-center justify-center"><div className="text-white">{error}</div></div>;

  const backendUrl = "https://sign2gether-api-production.up.railway.app";

  return (
    <div className="min-h-screen bg-black py-10 px-4">
      <h1
        // ref={titleRef} // 기존 ref 제거
        className="text-6xl font-bold text-white mb-8 pl-8"
        style={{}}
      >
        {titleChars.map((char, idx) => (
          <span
            key={idx}
            ref={el => { void (charRefs.current[idx] = el); }}
            style={{
              display: "inline-block",
              opacity: 0,
              transform: "translateY(-60px) scale(0.8)",
              willChange: "transform, opacity"
            }}
          >
            {char === " " ? "\u00A0" : char}
          </span>
        ))}
      </h1>
      <div className="space-y-4">
        {documents.length === 0 ? (
          <div className="text-gray-400">업로드한 문서가 없습니다.</div>
        ) : (
          documents.map((doc, i) => (
            <div
              key={doc.doc_filename}
              ref={el => { cardRefs.current[i] = el; }}
              className="bg-white rounded-lg p-4 flex items-center justify-between shadow w-[80vw] mx-auto"
              style={{ willChange: 'transform' }}
            >
              <div>
                <div className="text-black font-medium text-lg">
                  <a
                    href={`https://sign2gether.vercel.app/${doc.doc_filename}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    <span className="font-bold text-2xl" >Click!</span> {truncateFileName(doc.original_filename)}
                  </a>
                </div>
                <div className="text-black text-sm mt-1">업로드: {new Date(doc.uploaded_at).toLocaleString()}</div>
                <div
                  className={
                    `text-xs mt-1 ` +
                    (
                      signerStatus[doc.doc_filename]
                        ? (signerStatus[doc.doc_filename].signed === signerStatus[doc.doc_filename].total
                            ? 'text-blue-700'
                            : 'text-red-500')
                        : ''
                    )
                  }
                >
                  {signerStatus[doc.doc_filename]
                    ? `${signerStatus[doc.doc_filename].signed}/${signerStatus[doc.doc_filename].total}명 서명완료`
                    : '서명 정보 불러오는 중...'}
                </div>
              </div>
              <div className="flex space-x-2">
                <a href={`${backendUrl}${doc.file_url}`} target="_blank" rel="noopener noreferrer" className="px-5 py-2 bg-black text-white rounded-full hover:bg-blue-700 text-base font-bold">보기</a>
                <a href={`${backendUrl}${doc.file_url}`} download className="px-5 py-2 bg-black text-white rounded-full hover:bg-green-700 text-base font-bold">다운로드</a>
                <button
                  onClick={() => handleDelete(doc.doc_filename)}
                  disabled={deleting === doc.doc_filename}
                  className={`px-5 py-2 rounded-full text-base font-bold ${deleting === doc.doc_filename ? 'bg-red-300 text-white' : 'bg-black text-white hover:bg-red-600'}`}
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