"use client"

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import AOS from 'aos'
import 'aos/dist/aos.css'

// GSAP 플러그인 등록
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

export default function Hero() {
  const heroRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const subtitleRef = useRef<HTMLParagraphElement>(null)
  const backgroundRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    AOS.init({ once: true })
  }, [])

  useEffect(() => {
    // Canvas 설정
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Canvas 크기 설정
    const resizeCanvas = () => {
      if (heroRef.current && canvas) {
        canvas.width = heroRef.current.offsetWidth
        canvas.height = heroRef.current.offsetHeight
      }
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // 마우스 추적 변수들
    let mouseX = 0
    let mouseY = 0
    let lastX = 0
    let lastY = 0
    let isFirstMove = true
    const points: { x: number; y: number; timestamp: number }[] = []
    const maxPoints = 70

    // Canvas 스타일 설정
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // 마우스 이벤트 핸들러
    const handleMouseMove = (e: MouseEvent) => {
      if (!heroRef.current) return

      const rect = heroRef.current.getBoundingClientRect()
      mouseX = e.clientX - rect.left
      mouseY = e.clientY - rect.top

      // 첫 번째 마우스 움직임인 경우
      if (isFirstMove) {
        lastX = mouseX
        lastY = mouseY
        isFirstMove = false
        return
      }

      // 새로운 점 추가
      points.push({ x: mouseX, y: mouseY, timestamp: Date.now() })
      
      // 최대 점 수 제한
      if (points.length > maxPoints) {
        points.shift()
      }

      // 선 그리기
      ctx.beginPath()
      ctx.moveTo(lastX, lastY)
      ctx.lineTo(mouseX, mouseY)
      
      // 글로우 효과
      ctx.shadowColor = 'rgba(255, 255, 255, 0.6)'
      ctx.shadowBlur = 15
      ctx.stroke()
      ctx.shadowBlur = 0

      lastX = mouseX
      lastY = mouseY
    }

    const handleMouseLeave = () => {
      // 마우스가 영역을 벗어나면 점들 초기화
      points.length = 0
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      isFirstMove = true
    }

    // 이벤트 리스너 등록
    if (heroRef.current) {
      heroRef.current.addEventListener('mousemove', handleMouseMove)
      heroRef.current.addEventListener('mouseleave', handleMouseLeave)
    }

    // 자동 페이드 아웃 애니메이션
    const fadeOutAnimation = () => {
      if (points.length > 0) {
        // 가장 오래된 점 제거
        points.shift()
        
        // Canvas 클리어
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        
        // 남은 점들로 선 다시 그리기
        if (points.length > 1) {
          ctx.beginPath()
          ctx.moveTo(points[0].x, points[0].y)
          
          for (let i = 1; i < points.length; i++) {
            const point = points[i]
            const alpha = (i / points.length) * 0.9 // 투명도 점진적 감소
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`
            ctx.lineTo(point.x, point.y)
          }
          ctx.stroke()
        }
      }
    }

    // 주기적으로 페이드 아웃 실행
    const fadeInterval = setInterval(fadeOutAnimation, 40)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      if (heroRef.current) {
        heroRef.current.removeEventListener('mousemove', handleMouseMove)
        heroRef.current.removeEventListener('mouseleave', handleMouseLeave)
      }
      clearInterval(fadeInterval)
    }
  }, [])

  useEffect(() => {
    const ctx = gsap.context(() => {
      // 배경 패럴랙스 효과
      gsap.to(backgroundRef.current, {
        yPercent: -50,
        ease: "none",
        scrollTrigger: {
          trigger: heroRef.current,
          start: "top bottom",
          end: "bottom top",
          scrub: true
        }
      })

      // 제목 애니메이션
      const titleChars = titleRef.current?.textContent?.split('') || []
      if (titleRef.current) {
        titleRef.current.innerHTML = ''
        titleChars.forEach((char, index) => {
          const span = document.createElement('span')
          span.textContent = char === ' ' ? '\u00A0' : char
          span.style.display = 'inline-block'
          span.style.opacity = '0'
          span.style.transform = 'translateY(100px) rotateX(90deg)'
          span.style.filter = 'blur(10px)'
          titleRef.current?.appendChild(span)
        })
      }

      // 문자별 애니메이션 - 더 화려한 효과
      if (titleRef.current?.children) {
        gsap.to(titleRef.current.children, {
          opacity: 1,
          y: 0,
          rotationX: 0,
          filter: 'blur(0px)',
          duration: 1.2,
          stagger: 0.08,
          ease: "elastic.out(1, 0.3)",
          scrollTrigger: {
            trigger: heroRef.current,
            start: "top 50%",
            end: "bottom top",
            toggleActions: "play none none reverse"
          }
        })

      }

      // 제목에 지속적인 호버 효과 추가
      if (titleRef.current) {
        titleRef.current.addEventListener('mouseenter', () => {
          if (titleRef.current?.children) {
            gsap.to(titleRef.current.children, {
              scale: 1.1,
              duration: 0.3,
              stagger: 0.02,
              ease: "power2.out"
            })
          }
        })

        titleRef.current.addEventListener('mouseleave', () => {
          if (titleRef.current?.children) {
            gsap.to(titleRef.current.children, {
              scale: 1,
              duration: 0.3,
              stagger: 0.02,
              ease: "power2.out"
            })
          }
        })
      }

      // 제목에 주기적인 글로우 효과
      gsap.to(titleRef.current, {
        textShadow: "0 0 20px rgba(255,255,255,0.8)",
        duration: 2,
        repeat: -1,
        yoyo: true,
        ease: "power2.inOut",
        delay: 2
      })

      // 제목에 지속적인 움직임 효과
      gsap.to(titleRef.current, {
        y: -10,
        duration: 3,
        repeat: -1,
        yoyo: true,
        ease: "power2.inOut",
        delay: 1
      })

      // 각 글자에 개별적인 반복 애니메이션
      if (titleRef.current?.children) {
        gsap.to(titleRef.current.children, {
          y: -5,
          duration: 2,
          repeat: -1,
          yoyo: true,
          stagger: 0.1,
          ease: "power2.inOut",
          delay: 3
        })
      }

      // 제목에 회전 효과 (매우 미묘하게)
      gsap.to(titleRef.current, {
        rotation: 1,
        duration: 4,
        repeat: -1,
        yoyo: true,
        ease: "power2.inOut",
        delay: 0.5
      })

      // 마우스 움직임에 따른 배경 효과
      if (heroRef.current) {
        heroRef.current.addEventListener('mousemove', (e) => {
          const { clientX, clientY } = e
          const { width, height, left, top } = heroRef.current!.getBoundingClientRect()
          
          const x = (clientX - left) / width
          const y = (clientY - top) / height
          
          gsap.to(backgroundRef.current, {
            x: (x - 0.5) * 20,
            y: (y - 0.5) * 20,
            duration: 0.5,
            ease: "power2.out"
          })
        })
      }
    }, heroRef)

    return () => ctx.revert()
  }, [])

  useEffect(() => {
    // 부제목 단어별 스크롤 애니메이션 (GSAP 최적화)
    if (subtitleRef.current) {
      const words = subtitleRef.current.querySelectorAll('.subtitle-word');
      gsap.set(words, { opacity: 0, y: 60 }); // 더 멀리서 등장

      gsap.to(words, {
        opacity: 1,
        y: 0,
        duration: 1.2,
        stagger: 0.15,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: heroRef.current,
          start: 'top 60%',
          end: 'top 0%',
          scrub: 1, // 스크롤 진행도에 따라
          toggleActions: 'play none none reverse'
        }
      });
    }
  }, []);

  return (
    <div 
      ref={heroRef}
      className="relative h-[80vh] flex items-center justify-center overflow-hidden bg-black"
    >
      {/* Canvas 레이어 */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none z-20"
        style={{ mixBlendMode: 'screen' }}
      />
      
      {/* 배경 패턴 */}
      <div 
        ref={backgroundRef}
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 40% 60%, rgba(255, 255, 255, 0.05) 0%, transparent 50%)
          `,
          backgroundSize: '300px 300px, 400px 400px, 200px 200px',
          backgroundPosition: '0 0, 0 0, 0 0'
        }}
      />
      
      {/* 메인 컨텐츠 */}
      <div className="relative z-10 text-center px-6">
        <h1 
          ref={titleRef}
          className="text-8xl md:text-9xl font-bold text-white mb-6 tracking-tight"
        >
          Sign2gether
        </h1>
        
        {/* 스크롤 인디케이터 */}
        <div className="absolute left-1/2 transform -translate-x-1/2" style={{ bottom: '-150px' }}>
          <div className="animate-bounce">
            <svg 
              className="w-6 h-6 text-white" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M19 14l-7 7m0 0l-7-7m7 7V3" 
              />
            </svg>
          </div>
        </div>
      </div>
      
      {/* 플로팅 요소들 */}
      <div className="absolute top-20 left-20 w-4 h-4 bg-white rounded-full opacity-30 animate-pulse" />
      <div className="absolute top-40 right-32 w-6 h-6 bg-blue-400 rounded-full opacity-40 animate-ping" />
      <div className="absolute bottom-32 left-32 w-3 h-3 bg-white rounded-full opacity-50 animate-bounce" />
      <div className="absolute bottom-20 right-20 w-5 h-5 bg-blue-400 rounded-full opacity-35 animate-pulse" />
    </div>
  )
} 