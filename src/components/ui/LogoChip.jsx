// Brand logos live on a white chip so colored marks stay legible in both
// light and dark themes (most logos are designed for light backgrounds).
export function LogoChip({ src, name }) {
  return (
    <div className="grid h-16 w-36 shrink-0 place-items-center rounded-xl border border-line/10 bg-white px-5 shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
      <img src={src} alt={name} loading="lazy" className="max-h-8 w-auto max-w-full object-contain" />
    </div>
  )
}
