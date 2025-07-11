"use client"
// 파일 선택 하거나 파일 드랍하는 컴포넌트
import type React from "react"
import { useState, useCallback } from "react" 
import { Upload, File, X } from "lucide-react" // 최신 아이콘 라이브러리 
import { Button } from "@/components/ui/button"

// 업로드할 파일 모델 객체
interface UploadedFile {
  name: string
  size: number
  type: string
  file: File
}

export default function FileDropZone() {
  const [isDragOver, setIsDragOver] = useState(false)
  // UploadedFile[]는 UploadedFile 객체를 담을 리스트 선언이고 초기에는 빈 배열로 세팅
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])

  //드래그 오버 시 setIsDragOver = true
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault() // 브라우저가 자동으로 이벤트를 실행하지 않도록
    setIsDragOver(true)
  }, [])

  //드래그 오버 시 setIsDragOver = false
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  // 드래그앤드랍을 이용한 파일 업로드
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    const newFiles: UploadedFile[] = files.map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type,
      file: file,
    }))
    // prev는 현재 상태 값
    setUploadedFiles((prev) => [...prev, ...newFiles])
  }, [])

  //파일선택 버튼을 이용한 파일 업로드
  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const newFiles: UploadedFile[] = files.map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type,
      file: file,
    }))

    setUploadedFiles((prev) => [...prev, ...newFiles])
  }, [])

  // 파일 삭제
  const removeFile = useCallback((index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
  }, [])
  
  // 파일 크기 계산
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      {/* Drop Zone */}
      <div
      // 커서 드래그 오버 설정 (HTML 이벤트 핸들러 속성)
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}

        // 드래그 오버 시 css 속성 변경
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">파일을 여기에 드래그하세요</h3>
            <p className="text-gray-600 mb-4">또는 클릭해서 파일을 선택하세요</p>
          </div>

          <input type="file" multiple onChange={handleFileInput} className="sr-only" id="file-input" />
          <label htmlFor="file-input">
            <Button variant="outline" className="cursor-pointer bg-transparent">
              파일 선택
            </Button>
          </label>
          <p className="text-sm text-gray-500 mt-4">PDF, DOC, DOCX, JPG, PNG 파일을 지원합니다</p>
        </div>
      </div>

      {/*업로드 된 파일 리스트 표시*/}
      {uploadedFiles.length > 0 && (
        <div className="mt-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">업로드된 파일 ({uploadedFiles.length})</h4>
          <div className="space-y-2">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                <div className="flex items-center space-x-3">
                  <File className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="font-medium text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-500">
                      {formatFileSize(file.size)} • {file.type || "알 수 없는 형식"}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                  className="text-gray-500 hover:text-red-600"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
            {/* 파일 업로드 후 백엔드 파일 전송 및 업로드한 모든 파일 삭제 */}
          <div className="mt-4 flex space-x-3">
            <Button className="bg-blue-600 hover:bg-blue-700">모든 파일 업로드</Button>
            <Button variant="outline" onClick={() => setUploadedFiles([])}>
              모두 제거
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
