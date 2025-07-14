"use client"
import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

export default function Subtitle() {
  const subtitleRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    if (subtitleRef.current) {
      const words = subtitleRef.current.querySelectorAll('.subtitle-word');
      gsap.set(words, { opacity: 0, y: 60 });

      gsap.to(words, {
        opacity: 1,
        y: 0,
        duration: 1.2,
        stagger: 0.15,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: subtitleRef.current,
          start: 'top 50%',
          end: 'top 0%',
          scrub: 1,
          toggleActions: 'play none none reverse'
        }
      });
    }
  }, []);

  return (
    <div className="w-full bg-black py-12">
      <p
        ref={subtitleRef}
        className="text-xl md:text-2xl text-gray-300 max-w-2xl mx-auto leading-relaxed text-center"
      >
        <span className="subtitle-word">디지털 서명의</span>{' '}
        <span className="subtitle-word">새로운</span>{' '}
        <span className="subtitle-word">시대를</span>{' '}
        <span className="subtitle-word">경험하세요</span>
        <br />
        <span className="subtitle-word">간편하고</span>{' '}
        <span className="subtitle-word">안전한</span>{' '}
        <span className="subtitle-word">문서 서명</span>{' '}
        <span className="subtitle-word">플랫폼</span>
      </p>
    </div>
  )
} 