// 업로드할 파일 모델 객체 타입
export interface UploadedFile {
  name: string
  size: number
  type: string
  file: File
}

// 줌 상태 타입
export interface ZoomState {
  scale: number
}

// 패닝 상태 타입
export interface PanState {
  x: number
  y: number
}

// 서명 이미지 타입
export interface SignatureImage {
  id: string
  dataUrl: string
  x: number
  y: number
  width: number
  height: number
  isDragging: boolean
  isResizing: boolean
}

// 서명 구성원 타입
export interface SignerMember {
  id: string
  name: string
  email: string
  role: string
  status: 'pending' | 'signed' | 'completed'
  signatureId?: string
}

// 크기 조절 정보 타입
export interface ResizeInfo {
  id: string
  startX: number
  startY: number
  startW: number
  startH: number
}

// 미리보기 타입
export type PreviewType = "image" | "pdf" | "unsupported" | null 