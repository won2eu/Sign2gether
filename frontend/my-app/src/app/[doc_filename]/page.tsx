"use client"

import { useParams } from 'next/navigation'
import { useEffect, useState, useRef, useCallback } from 'react'
import { Minus, Plus, RotateCw, ChevronLeft, ChevronRight, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import { UploadedFile, ZoomState, PanState, SignatureImage, ResizeInfo, PreviewType } from "@/types/fileUpload"
import { getDocument, getDocumentSigners, updateSignerStatus } from '@/services/document'
import { API_CONFIG } from "@/constants/api"

export default function DocSignPage() {
  const params = useParams()
  const doc_filename = params.doc_filename as string

  // 문서 정보 상태
  const [document, setDocument] = useState<any>(null)
  // 그룹원(서명자) 정보 상태
  const [signers, setSigners] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // PDF 뷰어 관련 상태
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null)
  const [previewType, setPreviewType] = useState<PreviewType>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pdfPageCount, setPdfPageCount] = useState(1)
  const pdfDocRef = useRef<any>(null)
  
  // 줌 상태
  const [zoomState, setZoomState] = useState<ZoomState>({
    scale: 1
  })
  
  // 패닝 상태
  const [panState, setPanState] = useState<PanState>({
    x: 0,
    y: 0
  })
  
  // 패닝 상태 추적 Ref
  const isPanningRef = useRef(false)
  const lastMousePosRef = useRef({ x: 0, y: 0 })
  const isRenderingRef = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // 서명 이미지 상태
  const [signatures, setSignatures] = useState<SignatureImage[]>([])
  const [draggedSignatureId, setDraggedSignatureId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [showSignatureAdded, setShowSignatureAdded] = useState(false)
  const [resizeInfo, setResizeInfo] = useState<ResizeInfo | null>(null)

  // 서명 완료 체크박스 상태
  const [signedStatus, setSignedStatus] = useState<{[key: string]: boolean}>({})

  // 1. 모달 상태 추가
  const [confirmModal, setConfirmModal] = useState<{ open: boolean, signerId: string | null }>({ open: false, signerId: null });

  // 체크박스 토글 함수
  const toggleSignedStatus = async (signerId: string) => {
    try {
      // 현재 상태의 반대값으로 업데이트
      const newStatus = !signedStatus[signerId];
      
      // PDF 미리보기 영역 크기 (px)
      const pdfWidth = 500;
      const pdfHeight = 700;
      // 체크박스가 true(서명 완료)로 바뀌는 경우에만 API 호출
      if (newStatus) {
        // signatures 전체를 PDF 좌표계(0~100)로 변환
        const signs = signatures.map(sig => ({
          base64: sig.dataUrl,
          x: (sig.x / pdfWidth) * 100,
          y: (sig.y / pdfHeight) * 100,
          width: (sig.width / pdfWidth) * 100,
          height: (sig.height / pdfHeight) * 100,
          num_page: sig.num_page
        }));
        try {
          // API 호출
          // insertSignToDocument는 services/sign.ts에 구현되어 있음
          const { insertSignToDocument } = await import('@/services/sign');
          await insertSignToDocument(doc_filename, parseInt(signerId), signs);
          console.log('서명 이미지 전송 성공:', { doc_filename, signerId, signs });
          // 문서 정보 새로고침 (PDF 미리보기 리렌더링)
          const updatedDoc = await getDocument(doc_filename);
          setDocument(updatedDoc);
          setSignatures([]); // 사인 전송 후 오버레이 사인 초기화
          // PDF 미리보기 파일도 새로 받아오기 (딜레이 추가)
          setTimeout(async () => {
            try {
              setPreviewType(null);
              const fileUrl = `${API_CONFIG.BACKEND_URL}${updatedDoc.file_url}?t=${Date.now()}`;
              const res = await fetch(fileUrl);
              if (!res.ok) throw new Error('파일을 불러올 수 없습니다.');
              const blob = await res.blob();
              const file = new File([blob], updatedDoc.original_filename, {
                type: updatedDoc.mime_type || 'application/pdf'
              });
              setUploadedFile({
                name: updatedDoc.original_filename,
                size: updatedDoc.file_size,
                type: updatedDoc.mime_type || 'application/pdf',
                file: file,
              });
              setPreviewType('pdf');
            } catch (e) {
              console.error('PDF 새로고침 실패:', e);
            }
          }, 700); // 700ms 딜레이
        } catch (e) {
          alert('서명 이미지 전송에 실패했습니다.');
          return;
        }
      }
      // API 호출
      await updateSignerStatus(doc_filename, parseInt(signerId), newStatus);
      
      // 성공하면 로컬 상태 업데이트
      setSignedStatus(prev => ({
        ...prev,
        [signerId]: newStatus
      }));
    } catch (error) {
      console.error('서명 상태 업데이트 실패:', error);
      // 에러 발생 시 원래 상태로 되돌리기
      alert('서명 상태 업데이트에 실패했습니다.');
    }
  };

  // 애니메이션 프레임 refs
  const animationFrameRef = useRef<number | null>(null);
  const dragFrameRef = useRef<number | null>(null);
  const dragPosRef = useRef<{ x: number; y: number } | null>(null);

  // 문서 정보와 서명자 정보 가져오기
  useEffect(() => {
    if (!doc_filename) return;
    setLoading(true);
    setError(null);
    
    Promise.all([
      getDocument(doc_filename),
      getDocumentSigners(doc_filename)
    ])
      .then(([docData, signersData]) => {
        setDocument(docData);
        setSigners(signersData);
        
        // 서명 완료 상태 초기화
        const initialSignedStatus: {[key: string]: boolean} = {};
        signersData.forEach((signer: any) => {
            //구성원의 is_signed에 따라서 바로 표시됨.
          initialSignedStatus[signer.signer_id] = signer.is_signed || false;
        });
        setSignedStatus(initialSignedStatus);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [doc_filename])

  // docFilename이 있을 때 서버에서 파일을 가져와서 미리보기로 띄우기
  useEffect(() => {
    if (doc_filename && document) {
      setLoading(true);
      setErrorMsg(null);
      
      const fileUrl = `${API_CONFIG.BACKEND_URL}${document.file_url}?t=${Date.now()}`;
      
      fetch(fileUrl)
        .then(res => {
          if (!res.ok) throw new Error('파일을 불러올 수 없습니다.');
          return res.blob();
        })
        .then(blob => {
          const file = new File([blob], document.original_filename, {
            type: document.mime_type || 'application/pdf'
          });
          
          setPreviewType(null); // 먼저 null로 바꿔서 useEffect 트리거
          setUploadedFile({
            name: document.original_filename,
            size: document.file_size,
            type: document.mime_type || 'application/pdf',
            file: file,
          });
          setPreviewType('pdf');
        })
        .catch(err => {
          console.error('파일 로드 에러:', err);
          setErrorMsg('파일을 불러올 수 없습니다.');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [doc_filename, document])

  // 서명 이미지 추가 함수
  const addSignature = useCallback((dataUrl: string) => {
    const baseX = 200
    const baseY = 300
    const maxOffset = 150
    const offset = Math.min(signatures.length * 30, maxOffset)
    
    const newSignature: SignatureImage = {
      id: `sig-${Date.now()}`,
      dataUrl,
      x: baseX + offset,
      y: baseY + offset,
      width: 120,
      height: 60,
      isDragging: false,
      isResizing: false,
      num_page: currentPage // 현재 PDF 페이지 번호 반영
    }
    setSignatures(prev => [...prev, newSignature])
  }, [signatures.length, currentPage])

  // 서명 이미지 제거 함수
  const removeSignature = useCallback((id: string) => {
    setSignatures(prev => prev.filter(sig => sig.id !== id))
  }, [])

  // 서명 드래그 시작
  const handleSignatureMouseDown = useCallback((e: React.MouseEvent, signatureId: string) => {
    e.stopPropagation()
    const signature = signatures.find(sig => sig.id === signatureId)
    if (!signature) return

    const rect = e.currentTarget.getBoundingClientRect()
    const offsetX = e.clientX - rect.left
    const offsetY = e.clientY - rect.top

    setDraggedSignatureId(signatureId)
    setDragOffset({ x: offsetX, y: offsetY })
    setSignatures(prev => prev.map(sig => 
      sig.id === signatureId ? { ...sig, isDragging: true } : sig
    ))
  }, [signatures])

  // 서명 드래그 중
  const handleSignatureMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggedSignatureId || !containerRef.current) return

    const containerRect = containerRef.current.getBoundingClientRect()
    const newX = e.clientX - containerRect.left - dragOffset.x
    const newY = e.clientY - containerRect.top - dragOffset.y

    const maxX = containerRect.width - 120
    const maxY = containerRect.height - 60

    setSignatures(prev => prev.map(sig => 
      sig.id === draggedSignatureId 
        ? { 
            ...sig, 
            x: Math.max(0, Math.min(newX, maxX)), 
            y: Math.max(0, Math.min(newY, maxY)) 
          }
        : sig
    ))
  }, [draggedSignatureId, dragOffset])

  // 서명 드래그 종료
  const handleSignatureMouseUp = useCallback(() => {
    if (draggedSignatureId) {
      setSignatures(prev => prev.map(sig => 
        sig.id === draggedSignatureId ? { ...sig, isDragging: false } : sig
      ))
      setDraggedSignatureId(null)
    }
  }, [draggedSignatureId])

  // 패닝 시작 핸들러
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoomState.scale > 1) {
      isPanningRef.current = true
      lastMousePosRef.current = { x: e.clientX, y: e.clientY }
      e.preventDefault()
    }
  }, [zoomState.scale])

  // 패닝 중 핸들러
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanningRef.current && zoomState.scale > 1) {
      const deltaX = e.clientX - lastMousePosRef.current.x
      const deltaY = e.clientY - lastMousePosRef.current.y
      
      setPanState(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }))
      
      lastMousePosRef.current = { x: e.clientX, y: e.clientY }
      e.preventDefault()
    }
    handleSignatureMouseMove(e)
  }, [zoomState.scale, handleSignatureMouseMove])

  // 패닝 종료 핸들러
  const handleMouseUp = useCallback(() => {
    isPanningRef.current = false
    handleSignatureMouseUp()
  }, [handleSignatureMouseUp])

  // 줌 인/아웃 함수
  const handleZoomWithCenter = useCallback((delta: number, centerX: number, centerY: number) => {
    setZoomState(prev => {
      const newScale = Math.max(1.0, Math.min(5, prev.scale + delta))
      return { scale: newScale }
    })
    if (zoomState.scale + delta <= 1) {
      setPanState({ x: 0, y: 0 })
    }
  }, [zoomState.scale])

  // PDF 파일 렌더링
  useEffect(() => {
    if (
      previewType === "pdf" &&
      uploadedFile &&
      canvasRef.current &&
      typeof window !== "undefined"
    ) {
      if (isRenderingRef.current) return;
      isRenderingRef.current = true;
      setLoading(true);
      const fileReader = new FileReader();
      fileReader.onload = async function () {
        // @ts-ignore
        const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
        const typedarray = new Uint8Array(this.result as ArrayBuffer);
        try {
          const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
          pdfDocRef.current = pdf;
          setPdfPageCount(pdf.numPages);
          setCurrentPage(prev => prev > pdf.numPages ? 1 : prev);

          if (canvasRef.current) {
            const pageToRender = currentPage > pdf.numPages ? 1 : currentPage;
            const page = await pdf.getPage(pageToRender);
            const canvasWidth = 500;
            const canvasHeight = 700;
            const originalViewport = page.getViewport({ scale: 1 });
            const baseScale = Math.min(canvasWidth / originalViewport.width, canvasHeight / originalViewport.height, 1.5)
            const scale = baseScale * zoomState.scale;
            const viewport = page.getViewport({ scale });
            const offsetX = (canvasWidth - viewport.width) / 2 + panState.x;
            const offsetY = (canvasHeight - viewport.height) / 2 + panState.y;
            const canvas = canvasRef.current;
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
            const ctx = canvas.getContext("2d");
            if (!ctx) { setLoading(false); isRenderingRef.current = false; return; }
            ctx.clearRect(0, 0, canvasWidth, canvasHeight);
            ctx.save();
            ctx.translate(offsetX, offsetY);
            await page.render({ canvasContext: ctx, viewport }).promise;
            ctx.restore();
          }
        } catch (e) {
          console.error("PDF 미리보기 에러:", e);
          setPreviewType("unsupported");
        }
        setLoading(false);
        isRenderingRef.current = false;
      };
      fileReader.readAsArrayBuffer(uploadedFile.file);
    }
  }, [
    previewType,
    uploadedFile?.name,
    uploadedFile?.size,
    uploadedFile?.type
  ])

  // PDF 페이지가 바뀔 때마다 해당 페이지를 canvas에 렌더링
  useEffect(() => {
    const renderPage = async () => {
      if (
        previewType === "pdf" &&
        uploadedFile &&
        canvasRef.current &&
        pdfDocRef.current &&
        typeof window !== "undefined"
      ) {
        if (isRenderingRef.current) return;
        isRenderingRef.current = true;
        // 페이지 변경 시에만 로딩 표시, 줌/패닝 시에는 로딩 표시 안함
        if (currentPage !== 1 || !pdfDocRef.current) {
          setLoading(true);
        }
        try {
          const page = await pdfDocRef.current.getPage(currentPage);
          const canvasWidth = 500;
          const canvasHeight = 700;
          const originalViewport = page.getViewport({ scale: 1 });
          const baseScale = Math.min(canvasWidth / originalViewport.width, canvasHeight / originalViewport.height, 1.5)
          const scale = baseScale * zoomState.scale;
          const viewport = page.getViewport({ scale });
          const offsetX = (canvasWidth - viewport.width) / 2 + panState.x;
          const offsetY = (canvasHeight - viewport.height) / 2 + panState.y;
          const canvas = canvasRef.current;
          canvas.width = canvasWidth;
          canvas.height = canvasHeight;
          const ctx = canvas.getContext("2d");
          if (!ctx) { setLoading(false); isRenderingRef.current = false; return; }
          ctx.clearRect(0, 0, canvasWidth, canvasHeight);
          ctx.save();   
          ctx.translate(offsetX, offsetY);
          await page.render({ canvasContext: ctx, viewport }).promise;
          ctx.restore();
        } catch (e) {
          console.error("PDF 페이지 렌더링 에러:", e);
          setPreviewType("unsupported");
        }
        setLoading(false);
        isRenderingRef.current = false;
      }
    };
    renderPage();
  }, [
    currentPage,
    previewType,
    uploadedFile?.name ?? "",
    uploadedFile?.size ?? 0,
    uploadedFile?.type ?? "",
    zoomState.scale,
    panState.x,
    panState.y
  ])

  // 서명 추가 이벤트 리스너
  useEffect(() => {
    const handleAddSignature = (event: CustomEvent) => {
      if (previewType === "pdf") {
        addSignature(event.detail)
        setShowSignatureAdded(true)
        setTimeout(() => setShowSignatureAdded(false), 3000)
      }
    }

    window.addEventListener('addSignature', handleAddSignature as EventListener)
    
    return () => {
      window.removeEventListener('addSignature', handleAddSignature as EventListener)
    }
  }, [addSignature, previewType])

  // 크기 조절 핸들러
  useEffect(() => {
    if (!resizeInfo) return;
    let lastW = resizeInfo.startW;
    let lastH = resizeInfo.startH;
    const onMove = (e: MouseEvent) => {
      const newW = Math.max(40, resizeInfo.startW + (e.clientX - resizeInfo.startX));
      const newH = Math.max(20, resizeInfo.startH + (e.clientY - resizeInfo.startY));
      lastW = newW;
      lastH = newH;
      if (animationFrameRef.current === null) {
        animationFrameRef.current = requestAnimationFrame(() => {
          setSignatures(prev => prev.map(sig =>
            sig.id === resizeInfo.id
              ? { ...sig, width: lastW, height: lastH }
              : sig
          ));
          animationFrameRef.current = null;
        });
      }
    };
    const onUp = () => setResizeInfo(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [resizeInfo]);
  
  // 서명 드래그 애니메이션
  useEffect(() => {
    if (!draggedSignatureId) return;
    const onMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const newX = e.clientX - containerRect.left - dragOffset.x;
      const newY = e.clientY - containerRect.top - dragOffset.y;
      dragPosRef.current = { x: newX, y: newY };
      if (dragFrameRef.current === null) {
        dragFrameRef.current = requestAnimationFrame(() => {
          if (dragPosRef.current) {
            const { x, y } = dragPosRef.current;
            const maxX = containerRect.width - 120;
            const maxY = containerRect.height - 60;
            setSignatures(prev => prev.map(sig =>
              sig.id === draggedSignatureId
                ? {
                    ...sig,
                    x: Math.max(0, Math.min(x, maxX)),
                    y: Math.max(0, Math.min(y, maxY))
                  }
                : sig
            ));
          }
          dragFrameRef.current = null;
        });
      }
    };
    const onUp = () => handleSignatureMouseUp();
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      if (dragFrameRef.current) {
        cancelAnimationFrame(dragFrameRef.current);
        dragFrameRef.current = null;
      }
    };
  }, [draggedSignatureId, dragOffset, handleSignatureMouseUp, containerRef]);

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-8">
        <div className="neon-box-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold neon-text-white-weak mb-4">
            문서 서명 페이지
          </h1>
          <p className="text-gray-600 mb-4">
            <span className="neon-text-white">문서 ID :</span> <span className="font-mono bg-transparent px-2 py-1 rounded neon-text-white">{doc_filename}</span>
          </p>
          {document && (
            <p className="text-gray-600 mb-4">
              <span className="neon-text-white">원본 파일명 :</span> <span className="font-mono bg-transparent px-2 py-1 rounded neon-text-white">
                {document.original_filename.length > 50 
                  ? document.original_filename.substring(0, 50) + '...' 
                  : document.original_filename
                }
              </span>
            </p>
          )}
            
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 좌측: PDF 뷰어 */}
            <div className="bg-transparent neon-box-white rounded-lg p-4 min-h-[400px] flex items-center justify-center">
              {loading && (
                <div className="text-blue-600 text-center">
                  미리보기 준비 중...
                </div>
              )}

              {showSignatureAdded && (
                <motion.div 
                  initial={{ opacity: 0, x: 100 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 100 }}
                  className="fixed top-20 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-all duration-300 transform translate-x-0 flex items-center space-x-2"
                >
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  <span>서명이 추가되었습니다! 드래그하여 위치를 조정하세요.</span>
                </motion.div>
              )}

              {/* PDF 미리보기 */}
              {previewType === "pdf" && (
                <div className="flex flex-col items-center space-y-4">
                  <div className="flex items-center space-x-4">
                    {/* 왼쪽 페이지 버튼 */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="w-12 h-12 p-0 neon-btn-white rounded-full shadow-lg border border-white/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-6 h-6 text-white" />
                    </Button>

                    {/* PDF 미리보기 영역 */}
                    <div className="relative">
                      <div
                        ref={containerRef}
                        className="w-[500px] h-[700px] border rounded shadow overflow-hidden relative bg-white"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        style={{ cursor: zoomState.scale > 1 ? (isPanningRef.current ? 'grabbing' : 'grab') : 'default' }}
                      >
                        <canvas 
                          ref={canvasRef} 
                          className="absolute top-0 left-0 w-full h-full"
                        />
                        
                        {/* 서명 이미지 오버레이 */}
                        {signatures.map(signature => (
                          <div
                            key={signature.id}
                            className={`absolute cursor-move border-2 transition-all duration-200 group ${
                              signature.isDragging 
                                ? 'border-blue-600 bg-blue-50/30 shadow-lg' 
                                : 'border-blue-400 bg-white/10 hover:bg-white/20'
                            }`}
                            style={{
                              left: signature.x,
                              top: signature.y,
                              width: signature.width,
                              height: signature.height,
                              zIndex: signature.isDragging ? 1000 : 100,
                              transform: signature.isDragging ? 'scale(1.05)' : 'scale(1)',
                              boxShadow: signature.isDragging ? '0 4px 12px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.2)'
                            }}
                            draggable={false}
                            onMouseDown={e => {
                              e.preventDefault();
                              handleSignatureMouseDown(e, signature.id);
                            }}
                            onDragStart={e => e.preventDefault()}
                          >
                            <img
                              src={signature.dataUrl}
                              alt="서명"
                              className="w-full h-full object-contain pointer-events-none"
                              draggable={false}
                            />
                            {/* 삭제 버튼 */}
                            <button
                              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors duration-200 opacity-0 group-hover:opacity-100"
                              onClick={(e) => {
                                e.stopPropagation()
                                removeSignature(signature.id)
                              }}
                            >
                              <X className="w-3 h-3" />
                            </button>
                            {/* 크기 조절 핸들 */}
                            <div
                              className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 cursor-se-resize rounded-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                              onMouseDown={e => {
                                e.stopPropagation();
                                setResizeInfo({
                                  id: signature.id,
                                  startX: e.clientX,
                                  startY: e.clientY,
                                  startW: signature.width,
                                  startH: signature.height
                                });
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 오른쪽 페이지 버튼 */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(pdfPageCount, p + 1))}
                      disabled={currentPage === pdfPageCount}
                      className="w-12 h-12 p-0 neon-btn-white rounded-full shadow-lg border border-white/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-6 h-6 text-white" />
                    </Button>
                  </div>

                  {/* 확대/축소 컨트롤 및 페이지 정보 */}
                  <div className="flex justify-center items-center gap-4">
                    <div className="flex items-center space-x-2 neon-box-white p-3 rounded-2xl shadow-xl border border-white/20">
                      <div className="flex items-center space-x-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          disabled={isRenderingRef.current} 
                          onClick={() => {
                            if (containerRef.current && !isRenderingRef.current) {
                              const rect = containerRef.current.getBoundingClientRect()
                              handleZoomWithCenter(-0.1, rect.width / 2, rect.height / 2)
                            }
                          }}
                          className="w-8 h-8 p-0 neon-btn-white rounded-xl transition-all duration-200"
                        >
                          <Minus className="w-4 h-4 text-white" />
                        </Button>
                        <div className="w-16 h-8 neon-box-white rounded-xl flex items-center justify-center border border-gray-200">
                          <span className="text-sm font-medium neon-text-white-weaker">
                            {Math.round(zoomState.scale * 100)}%
                          </span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          disabled={isRenderingRef.current} 
                          onClick={() => {
                            if (containerRef.current && !isRenderingRef.current) {
                              const rect = containerRef.current.getBoundingClientRect()
                              handleZoomWithCenter(0.1, rect.width / 2, rect.height / 2)
                            }
                          }}
                          className="w-8 h-8 p-0 neon-btn-white rounded-xl transition-all duration-200"
                        >
                          <Plus className="w-4 h-4 text-white" />
                        </Button>
                      </div>
                      <div className="w-px h-6 bg-gray-200"></div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        disabled={isRenderingRef.current} 
                        onClick={() => {
                          setZoomState({ scale: 1 })
                          setPanState({ x: 0, y: 0 })
                        }}
                        className="w-8 h-8 p-0 neon-btn-white rounded-xl transition-all duration-200"
                        title="리셋"
                      >
                        <RotateCw className="w-4 h-4 text-white" />
                      </Button>
                    </div>

                    {/* 페이지 정보 */}
                    <div className="neon-box-white px-4 py-2 rounded-full shadow-lg border border-white/20">
                      <span className="text-sm font-medium neon-text-white">
                        {currentPage} / {pdfPageCount}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 미지원 파일 안내 */}
              {previewType === "unsupported" && (
                <div className="text-gray-600 text-center">이 파일 형식은 미리보기를 지원하지 않습니다.<br/>문서 파일은 PDF로 변환 후 업로드 해주세요.</div>
              )}

              {/* 에러 메시지 */}
              {errorMsg && (
                <div className="text-red-500 text-center">{errorMsg}</div>
              )}
            </div>

            {/* 우측: 그룹원(서명자) 목록 */}
            <div className="neon-box-white rounded-xl shadow-lg p-6 min-h-[400px] border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold neon-text-white">그룹원 목록</h2>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">총 {signers.length}명</span>
                </div>
              </div>
              
              {/* 주의사항 */}
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium text-yellow-800">주의사항</span>
                </div>
                <p className="text-sm text-yellow-700 mt-2">
                  다른 사람의 체크박스를 누르지 않도록 주의하세요!
                </p>
              </div>
              
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <span className="ml-3 text-gray-600">불러오는 중...</span>
                </div>
              )}
              
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}
              
              {!loading && !error && (
                <div className="space-y-3">
                  {signers.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <p className="text-gray-500 text-sm">서명자가 없습니다</p>
                    </div>
                  ) : (
                    signers.map((signer) => (
                      <motion.div
                        key={signer.signer_id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="group relative neon-box-white bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all duration-300 hover:border-blue-200"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3 flex-1">
                            {/* 아바타 */}
                            <div className="relative">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-lg">
                                {signer.name.charAt(0).toUpperCase()}
                              </div>
                              {signedStatus[signer.signer_id] && (
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow-sm">
                                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            
                            {/* 정보 */}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold neon-text-white-weaker truncate">{signer.name}</h3>
                              <p className="text-sm neon-text-white-weaker truncate">{signer.email}</p>
                            </div>
                          </div>
                          
                          {/* 체크박스 */}
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center">
                              <button
                                onClick={() => {
                                  if (!signedStatus[signer.signer_id]) {
                                    setConfirmModal({ open: true, signerId: signer.signer_id });
                                  }
                                }}
                                disabled={signedStatus[signer.signer_id]}
                                className={`relative w-6 h-6 rounded-lg border-2 transition-all duration-300 flex items-center justify-center ${
                                  signedStatus[signer.signer_id]
                                    ? 'bg-green-500 border-green-500'
                                    : 'bg-white border-gray-300 hover:border-blue-400 hover:shadow-md'
                                } group-hover:scale-110`}
                                style={
                                  signedStatus[signer.signer_id]
                                    ? { boxShadow: '0 0 20px 8px #22c55e' }
                                    : undefined
                                }
                              >
                                {signedStatus[signer.signer_id] && (
                                  <motion.svg
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ duration: 0.2 }}
                                    className="w-4 h-4 text-white"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </motion.svg>
                                )}
                              </button>
                            </div>
                            
                            {/* 상태 표시 */}
                            <div className="flex items-center space-x-2">
                              <div className={`w-2 h-2 rounded-full ${
                                signedStatus[signer.signer_id] 
                                  ? 'bg-green-500 animate-pulse' 
                                  : 'bg-yellow-400'
                              }`}></div>
                              <span className={`text-xs font-medium ${
                                signedStatus[signer.signer_id] 
                                  ? 'text-green-600' 
                                  : 'text-yellow-600'
                              }`}>
                                {signedStatus[signer.signer_id] ? '서명완료' : '대기중'}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* 호버 효과 */}
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-50/0 to-blue-50/0 group-hover:from-blue-50/30 group-hover:to-purple-50/30 rounded-xl transition-all duration-300 pointer-events-none"></div>
                      </motion.div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {confirmModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
            <h2 className="text-lg font-bold text-black mb-4">서명 확정</h2>
            <p className="mb-6 text-gray-700">서명을 확정하면 다시 취소할 수 없습니다.<br/>진행하시겠습니까?</p>
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-800"
                onClick={() => setConfirmModal({ open: false, signerId: null })}
              >
                취소
              </button>
              <button
                className="px-4 py-2 rounded neon-btn-white"
                onClick={async () => {
                  if (confirmModal.signerId) {
                    await toggleSignedStatus(confirmModal.signerId);
                  }
                  setConfirmModal({ open: false, signerId: null });
                }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 