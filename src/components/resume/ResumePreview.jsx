import { useEffect, useRef, useState } from 'react'
import { ResumeSheet } from './ResumeSheet'

// A4 authored width in px (matches globals.css --sheet-w). The sheet is drawn at this
// exact width and scaled down with a transform to fit its container, so print output
// stays 1:1 with the on-screen document.
const SHEET_W = 794 // 210mm @ 96dpi
const SHEET_H = 1123 // 297mm @ 96dpi

// A live, auto-scaling preview of the resume sheet. Measures its own width and scales
// the fixed-size sheet to fit, reserving the correct height so nothing overlaps.
export function ResumePreview({ resume, id }) {
  const holderRef = useRef(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const el = holderRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width
      setScale(Math.min(1, w / SHEET_W))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={holderRef} className="w-full">
      <div className="resume-scaler-holder" style={{ height: SHEET_H * scale }}>
        <div
          className="resume-scaler origin-top-left"
          style={{ width: SHEET_W, transform: `scale(${scale})` }}
        >
          <ResumeSheet resume={resume} id={id} />
        </div>
      </div>
    </div>
  )
}
