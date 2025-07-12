"use client"

// DropFileZone: 이미지, PDF 파일만 업로드/미리보기 지원, PDF는 페이지 넘기기 기능 포함
// 확대/축소 및 패닝 기능 추가
// 서명 이미지 추가 및 드래그 앤 드롭 기능 추가

import type React from "react"
import { useState, useRef, useCallback, useEffect } from "react"
import { Upload, ZoomIn, ZoomOut, RotateCcw, Move, Minus, Plus, RotateCw, ChevronLeft, ChevronRight, X } from "lucide-react"
import { Button } from "@/components/ui/button"

// 업로드할 파일 모델 객체 타입
interface UploadedFile {
  name: string
  size: number
  type: string
  file: File
}

// 줌 상태 타입
interface ZoomState {
  scale: number
}

// 패닝 상태 타입
interface PanState {
  x: number
  y: number
}

  // 서명 이미지 타입
  interface SignatureImage {
    id: string
    dataUrl: string
    x: number
    y: number
    width: number
    height: number
    isDragging: boolean
    isResizing: boolean
  }

export default function FileDropZone() {
  // 드래그 오버 상태
  const [isDragOver, setIsDragOver] = useState(false)
  // 업로드된 파일 정보 (1개만)
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null)
  // 미리보기 타입: 이미지, PDF, 미지원
  const [previewType, setPreviewType] = useState<"image" | "pdf" | "unsupported" | null>(null)
  // 로딩 상태
  const [loading, setLoading] = useState(false)
  // 에러 메시지
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  // PDF 미리보기용 canvas ref
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // PDF 페이지 넘기기 관련 상태
  const [currentPage, setCurrentPage] = useState(1)
  const [pdfPageCount, setPdfPageCount] = useState(1)
  // pdf.js 문서 객체 저장용 ref
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
  
  // 패닝 관련 ref들
  const isPanningRef = useRef(false)
  const lastMousePosRef = useRef({ x: 0, y: 0 })
  
  // PDF 렌더링 중복 방지를 위한 ref
  const isRenderingRef = useRef(false)
  
  // 컨테이너 ref (패닝을 위한)
  const containerRef = useRef<HTMLDivElement>(null)

  // 서명 이미지 상태
  const [signatures, setSignatures] = useState<SignatureImage[]>([])
  const [draggedSignatureId, setDraggedSignatureId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [showSignatureAdded, setShowSignatureAdded] = useState(false)
  // 크기 조절 상태
  const [resizeInfo, setResizeInfo] = useState<{
    id: string,
    startX: number,
    startY: number,
    startW: number,
    startH: number
  } | null>(null)

  // 서명 이미지 추가 함수
  const addSignature = useCallback((dataUrl: string) => {
    // 기존 서명들과 겹치지 않는 위치 계산
    const baseX = 200
    const baseY = 300
    const maxOffset = 150 // 최대 오프셋 제한
    const offset = Math.min(signatures.length * 30, maxOffset) // 각 서명마다 30px씩 오프셋, 최대 150px
    
    const newSignature: SignatureImage = {
      id: `sig-${Date.now()}`,
      dataUrl,
      x: baseX + offset,
      y: baseY + offset,
      width: 120, // 기본 크기 (더 작게)
      height: 60,
      isDragging: false,
      isResizing: false
    }
    setSignatures(prev => [...prev, newSignature])
  }, [signatures.length])

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

    // 경계 체크 (PDF 영역 내에서만 이동 가능)
    const maxX = containerRect.width - 120 // 서명 최소 너비
    const maxY = containerRect.height - 60  // 서명 최소 높이

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
    // 서명 드래그 처리
    handleSignatureMouseMove(e)
  }, [zoomState.scale, handleSignatureMouseMove])

  // 패닝 종료 핸들러
  const handleMouseUp = useCallback(() => {
    isPanningRef.current = false
    handleSignatureMouseUp()
  }, [handleSignatureMouseUp])

  // 줌 인/아웃 함수 (중심점 기준)
  const handleZoomWithCenter = useCallback((delta: number, centerX: number, centerY: number) => {
    setZoomState(prev => {
      const newScale = Math.max(1.0, Math.min(5, prev.scale + delta))
      console.log('줌 변경:', prev.scale, '+', delta, '=', newScale)
      return { scale: newScale }
    })
    // 줌이 1로 되면 패닝 상태 리셋
    if (zoomState.scale + delta <= 1) {
      setPanState({ x: 0, y: 0 })
    }
  }, [zoomState.scale])

  // 기존 줌 함수 (버튼용)
  const handleZoom = useCallback((delta: number) => {
    setZoomState(prev => {
      const newScale = Math.max(1.0, Math.min(5, prev.scale + delta))
      return { ...prev, scale: newScale }
    })
    // 줌이 1로 되면 패닝 상태 리셋
    if (zoomState.scale + delta <= 1) {
      setPanState({ x: 0, y: 0 })
    }
  }, [zoomState.scale])

  // 파일 타입 판별 및 상태 저장
  const handleFile = useCallback((file: File) => {
    console.log('업로드 파일:', file, '타입:', file.type);
    const type = file.type
    // 파일 타입 이미지 or pdf만 허용, 나머지는 업로드 불가능.
    if (type.startsWith("image/")) {
      setPreviewType("image")
      setErrorMsg(null)
    } else if (type === "application/pdf") {
      setPreviewType("pdf")
      setErrorMsg(null)
    } else {
      setPreviewType(null)
      setErrorMsg("이미지(JPG, PNG) 또는 PDF 파일만 업로드할 수 있습니다.")
      setUploadedFile(null)
      return
    }
    // 업로드 파일 정보 저장
    setUploadedFile({
      name: file.name,
      size: file.size,
      type: file.type,
      file: file,
    })
    // 파일 변경 시 줌 상태 리셋
    setZoomState({ scale: 1 })
    // 파일 변경 시 패닝 상태 리셋
    setPanState({ x: 0, y: 0 })
  }, [])

  // 드래그 오버 핸들러
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  // 드래그 리브 핸들러
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  // 드롭 핸들러 (드래그앤드롭 업로드)
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFile(files[0])
    }
  }, [handleFile])

  // 파일 선택 핸들러 (input[type=file])
  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      handleFile(files[0])
    }
  }, [handleFile])

  // 이미지 미리보기 (canvas에 그림)
  useEffect(() => {
    if (previewType === "image" && uploadedFile && canvasRef.current) {
      const img = new window.Image()
      setLoading(true)
      img.onload = () => {
        // 고정 캔버스 크기
        const canvasWidth = 600
        const canvasHeight = 800
        canvasRef.current!.width = canvasWidth
        canvasRef.current!.height = canvasHeight

        // 이미지 비율 계산 (확대/축소 반영)
        const baseScale = Math.min(canvasWidth / img.width, canvasHeight / img.height, 1)
        const scale = baseScale * zoomState.scale
        const drawWidth = img.width * scale
        const drawHeight = img.height * scale
        const offsetX = (canvasWidth - drawWidth) / 2 + panState.x
        const offsetY = (canvasHeight - drawHeight) / 2 + panState.y

        const ctx = canvasRef.current!.getContext("2d")
        if (!ctx) return setLoading(false)
        ctx.clearRect(0, 0, canvasWidth, canvasHeight)
        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight)
        setLoading(false)
      }
      img.onerror = () => setLoading(false)
      img.src = URL.createObjectURL(uploadedFile.file)
              return () => URL.revokeObjectURL(img.src)
      }
    }, [
      previewType,
      uploadedFile?.name,
      uploadedFile?.size,
      uploadedFile?.type,
      zoomState.scale,
      panState.x,
      panState.y
    ])

  // PDF 파일 업로드 시 문서 객체 생성 및 전체 페이지 수 저장
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
        // pdf.js 동적 import 및 워커 경로 지정
        // @ts-ignore
        const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
        const typedarray = new Uint8Array(this.result as ArrayBuffer);
        try {
          // PDF 문서 객체 생성
          const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
          pdfDocRef.current = pdf;
          setPdfPageCount(pdf.numPages);
          // 현재 페이지가 유효하지 않으면 1페이지로 설정
          setCurrentPage(prev => prev > pdf.numPages ? 1 : prev);

          // 현재 페이지 렌더링
          if (canvasRef.current) {
            const pageToRender = currentPage > pdf.numPages ? 1 : currentPage;
            const page = await pdf.getPage(pageToRender);
            const canvasWidth = 800;
            const canvasHeight = 1000;
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
        setLoading(true);
        try {
          const page = await pdfDocRef.current.getPage(currentPage);
          const canvasWidth = 800;
          const canvasHeight = 1000;
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
    // signatures 의존성 제거
  ])

  // 파일 제거 핸들러
  const removeFile = useCallback(() => {
    setUploadedFile(null)
    setPreviewType(null)
    setErrorMsg(null)
    setCurrentPage(1)
    setPdfPageCount(1)
    pdfDocRef.current = null
    isRenderingRef.current = false
    setZoomState({ scale: 1 })
    setPanState({ x: 0, y: 0 })
    // 서명도 함께 제거
    setSignatures([])
  }, [])

  // 서명 추가 이벤트 리스너
  useEffect(() => {
    const handleAddSignature = (event: CustomEvent) => {
      if (previewType === "pdf") {
        addSignature(event.detail)
        // 서명이 추가되었음을 사용자에게 알림
        setShowSignatureAdded(true)
        setTimeout(() => setShowSignatureAdded(false), 3000) // 3초 후 자동 숨김
      }
    }

    window.addEventListener('addSignature', handleAddSignature as EventListener)
    
    return () => {
      window.removeEventListener('addSignature', handleAddSignature as EventListener)
    }
  }, [addSignature, previewType])

  const animationFrameRef = useRef<number | null>(null);
  const dragFrameRef = useRef<number | null>(null);
  const dragPosRef = useRef<{ x: number; y: number } | null>(null);

  // 크기 조절 핸들러 (window mousemove/mouseup)
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
    <div className="w-full max-w-4xl mx-auto">
      {/* Drop Zone (파일 업로드 영역) */}
      {!uploadedFile && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
            ${isDragOver ? "border-blue-500 bg-blue-50 scale-105" : "border-gray-300 hover:border-gray-400"}
          `}
        >
          <div className="flex flex-col items-center space-y-4">
            <div
              className={`
              w-16 h-16 rounded-full flex items-center justify-center transition-colors
              ${isDragOver ? "bg-blue-100" : "bg-gray-100"}
            `}
            >
              <Upload className={`w-8 h-8 ${isDragOver ? "text-blue-600" : "text-gray-500"}`} />
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">이미지 또는 PDF 파일을 여기에 드래그하세요</h3>
              <p className="text-gray-600 mb-4">또는 클릭해서 파일을 선택하세요</p>
            </div>

            {/* 파일 선택 input */}
            <input type="file" accept="image/*,application/pdf" onChange={handleFileInput} className="sr-only" id="file-input" />
            <Button variant="outline" className="cursor-pointer bg-transparent" asChild>
              <label htmlFor="file-input">
                파일 선택
              </label>
            </Button>
            <p className="text-sm text-gray-500 mt-4">PDF, JPG, PNG 파일만 지원합니다</p>
            <p className="text-xs text-gray-400 mt-2">업로드 후 버튼으로 확대/축소, 더블클릭으로 리셋</p>
            {errorMsg && <div className="text-red-500 mt-2">{errorMsg}</div>}
          </div>
        </div>
      )}

      {/* 미리보기 영역 */}
      {uploadedFile && (
        <div className="mt-6 flex flex-col items-center">
          <div className="flex w-full justify-between items-center mb-4">
            <div className="flex-1 min-w-0 mr-4">
              <span className="font-semibold text-gray-900 truncate block">{uploadedFile.name}</span>
              <span className="text-sm text-gray-500 truncate block">({uploadedFile.type || "알 수 없는 형식"})</span>
            </div>
            <Button variant="outline" onClick={removeFile} className="flex-shrink-0">파일 제거</Button>
          </div>
          {loading && <div className="text-blue-600 mb-4">미리보기 준비 중...</div>}
          {showSignatureAdded && (
            <div className="fixed top-20 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-all duration-300 transform translate-x-0 flex items-center space-x-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span>서명이 추가되었습니다! 드래그하여 위치를 조정하세요.</span>
            </div>
          )}
          {/* 이미지 미리보기 */}
          {previewType === "image" && (
            <div
              ref={containerRef}
              className="relative w-[600px] h-[800px] border rounded shadow overflow-hidden"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{ cursor: zoomState.scale > 1 ? (isPanningRef.current ? 'grabbing' : 'grab') : 'default' }}
            >
              <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full"
                style={{}}
              />
                             <div className="absolute bottom-4 left-4 flex items-center space-x-2 bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-white/20">
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
                      className="w-8 h-8 p-0 hover:bg-gray-100 rounded-xl transition-all duration-200"
                    >
                      <Minus className="w-4 h-4 text-gray-600" />
                    </Button>
                    <div className="w-16 h-8 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-200">
                      <span className="text-sm font-medium text-gray-700">
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
                      className="w-8 h-8 p-0 hover:bg-gray-100 rounded-xl transition-all duration-200"
                    >
                      <Plus className="w-4 h-4 text-gray-600" />
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
                    className="w-8 h-8 p-0 hover:bg-gray-100 rounded-xl transition-all duration-200"
                    title="리셋"
                  >
                    <RotateCw className="w-4 h-4 text-gray-600" />
                  </Button>
                </div>
            </div>
          )}
          {/* PDF 미리보기 + 페이지 넘기기 */}
          {previewType === "pdf" && (
            <>
              <div className="flex items-center space-x-4">
                {/* 왼쪽 페이지 버튼 */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-12 h-12 p-0 bg-white/90 backdrop-blur-md hover:bg-white/95 rounded-full shadow-lg border border-white/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-6 h-6 text-gray-700" />
                </Button>

                {/* PDF 미리보기 영역 */}
                <div className="relative">
                  <div
                    ref={containerRef}
                    className="w-[600px] h-[800px] border rounded shadow overflow-hidden relative"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    style={{ cursor: zoomState.scale > 1 ? (isPanningRef.current ? 'grabbing' : 'grab') : 'default' }}
                  >
                    <canvas 
                      ref={canvasRef} 
                      className="absolute top-0 left-0 w-full h-full"
                      style={{}}
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
                  className="w-12 h-12 p-0 bg-white/90 backdrop-blur-md hover:bg-white/95 rounded-full shadow-lg border border-white/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-6 h-6 text-gray-700" />
                </Button>
              </div>

              {/* 확대/축소 컨트롤 - PDF 영역 밖 왼쪽 아래 */}
              <div className="flex justify-center items-center mt-4 gap-4">
                <div className="flex items-center space-x-2 bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-white/20">
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
                      className="w-8 h-8 p-0 hover:bg-gray-100 rounded-xl transition-all duration-200"
                    >
                      <Minus className="w-4 h-4 text-gray-600" />
                    </Button>
                    <div className="w-16 h-8 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-200">
                      <span className="text-sm font-medium text-gray-700">
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
                      className="w-8 h-8 p-0 hover:bg-gray-100 rounded-xl transition-all duration-200"
                    >
                      <Plus className="w-4 h-4 text-gray-600" />
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
                    className="w-8 h-8 p-0 hover:bg-gray-100 rounded-xl transition-all duration-200"
                    title="리셋"
                  >
                    <RotateCw className="w-4 h-4 text-gray-600" />
                  </Button>
                </div>

                {/* 페이지 정보 - 오른쪽 */}
                <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-white/20">
                  <span className="text-sm font-medium text-gray-700">
                    {currentPage} / {pdfPageCount}
                  </span>
                </div>
              </div>
            </>
          )}
          {/* 미지원 파일 안내 */}
          {previewType === "unsupported" && (
            <div className="text-red-500">이 파일 형식은 미리보기를 지원하지 않습니다.<br/>문서 파일은 PDF로 변환 후 업로드 해주세요.</div>
          )}
        </div>
      )}
    </div>
  )
}
