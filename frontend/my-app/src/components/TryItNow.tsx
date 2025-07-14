"use client"

import { useEffect, useRef } from "react"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

const TEXT = "TRY IT NOW"

export default function TryItNow() {
  const boxRef = useRef<HTMLDivElement>(null)
  const letterRefs = useRef<(HTMLSpanElement | null)[]>([])

  useEffect(() => {
    if (boxRef.current) {
      gsap.fromTo(
        letterRefs.current,
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          ease: "power2.out",
          stagger: 0.07,
          scrollTrigger: {
            trigger: boxRef.current,
            start: "top 50%",
            end : "top 0%",
            toggleActions: "restart none none none"
          }
        }
      )
    }
  }, [])

  return (
    <div 
      className="w-full min-h-[50vh] py-32 flex items-center justify-center"
      style={{
        background: 'linear-gradient(180deg, #000000 10%, #22223b 30%, #3b4a6b 80%, #dbeafe 100%)'
      }}
    >
      <div ref={boxRef}>
        <h2 className="text-4xl font-bold text-white mb-4 tracking-wider flex gap-1 justify-center">
          {TEXT.split("").map((char, i) => (
            <span
              key={i}
              ref={el => { letterRefs.current[i] = el }}
              className="inline-block"
            >
              {char === " " ? "\u00A0" : char}
            </span>
          ))}
        </h2>
      </div>
    </div>
  )
} 