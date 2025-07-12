"use client"

// DropFileZone: 이미지, PDF 파일만 업로드/미리보기 지원, PDF는 페이지 넘기기 기능 포함
// 확대/축소 및 패닝 기능 추가

import type React from "react"
import { useState, useRef, useCallback, useEffect } from "react"
import { Upload, ZoomIn, ZoomOut, RotateCcw, Move } from "lucide-react"
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
  
  // PDF 렌더링 중복 방지를 위한 ref
  const isRenderingRef = useRef(false)
  
  // 컨테이너 ref (패닝을 위한)
  const containerRef = useRef<HTMLDivElement>(null)

  // 줌 인/아웃 함수 (중심점 기준)
  const handleZoomWithCenter = useCallback((delta: number, centerX: number, centerY: number) => {
    setZoomState(prev => {
      const newScale = Math.max(1.0, Math.min(5, prev.scale + delta))
      console.log('줌 변경:', prev.scale, '+', delta, '=', newScale)
      return { scale: newScale }
    })
  }, [])

  // 기존 줌 함수 (버튼용)
  const handleZoom = useCallback((delta: number) => {
    setZoomState(prev => {
      const newScale = Math.max(1.0, Math.min(5, prev.scale + delta))
      return { ...prev, scale: newScale }
    })
  }, [])

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
        const offsetX = (canvasWidth - drawWidth) / 2
        const offsetY = (canvasHeight - drawHeight) / 2

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
      uploadedFile ? uploadedFile.name : '',
      uploadedFile ? uploadedFile.size : 0,
      uploadedFile ? uploadedFile.type : '',
      zoomState.scale
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
          setCurrentPage(1); // 첫 페이지로 초기화

          // 첫 페이지 강제 렌더링
          if (canvasRef.current) {
            const page = await pdf.getPage(1);
            const canvasWidth = 600;
            const canvasHeight = 800;
            const originalViewport = page.getViewport({ scale: 1 });
            const baseScale = Math.min(canvasWidth / originalViewport.width, canvasHeight / originalViewport.height, 1.5)
            const scale = baseScale * zoomState.scale;
            const viewport = page.getViewport({ scale });
            const offsetX = (canvasWidth - viewport.width) / 2;
            const offsetY = (canvasHeight - viewport.height) / 2;
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
    uploadedFile ? uploadedFile.name : '',
    uploadedFile ? uploadedFile.size : 0,
    uploadedFile ? uploadedFile.type : '',
    zoomState.scale
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
          const canvasWidth = 600;
          const canvasHeight = 800;
          const originalViewport = page.getViewport({ scale: 1 });
          const baseScale = Math.min(canvasWidth / originalViewport.width, canvasHeight / originalViewport.height, 1.5)
          const scale = baseScale * zoomState.scale;
          const viewport = page.getViewport({ scale });
          const offsetX = (canvasWidth - viewport.width) / 2;
          const offsetY = (canvasHeight - viewport.height) / 2;
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
    uploadedFile ? uploadedFile.name : '',
    uploadedFile ? uploadedFile.size : 0,
    uploadedFile ? uploadedFile.type : '',
    zoomState.scale
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
  }, [])

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
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
            <div>
              <span className="font-semibold text-gray-900">{uploadedFile.name}</span>
              <span className="ml-2 text-sm text-gray-500">({uploadedFile.type || "알 수 없는 형식"})</span>
            </div>
            <Button variant="outline" onClick={removeFile}>파일 제거</Button>
          </div>
          {loading && <div className="text-blue-600 mb-4">미리보기 준비 중...</div>}
          {/* 이미지 미리보기 */}
          {previewType === "image" && (
            <div
              ref={containerRef}
              className="relative w-[600px] h-[800px] border rounded shadow overflow-hidden"
            >
              <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full"
                style={{}}
              />
                             <div className="absolute bottom-4 left-4 flex space-x-1 bg-white/80 backdrop-blur-sm p-2 rounded-lg shadow-lg">
                 <Button variant="outline" size="sm" disabled={isRenderingRef.current} onClick={() => {
                   if (containerRef.current && !isRenderingRef.current) {
                     const rect = containerRef.current.getBoundingClientRect()
                     handleZoomWithCenter(-0.1, rect.width / 2, rect.height / 2)
                   }
                 }}>
                   <ZoomOut className="w-4 h-4" />
                 </Button>
                 <Button variant="outline" size="sm" disabled={isRenderingRef.current} onClick={() => {
                   if (containerRef.current && !isRenderingRef.current) {
                     const rect = containerRef.current.getBoundingClientRect()
                     handleZoomWithCenter(0.1, rect.width / 2, rect.height / 2)
                   }
                 }}>
                   <ZoomIn className="w-4 h-4" />
                 </Button>
                 <Button variant="outline" size="sm" disabled={isRenderingRef.current} onClick={() => setZoomState({ scale: 1 })}>
                   <RotateCcw className="w-4 h-4" />
                 </Button>
                 <span className="text-sm text-gray-700 bg-white px-2 py-1 rounded border">
                   {Math.round(zoomState.scale * 100)}%
                 </span>
               </div>
            </div>
          )}
          {/* PDF 미리보기 + 페이지 넘기기 */}
          {previewType === "pdf" && (
            <>
              <div
                ref={containerRef}
                className="relative w-[600px] h-[800px] border rounded shadow overflow-hidden"
              >
                <canvas 
                  ref={canvasRef} 
                  className="absolute top-0 left-0 w-full h-full"
                  style={{}}
                />
                <div className="absolute bottom-4 left-4 flex space-x-1 bg-white/80 backdrop-blur-sm p-2 rounded-lg shadow-lg">
                  <Button variant="outline" size="sm" disabled={isRenderingRef.current} onClick={() => {
                    if (containerRef.current && !isRenderingRef.current) {
                      const rect = containerRef.current.getBoundingClientRect()
                      handleZoomWithCenter(-0.1, rect.width / 2, rect.height / 2)
                    }
                  }}>
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" disabled={isRenderingRef.current} onClick={() => {
                    if (containerRef.current && !isRenderingRef.current) {
                      const rect = containerRef.current.getBoundingClientRect()
                      handleZoomWithCenter(0.1, rect.width / 2, rect.height / 2)
                    }
                  }}>
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" disabled={isRenderingRef.current} onClick={() => setZoomState({ scale: 1 })}>
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-gray-700 bg-white px-2 py-1 rounded border">
                    {Math.round(zoomState.scale * 100)}%
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-2 mt-4">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>이전</Button>
                <span className="text-sm text-gray-700">{currentPage} / {pdfPageCount}</span>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(pdfPageCount, p + 1))} disabled={currentPage === pdfPageCount}>다음</Button>
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
