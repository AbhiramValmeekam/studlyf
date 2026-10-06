import { useEffect, useId, useRef, useState } from 'react'
import { api } from '../../lib/api'
import { Label } from './Field'

/**
 * A light rich-text editor over a contentEditable region — no editor dependency.
 *
 * Two deliberate choices:
 *  1. The DOM node is UNCONTROLLED. React re-rendering a contentEditable's children moves the
 *     caret, so we set `innerHTML` on mount and only re-sync from `value` while the editor is
 *     NOT focused. Every keystroke reports up through `onChange`.
 *  2. There is no client-side sanitizer. The server's `sanitizeRichText` is the single trust
 *     boundary (spec §96). The toolbar can only produce tags already on its allow-list, paste is
 *     forced to plain text, and images are inserted only from urls our own upload route returned.
 *
 * `document.execCommand` is deprecated but is the only zero-dependency way to do this. It is
 * isolated in `exec()` so it can be swapped wholesale if a library is ever adopted.
 */

const IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif'

const plainText = (html) =>
  String(html ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()

/** Blank-line-separated plain text → paragraphs, so pasted prose survives the first edit. */
function normalizeToHtml(value) {
  const t = String(value ?? '').trim()
  if (!t) return ''
  if (/<[a-z][\s\S]*>/i.test(t)) return t
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return t
    .split(/\n{2,}/)
    .map((block) => `<p>${esc(block).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

const escapeAttr = (s) => String(s ?? '').replace(/"/g, '&quot;').replace(/</g, '&lt;')

function ToolButton({ onMouseDown, active, title, children }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active || undefined}
      onMouseDown={onMouseDown}
      className={`grid h-8 min-w-8 place-items-center rounded-lg px-2 text-sm transition-colors duration-150 ${
        active ? 'bg-acid/20 text-acid' : 'text-mute hover:bg-line/10 hover:text-bone'
      }`}
    >
      {children}
    </button>
  )
}

export default function RichTextEditor({
  value = '',
  onChange,
  label,
  hint,
  error,
  id,
  placeholder = 'Write…',
  minHeight = 220,
  maxLength,
  disabled = false,
  purpose = 'OTHER',
}) {
  const autoId = useId()
  const fieldId = id || `rt-${autoId}`
  const ref = useRef(null)
  const fileRef = useRef(null)
  const [preview, setPreview] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [marks, setMarks] = useState({})

  // Seed the DOM once, and re-seed from an external change only while unfocused.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const next = normalizeToHtml(value)
    if (document.activeElement !== el && el.innerHTML !== next) el.innerHTML = next
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const emit = () => {
    const el = ref.current
    if (el && onChange) onChange(el.innerHTML)
  }

  const exec = (cmd, arg = null) => {
    if (disabled) return
    ref.current?.focus()
    // eslint-disable-next-line no-undef
    document.execCommand(cmd, false, arg)
    emit()
    refreshMarks()
  }

  const refreshMarks = () => {
    const el = ref.current
    if (!el || document.activeElement !== el) return
    const on = (c) => {
      try {
        // eslint-disable-next-line no-undef
        return document.queryCommandState(c)
      } catch {
        return false
      }
    }
    let block = ''
    try {
      // eslint-disable-next-line no-undef
      block = String(document.queryCommandValue('formatBlock') || '').toLowerCase()
    } catch {
      block = ''
    }
    setMarks({ bold: on('bold'), italic: on('italic'), ul: on('insertUnorderedList'), ol: on('insertOrderedList'), h2: block === 'h2', h3: block === 'h3', quote: block === 'blockquote' })
  }

  const onPaste = (e) => {
    // Keep foreign markup out of the model entirely; the author can re-apply formatting.
    e.preventDefault()
    // eslint-disable-next-line no-undef
    document.execCommand('insertText', false, e.clipboardData.getData('text/plain'))
    emit()
  }

  const insertLink = () => {
    const href = window.prompt('Link URL (https://…)')
    if (!href) return
    let ok = false
    try {
      const u = new URL(href)
      ok = u.protocol === 'https:' || u.protocol === 'http:'
    } catch {
      ok = false
    }
    if (!ok) {
      setUploadError('Links must be a full http(s) URL.')
      return
    }
    setUploadError(null)
    exec('createLink', href)
  }

  const onPickImage = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploadError(null)
    if (!IMAGE_ACCEPT.split(',').includes(file.type)) {
      setUploadError('Images must be PNG, JPEG, WEBP or GIF.')
      return
    }
    setUploading(true)
    try {
      const { data } = await api.uploadImage(file, { purpose })
      ref.current?.focus()
      exec('insertHTML', `<img src="${escapeAttr(data.url)}" alt="${escapeAttr(data.altText || file.name)}">`)
    } catch (err) {
      setUploadError(err?.message || 'Upload failed. Try again.')
    } finally {
      setUploading(false)
    }
  }

  const text = plainText(value)

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        {label ? <Label htmlFor={fieldId} className="mb-0">{label}</Label> : <span />}
        <button
          type="button"
          onClick={() => setPreview((p) => !p)}
          className="text-xs font-medium uppercase tracking-[0.14em] text-mute transition-colors hover:text-acid"
        >
          {preview ? 'Edit' : 'Preview'}
        </button>
      </div>

      <div className={`overflow-hidden rounded-xl border bg-ink2/60 transition-colors duration-200 ${error ? 'border-flare/60' : 'border-line/12 focus-within:border-acid/60'}`}>
        {!preview && (
          <div className="flex flex-wrap items-center gap-0.5 border-b border-line/10 px-2 py-1.5">
            <ToolButton title="Heading" active={marks.h2} onMouseDown={(e) => { e.preventDefault(); exec('formatBlock', '<h2>') }}>H2</ToolButton>
            <ToolButton title="Subheading" active={marks.h3} onMouseDown={(e) => { e.preventDefault(); exec('formatBlock', '<h3>') }}>H3</ToolButton>
            <ToolButton title="Paragraph" onMouseDown={(e) => { e.preventDefault(); exec('formatBlock', '<p>') }}>¶</ToolButton>
            <span className="mx-1 h-5 w-px bg-line/15" />
            <ToolButton title="Bold" active={marks.bold} onMouseDown={(e) => { e.preventDefault(); exec('bold') }}><b>B</b></ToolButton>
            <ToolButton title="Italic" active={marks.italic} onMouseDown={(e) => { e.preventDefault(); exec('italic') }}><i>I</i></ToolButton>
            <span className="mx-1 h-5 w-px bg-line/15" />
            <ToolButton title="Bulleted list" active={marks.ul} onMouseDown={(e) => { e.preventDefault(); exec('insertUnorderedList') }}>•</ToolButton>
            <ToolButton title="Numbered list" active={marks.ol} onMouseDown={(e) => { e.preventDefault(); exec('insertOrderedList') }}>1.</ToolButton>
            <ToolButton title="Quote" active={marks.quote} onMouseDown={(e) => { e.preventDefault(); exec('formatBlock', '<blockquote>') }}>”</ToolButton>
            <span className="mx-1 h-5 w-px bg-line/15" />
            <ToolButton title="Insert link" onMouseDown={(e) => { e.preventDefault(); insertLink() }}>🔗</ToolButton>
            <ToolButton title={uploading ? 'Uploading…' : 'Insert image'} onMouseDown={(e) => { e.preventDefault(); if (!uploading) fileRef.current?.click() }}>
              {uploading ? '…' : '🖼'}
            </ToolButton>
            <span className="mx-1 h-5 w-px bg-line/15" />
            <ToolButton title="Clear formatting" onMouseDown={(e) => { e.preventDefault(); exec('removeFormat') }}>⌫</ToolButton>
          </div>
        )}

        {preview ? (
          <div
            className="prose-editorial px-4 py-3 text-bone"
            style={{ minHeight }}
            // The same sanitized markup the public page renders; value is server-sanitized on save.
            dangerouslySetInnerHTML={{ __html: normalizeToHtml(value) || '<p class="text-mute/60">Nothing to preview yet.</p>' }}
          />
        ) : (
          <div
            id={fieldId}
            ref={ref}
            role="textbox"
            aria-multiline="true"
            aria-invalid={!!error}
            contentEditable={!disabled}
            suppressContentEditableWarning
            onInput={emit}
            onBlur={() => { emit(); setMarks({}) }}
            onKeyUp={refreshMarks}
            onMouseUp={refreshMarks}
            onPaste={onPaste}
            data-placeholder={placeholder}
            className="prose-editorial rte-editable px-4 py-3 text-bone outline-none empty:before:text-mute/50 empty:before:content-[attr(data-placeholder)]"
            style={{ minHeight }}
          />
        )}
      </div>

      <input ref={fileRef} type="file" accept={IMAGE_ACCEPT} className="hidden" onChange={onPickImage} />

      <div className="mt-1.5 flex items-center justify-between gap-3">
        <div>
          {error && <p className="text-sm text-flare">{error}</p>}
          {!error && uploadError && <p className="text-sm text-flare">{uploadError}</p>}
          {!error && !uploadError && hint && <p className="text-sm text-mute/70">{hint}</p>}
        </div>
        {maxLength ? <span className="shrink-0 text-xs text-mute/60">{text.length}/{maxLength}</span> : null}
      </div>
    </div>
  )
}
