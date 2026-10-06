// CSS-driven infinite marquee. Duplicates children so the loop is seamless.
// (No data-lenis-prevent — these auto-scroll, so the page must still scroll
// normally when the pointer is over them.)
export function Marquee({ children, speed = 40, reverse = false, className = '' }) {
  return (
    <div className={`group relative flex overflow-hidden ${className}`}>
      <div
        className="flex min-w-full shrink-0 items-center gap-16 pr-16 group-hover:[animation-play-state:paused] motion-reduce:animate-none"
        style={{ animation: `marquee ${speed}s linear infinite ${reverse ? 'reverse' : ''}` }}
      >
        {children}
      </div>
      <div
        aria-hidden
        className="flex min-w-full shrink-0 items-center gap-16 pr-16 group-hover:[animation-play-state:paused] motion-reduce:animate-none"
        style={{ animation: `marquee ${speed}s linear infinite ${reverse ? 'reverse' : ''}` }}
      >
        {children}
      </div>
      <style>{`@keyframes marquee { from { transform: translateX(0) } to { transform: translateX(-100%) } }`}</style>
    </div>
  )
}
