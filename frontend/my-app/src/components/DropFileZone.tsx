"use client"

// DropFileZone: 이미지, PDF 파일만 업로드/미리보기 지원, PDF는 페이지 넘기기 기능 포함
// 확대/축소 및 패닝 기능 추가
// 서명 이미지 추가 및 드래그 앤 드롭 기능 추가
// Framer Motion 애니메이션 추가

import type React from "react"
import { useState, useRef, useCallback, useEffect } from "react"
import { Upload, Minus, Plus, RotateCw, ChevronLeft, ChevronRight, X, UserPlus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import { UploadedFile, ZoomState, PanState, SignatureImage, SignerMember, ResizeInfo, PreviewType } from "@/types/fileUpload"
import { uploadPdfWithSigners } from "@/services/upload";

export default function FileDropZone() {
  // 드래그 오버 상태
  const [isDragOver, setIsDragOver] = useState(false)
  // 업로드된 파일 정보 (1개만)
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null)
  // 미리보기 타입: 이미지, PDF, 미지원
  const [previewType, setPreviewType] = useState<PreviewType>(null)
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
  
  // 패닝 상태 (마우스 드래그로 pdf 이동시키는 역할)
  const [panState, setPanState] = useState<PanState>({
    x: 0,
    y: 0
  })
  
  // 패닝 상태 추적 Ref
  const isPanningRef = useRef(false)
  // 마우스 위치 상태 Ref
  const lastMousePosRef = useRef({ x: 0, y: 0 })
  
  // PDF 렌더링 중복 방지를 위한 ref
  const isRenderingRef = useRef(false)
  
  // 컨테이너 ref (패닝을 위한)
  const containerRef = useRef<HTMLDivElement>(null)

  // 서명 이미지 상태
  const [signatures, setSignatures] = useState<SignatureImage[]>([])
  const [draggedSignatureId, setDraggedSignatureId] = useState<string | null>(null)
  //마우스가 서명의 어느 부분을 클릭했는지
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [showSignatureAdded, setShowSignatureAdded] = useState(false)
  // 크기 조절 상태
  const [resizeInfo, setResizeInfo] = useState<ResizeInfo | null>(null)

  // 서명 구성원 상태
  const [signerMembers, setSignerMembers] = useState<SignerMember[]>([])
  const [newMemberName, setNewMemberName] = useState('')
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [newMemberRole, setNewMemberRole] = useState('')
  
  // 공유 URL 상태 (나중에 백엔드에서 받아올 예정)
  const [shareUrl, setShareUrl] = useState<string>('')

  // 서명 이미지 추가 함수, 서명 dataUrl을 받음
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
      isResizing: false,
      num_page: currentPage // ← 현재 PDF 페이지 번호로 변경
    }
    setSignatures(prev => [...prev, newSignature])
  }, [signatures.length, currentPage]) // currentPage도 의존성에 추가

  // 서명 이미지 제거 함수
  const removeSignature = useCallback((id: string) => {
    setSignatures(prev => prev.filter(sig => sig.id !== id))
  }, [])

  // 서명 구성원 추가 함수
  const addSignerMember = useCallback(() => {
    if (!newMemberName.trim()) {
      return
    }
    const newMember: SignerMember = {
      id: `member-${Date.now()}`,
      name: newMemberName.trim(),
      email: newMemberEmail.trim(), // 빈 값도 허용
      role: newMemberRole.trim(),   // 빈 값도 허용
      status: 'pending'
    }
    setSignerMembers(prev => [...prev, newMember])
    setNewMemberName('')
    setNewMemberEmail('')
    setNewMemberRole('')
  }, [newMemberName, newMemberEmail, newMemberRole])

  // 서명 구성원 제거 함수
  const removeSignerMember = useCallback((id: string) => {
    setSignerMembers(prev => prev.filter(member => member.id !== id))
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


  //----------------------------------------------------------------------------------------------------------------
  // 이미지 미리보기 (canvas에 그림)
  useEffect(() => {
    if (previewType === "image" && uploadedFile && canvasRef.current) {
      const img = new window.Image()
      setLoading(true)
      img.onload = () => {
        // 고정 캔버스 크기
        const canvasWidth = 500
        const canvasHeight = 700
        // !는 앞의 변수가 null이 아님을 알려줌.
        canvasRef.current!.width = canvasWidth
        canvasRef.current!.height = canvasHeight

        // 이미지 비율 계산 (확대/축소 반영)
        const baseScale = Math.min(canvasWidth / img.width, canvasHeight / img.height, 1)
        const scale = baseScale * zoomState.scale
        const drawWidth = img.width * scale
        const drawHeight = img.height * scale
        const offsetX = (canvasWidth - drawWidth) / 2 + panState.x
        const offsetY = (canvasHeight - drawHeight) / 2 + panState.y
        
        //canvas 그리기 설정
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
      //의존성 배열 (아래)
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
        setLoading(true);
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
    // 서명과 서명 구성원도 함께 제거
    setSignatures([])
    setSignerMembers([])
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
  
  //서명 드래그 더 부드럽게 requestAnimationFrame 설정 (코드 이해 안됨 ..)
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

  // PDF+구성원 업로드 함수
  const handleUpload = async () => {
    if (!uploadedFile || signerMembers.length === 0) {
      setErrorMsg("파일과 구성원을 추가하세요.");
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      //api 호출 (확정하기 버튼)
      const result = await uploadPdfWithSigners(
        uploadedFile.file,
        signerMembers.map(({ name, email, role }) => ({ name, email, role }))
      );
      // 공유 URL을 서명 페이지 링크로 설정
      setShareUrl(result.file?.doc_filename ? `https://sign2gether.vercel.app/${result.file.doc_filename}` : "");
      setLoading(false);
      alert("업로드 성공! 공유 URL을 복사하여 서명 페이지로 이동하세요.");
    } catch (e: any) {
      setLoading(false);
      if (e.message && (e.message.includes('401') || e.message.includes('Not authenticated'))) {
        alert("로그인 해주세요.");
      } else {
        alert(e.message || "업로드 실패");
      }
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto">
      {/* Drop Zone (파일 업로드 영역) */}
      <AnimatePresence>
        {!uploadedFile && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
                      className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
            ${isDragOver ? "border-black bg-blue-50 scale-105" : "border-black hover:border-gray-700"}
          `}
          >
            <div className="flex flex-col items-center space-y-4">
              <div
                className={`
                w-16 h-16 rounded-full flex items-center justify-center transition-colors border border-gray-700
                ${isDragOver ? "bg-blue-50" : "bg-transparent"}
              `}
              >
                <Upload className={`w-8 h-8 ${isDragOver ? "text-blue-700" : "text-black"}`} />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">이미지 또는 PDF 파일을 여기에 드래그하세요</h3>
                <p className="text-gray-600 mb-4">또는 클릭해서 파일을 선택하세요</p>
              </div>

              {/* 파일 선택 input */}
              <input type="file" accept="image/*,application/pdf" onChange={handleFileInput} className="sr-only" id="file-input" />
              <Button variant="outline" className="cursor-pointer bg-transparent text-black-400 border-black hover:text-white hover:bg-black hover:border-black" asChild>
                <label htmlFor="file-input">
                  파일 선택
                </label>
              </Button>
              <p className="text-sm text-black-400 mt-4">PDF, JPG, PNG 파일만 지원합니다.</p>
              <p className="text-xs text-black-400 mt-2">업로드 후 버튼으로 확대/축소</p>
              {errorMsg && <div className="text-red-500 mt-2">{errorMsg}</div>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 파일 업로드 후 레이아웃 */}
      <AnimatePresence>
        {uploadedFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="mt-6"
          >
            {/* 파일 정보 헤더 */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="flex w-full justify-between items-center mb-6"
            >
              <div className="flex-1 min-w-0 mr-4">
                <span className="font-semibold text-gray-800 truncate block">{uploadedFile.name}</span>
                <span className="text-sm text-gray-600 truncate block">({uploadedFile.type || "알 수 없는 형식"})</span>
              </div>
              <Button variant="outline" onClick={removeFile} className="flex-shrink-0">파일 제거</Button>
            </motion.div>

            {loading && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-blue-600 mb-4 text-center"
              >
                미리보기 준비 중...
              </motion.div>
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

            {/* 메인 컨텐츠 영역 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* 왼쪽: PDF/이미지 미리보기 */}
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.8 }}
                className="flex flex-col items-center"
              >
                {/* 이미지 미리보기 */}
                {previewType === "image" && (
                  <div
                    ref={containerRef}
                    className="relative w-[500px] h-[700px] border rounded shadow overflow-hidden"
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
                  <div className="flex flex-col items-center space-y-4">
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

                      {/* PDF 미리보기 영역 - containerRef가 연결된 메인 컨테이너 (500x700 크기) */}
                      <div className="relative">
                        <div
                          ref={containerRef}  // ← PDF 미리보기를 감싸는 메인 상자
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

                    {/* 확대/축소 컨트롤 및 페이지 정보 */}
                    <div className="flex justify-center items-center gap-4">
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

                      {/* 페이지 정보 */}
                      <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-white/20">
                        <span className="text-sm font-medium text-gray-700">
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
              </motion.div>

              {/* 오른쪽: 서명 구성원 테이블 */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="flex flex-col"
              >
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                                  <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-800">서명 구성원</h3>
                  <div className="text-sm text-gray-600">
                    총 {signerMembers.length}명
                  </div>
                </div>

                  {/* 구성원 추가 폼 */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">새 구성원 추가</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                      <input
                        type="text"
                        placeholder="이름"
                        value={newMemberName}
                        onChange={(e) => setNewMemberName(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <input
                        type="email"
                        placeholder="이메일"
                        value={newMemberEmail}
                        onChange={(e) => setNewMemberEmail(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <input
                        type="text"
                        placeholder="역할"
                        value={newMemberRole}
                        onChange={(e) => setNewMemberRole(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <Button 
                      onClick={addSignerMember}
                      disabled={!newMemberName.trim()}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      구성원 추가
                    </Button>
                  </div>

                  {/* 구성원 목록 */}
                  <div className="space-y-3">
                    {signerMembers.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <UserPlus className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>아직 구성원이 없습니다.</p>
                        <p className="text-sm">위 폼에서 구성원을 추가해주세요.</p>
                      </div>
                    ) : (
                      signerMembers.map((member, index) => (
                        <motion.div
                          key={member.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1, duration: 0.7 }}
                          className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                  <span className="text-sm font-medium text-blue-600">
                                    {member.name.charAt(0)}
                                  </span>
                                </div>
                                <div>
                                  <h4 className="font-medium text-gray-800">{member.name}</h4>
                                  <p className="text-sm text-gray-600">{member.email}</p>
                                  <p className="text-xs text-gray-500">{member.role}</p>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                                member.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                member.status === 'signed' ? 'bg-green-100 text-green-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {member.status === 'pending' ? '대기중' :
                                 member.status === 'signed' ? '서명완료' : '완료'}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeSignerMember(member.id)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>

                  {/* 확정하기 버튼 및 공유 URL 영역 */}
                  <div className="mt-4">
                    <div className="flex flex-col space-y-4">
                      {/* 확정하기 버튼 */}
                      <div className="text-center">
                        <Button 
                          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                          disabled={signerMembers.length === 0 || !uploadedFile}
                          onClick={handleUpload}
                        >
                          확정하기
                        </Button>
                      </div>

                      {/* 구분선 */}
                      <div className="flex items-center">
                        <div className="flex-1 h-px bg-gray-300"></div>
                        <span className="px-4 text-sm text-gray-500">그리고</span>
                        <div className="flex-1 h-px bg-gray-300"></div>
                      </div>

                      {/* 공유 URL 영역 */}
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <h5 className="text-sm font-medium text-gray-700 mb-3">공유 URL</h5>
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={shareUrl}
                            readOnly
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-600 focus:outline-none"
                            placeholder="확정하기 버튼을 클릭하여 공유 URL을 생성하세요"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                            onClick={() => {
                              navigator.clipboard.writeText(shareUrl)
                              // 복사 완료 알림 (실제로는 toast나 알림 추가)
                            }}
                          >
                            복사
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                            onClick={() => {
                              if (shareUrl) {
                                window.open(shareUrl, "_blank");
                              }
                            }}
                          >
                            이동
                          </Button>
                          
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          이 URL을 구성원들에게 공유하여 서명을 요청할 수 있습니다.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
