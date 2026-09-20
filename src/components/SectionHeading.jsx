import { RevealText } from './AnimatedText'

/**
 * SectionHeading — oversized index number + editorial heading.
 * Art-directed: number floats large, label is a small eyebrow.
 */
export default function SectionHeading({ index, label, lines, align = 'left', className = '' }) {
  return (
    <header className={`relative ${className}`}>
      <div className={`flex items-baseline gap-4 mb-6 ${align === 'right' ? 'justify-end' : ''}`}>
        <span className="font-display giant-num leading-none text-acid select-none">
          {index}
        </span>
        <span className="eyebrow text-bone2 pb-3">{label}</span>
      </div>
      <RevealText
        lines={lines}
        className={`font-display d-1 text-bone ${align === 'right' ? 'text-right' : ''}`}
      />
    </header>
  )
}
