"use client"

// DropFileZone: 이미지, PDF 파일만 업로드/미리보기 지원, PDF는 페이지 넘기기 기능 포함

import type React from "react"
import { useState, useRef, useCallback, useEffect } from "react"
import { Upload } from "lucide-react"
import { Button } from "@/components/ui/button"

// 업로드할 파일 모델 객체 타입
interface UploadedFile {
  name: string
  size: number
  type: string
  file: File
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
      const ctx = canvasRef.current.getContext("2d")
      if (!ctx) return
      const img = new window.Image()
      setLoading(true)
      img.onload = () => {
        canvasRef.current!.width = img.width
        canvasRef.current!.height = img.height
        ctx.clearRect(0, 0, img.width, img.height)
        ctx.drawImage(img, 0, 0)
        setLoading(false)
      }
      img.onerror = () => setLoading(false)
      img.src = URL.createObjectURL(uploadedFile.file)
      return () => URL.revokeObjectURL(img.src)
    }
  }, [previewType, uploadedFile])

  // PDF 파일 업로드 시 문서 객체 생성 및 전체 페이지 수 저장
  useEffect(() => {
    if (
      previewType === "pdf" &&
      uploadedFile &&
      canvasRef.current &&
      typeof window !== "undefined"
    ) {
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
            const scale = Math.min(600 / page.getViewport({ scale: 1 }).width, 1.5);
            const viewport = page.getViewport({ scale });
            const canvas = canvasRef.current;
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext("2d");
            await page.render({ canvasContext: ctx, viewport }).promise;
          }
          
        } catch (e) {
          console.error("PDF 미리보기 에러:", e);
          setPreviewType("unsupported");
        }
        setLoading(false);
      };
      fileReader.readAsArrayBuffer(uploadedFile.file);
    }
    // eslint-disable-next-line
  }, [previewType, uploadedFile]);

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
        setLoading(true);
        try {
          // 현재 페이지 객체 가져오기
          const page = await pdfDocRef.current.getPage(currentPage);
          // 최대 가로 600px로 리사이즈
          const scale = Math.min(600 / page.getViewport({ scale: 1 }).width, 1.5);
          const viewport = page.getViewport({ scale });
          const canvas = canvasRef.current;
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d");
          // 페이지를 canvas에 렌더링
          await page.render({ canvasContext: ctx, viewport }).promise;
        } catch (e) {
          console.error("PDF 페이지 렌더링 에러:", e);
          setPreviewType("unsupported");
        }
        setLoading(false);
      }
    };
    renderPage();
    // eslint-disable-next-line
  }, [currentPage, previewType, uploadedFile]);

  // 파일 제거 핸들러
  const removeFile = useCallback(() => {
    setUploadedFile(null)
    setPreviewType(null)
    setErrorMsg(null)
    setCurrentPage(1)
    setPdfPageCount(1)
    pdfDocRef.current = null
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
          {previewType === "image" && <canvas ref={canvasRef} className="border rounded shadow" />}
          {/* PDF 미리보기 + 페이지 넘기기 */}
          {previewType === "pdf" && (
            <>
              <canvas ref={canvasRef} className="border rounded shadow" style={{ maxWidth: 600, width: "100%", height: "auto" }} />
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
