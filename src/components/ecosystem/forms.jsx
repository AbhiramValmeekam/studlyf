import { useEffect, useRef, useState } from 'react'
import { api, ApiError } from '../../lib/api'
import { fieldErrors } from '../layout/AuthLayout'
import { Button } from '../ui/Button'
import { FormField, Input, Select, Textarea } from '../ui/Field'
import { Spinner } from '../ui/atoms'
import RichTextEditor from '../ui/RichTextEditor'
import { Notice, label } from './product'

// Small form kit for the ecosystem products: controlled fields bound to one state object,
// server field errors mapped inline, and a save action with clear success/error feedback.

/** Get/set nested values by dotted path ("startup.traction.users"). */
export const getPath = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj)
export function setPath(obj, path, value) {
  const [head, ...rest] = path.split('.')
  return { ...obj, [head]: rest.length ? setPath(obj?.[head] ?? {}, rest.join('.'), value) : value }
}

export function useForm(initial) {
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState(null) // { tone, text }
  const [busy, setBusy] = useState(false)

  // Re-seed when the loaded record changes (e.g. after a refetch).
  const seed = JSON.stringify(initial)
  useEffect(() => setValues(initial), [seed]) // eslint-disable-line react-hooks/exhaustive-deps

  const bind = (path, { type = 'text', number = false } = {}) => ({
    value: getPath(values, path) ?? (type === 'checkbox' ? false : ''),
    onChange: (e) => {
      let v = type === 'checkbox' ? e.target.checked : e.target.value
      if (number) v = v === '' ? null : Number(v)
      setValues((cur) => setPath(cur, path, v))
    },
    error: errors[path],
  })

  const run = async (fn, successText = 'Saved.') => {
    setBusy(true)
    setErrors({})
    setStatus(null)
    try {
      const out = await fn(values)
      setStatus(successText ? { tone: 'success', text: successText } : null)
      return out
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(fieldErrors(err))
        setStatus({ tone: 'error', text: err.details?.[0]?.message && err.code === 'VALIDATION_ERROR' ? 'Please fix the highlighted fields.' : err.message })
      } else {
        setStatus({ tone: 'error', text: 'Something went wrong. Try again.' })
      }
      return null
    } finally {
      setBusy(false)
    }
  }

  return { values, setValues, errors, setErrors, setStatus, status, busy, bind, run }
}

/** Blank strings → null so optional fields can be cleared. */
export function clean(obj) {
  if (Array.isArray(obj)) return obj
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, typeof v === 'string' ? (v.trim() === '' ? null : v.trim()) : clean(v)]))
  }
  return obj
}

export function Text({ form, path, label: text, hint, type = 'text', ...rest }) {
  const b = form.bind(path)
  return (
    <FormField label={text} htmlFor={path} error={b.error} hint={hint}>
      <Input id={path} type={type} value={b.value} onChange={b.onChange} error={b.error} {...rest} />
    </FormField>
  )
}

export function NumberField({ form, path, label: text, hint, ...rest }) {
  const b = form.bind(path, { number: true })
  return (
    <FormField label={text} htmlFor={path} error={b.error} hint={hint}>
      <Input id={path} type="number" inputMode="numeric" value={b.value ?? ''} onChange={b.onChange} error={b.error} {...rest} />
    </FormField>
  )
}

export function Area({ form, path, label: text, hint, rows = 5, ...rest }) {
  const b = form.bind(path)
  return (
    <FormField label={text} htmlFor={path} error={b.error} hint={hint}>
      <Textarea id={path} rows={rows} value={b.value} onChange={b.onChange} error={b.error} {...rest} />
    </FormField>
  )
}

export function Choice({ form, path, label: text, options, placeholder = 'Select…', hint }) {
  const b = form.bind(path)
  return (
    <FormField label={text} htmlFor={path} error={b.error} hint={hint}>
      <Select id={path} value={b.value ?? ''} onChange={(e) => b.onChange({ target: { value: e.target.value || null } })} error={b.error}>
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {label(o)}
          </option>
        ))}
      </Select>
    </FormField>
  )
}

/** Toggle chips for multi-select enums (stages, startup types…). */
export function MultiChoice({ form, path, label: text, options, hint }) {
  const selected = getPath(form.values, path) ?? []
  const toggle = (o) =>
    form.setValues((cur) => {
      const list = getPath(cur, path) ?? []
      return setPath(cur, path, list.includes(o) ? list.filter((x) => x !== o) : [...list, o])
    })
  return (
    <fieldset>
      <legend className="mb-2 block text-sm font-medium text-bone/90">{text}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            aria-pressed={selected.includes(o)}
            onClick={() => toggle(o)}
            className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
              selected.includes(o) ? 'border-transparent bg-acid text-ink' : 'border-line/15 text-mute hover:border-line/35 hover:text-bone'
            }`}
          >
            {label(o)}
          </button>
        ))}
      </div>
      {hint && <p className="mt-1.5 text-sm text-mute/70">{hint}</p>}
      {form.errors[path] && <p className="mt-1.5 text-sm text-flare">{form.errors[path]}</p>}
    </fieldset>
  )
}

/** Comma-separated free-text list (sectors, geographies). */
export function ListField({ form, path, label: text, hint }) {
  const current = (getPath(form.values, path) ?? []).join(', ')
  const [raw, setRaw] = useState(current)
  useEffect(() => setRaw(current), [current])
  return (
    <FormField label={text} htmlFor={path} error={form.errors[path]} hint={hint || 'Separate with commas.'}>
      <Input
        id={path}
        value={raw}
        onChange={(e) => {
          setRaw(e.target.value)
          const list = e.target.value.split(',').map((x) => x.trim()).filter(Boolean)
          form.setValues((cur) => setPath(cur, path, list))
        }}
      />
    </FormField>
  )
}

export function Toggle({ form, path, label: text, hint }) {
  const b = form.bind(path, { type: 'checkbox' })
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line/12 p-4">
      <input type="checkbox" checked={!!b.value} onChange={b.onChange} className="mt-1 h-4 w-4 accent-[#4CC9FF]" />
      <span>
        <span className="block text-sm font-medium text-bone">{text}</span>
        {hint && <span className="mt-0.5 block text-sm text-mute">{hint}</span>}
      </span>
    </label>
  )
}

export function SaveRow({ form, children = 'Save changes', extra }) {
  return (
    <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
      <Button type="submit" magnetic={false} disabled={form.busy}>
        {form.busy ? <Spinner className="h-5 w-5" /> : children}
      </Button>
      {extra}
      {form.status && (
        <div className="sm:ml-2">
          <Notice tone={form.status.tone}>{form.status.text}</Notice>
        </div>
      )}
    </div>
  )
}

/**
 * Repeatable rows bound to one array path (rounds, prizes, FAQs, links…). The array lives in the
 * form's `values`, so it round-trips through `useForm` and validates like any other field; the
 * render prop drives each row and gets `update`/`remove`/`move` helpers.
 */
export function Repeater({ form, path, label: text, hint, addLabel = 'Add', blank, render, itemTitle = 'item', max = 50 }) {
  const [open, setOpen] = useState(true)
  const rows = getPath(form.values, path) ?? []

  const write = (next) => form.setValues((cur) => setPath(cur, path, next))
  const update = (i, patch) => write(rows.map((r, k) => (k === i ? { ...r, ...patch } : r)))
  const remove = (i) => write(rows.filter((_, k) => k !== i))
  const move = (i, dir) => {
    const j = i + dir
    if (j < 0 || j >= rows.length) return
    const next = [...rows]
    ;[next[i], next[j]] = [next[j], next[i]]
    write(next)
  }
  const add = () => {
    if (rows.length >= max) return
    write([...rows, structuredClone ? structuredClone(blank) : JSON.parse(JSON.stringify(blank))])
  }

  return (
    <div className="rounded-2xl border border-line/12 p-4">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="text-left text-sm font-medium text-bone/90"
          aria-expanded={open}
        >
          {text} {rows.length > 0 && <span className="text-mute">({rows.length})</span>}
        </button>
        <Button type="button" variant="ghost" size="sm" magnetic={false} onClick={add} disabled={rows.length >= max}>
          + {addLabel}
        </Button>
      </div>
      {hint && <p className="mt-1 text-sm text-mute/70">{hint}</p>}
      {form.errors[path] && <p className="mt-1.5 text-sm text-flare">{form.errors[path]}</p>}

      {open && rows.length > 0 && (
        <div className="mt-4 space-y-4">
          {rows.map((row, i) => (
            <div key={i} className="rounded-xl border border-line/10 bg-ink2/40 p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="text-xs uppercase tracking-[0.14em] text-mute">
                  {String(i + 1).padStart(2, '0')} · {itemTitle}
                </span>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded px-2 py-1 text-xs text-mute hover:text-bone disabled:opacity-30" aria-label="Move up">↑</button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} className="rounded px-2 py-1 text-xs text-mute hover:text-bone disabled:opacity-30" aria-label="Move down">↓</button>
                  <button type="button" onClick={() => remove(i)} className="rounded px-2 py-1 text-xs text-flare/80 hover:text-flare" aria-label="Remove">Remove</button>
                </div>
              </div>
              {render(row, i, { update, remove, move })}
            </div>
          ))}
        </div>
      )}

      {open && rows.length === 0 && <p className="mt-3 text-sm text-mute/60">Nothing added yet.</p>}
    </div>
  )
}

/** A field bound to one Repeater row — the value lives in the array, not on a form path. */
export function RowField({ row, onPatch, name, label: text, hint, type = 'text', number = false, options }) {
  const value = row?.[name] ?? ''
  return (
    <FormField label={text} htmlFor={name} hint={hint}>
      {options ? (
        <Select id={name} value={value} onChange={(e) => onPatch({ [name]: e.target.value || null })}>
          <option value="">Select…</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {label(o)}
            </option>
          ))}
        </Select>
      ) : (
        <Input
          id={name}
          type={type}
          value={value}
          onChange={(e) => onPatch({ [name]: number ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value })}
        />
      )}
    </FormField>
  )
}

export function RowArea({ row, onPatch, name, label: text, rows = 3, hint }) {
  return (
    <FormField label={text} htmlFor={name} hint={hint}>
      <Textarea id={name} rows={rows} value={row?.[name] ?? ''} onChange={(e) => onPatch({ [name]: e.target.value })} />
    </FormField>
  )
}

/** Rich text bound to a form path: the editor is controlled, the form kit is not. */export function RichArea({ form, path, ...rest }) {
  return (
    <RichTextEditor
      id={path}
      value={getPath(form.values, path) ?? ''}
      onChange={(html) => form.setValues((cur) => setPath(cur, path, html))}
      error={form.errors[path]}
      {...rest}
    />
  )
}

const IMAGE_TYPES = 'image/png,image/jpeg,image/webp,image/gif'

/**
 * Upload one image and store its asset id on `path`. `urlPath` is where the preview url is kept —
 * pass it inside a wizard, because a step change unmounts this component and the preview would
 * otherwise be lost on the way back. Neither path is sent to the API: wizards build their own
 * payload, and the stored value is only ever the asset id.
 */
export function ImageField({ form, path, urlPath, label: text, hint, purpose = 'OTHER', aspect = 'aspect-[16/9]' }) {
  const inputRef = useRef(null)
  const id = getPath(form.values, path)
  const [url, setUrl] = useState(urlPath ? getPath(form.values, urlPath) : '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const pick = async (file) => {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const { data } = await api.uploadImage(file, { purpose })
      setUrl(data.url)
      form.setValues((cur) => (urlPath ? setPath(setPath(cur, path, data.id), urlPath, data.url) : setPath(cur, path, data.id)))
    } catch (err) {
      setError(err?.message || 'Upload failed. Try again.')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const clear = () => {
    setUrl('')
    form.setValues((cur) => (urlPath ? setPath(setPath(cur, path, null), urlPath, '') : setPath(cur, path, null)))
  }

  return (
    <FormField label={text} hint={hint} error={error || form.errors[path]}>
      <div className="space-y-3">
        {url ? (
          <div className={`${aspect} w-full overflow-hidden rounded-xl border border-line/12 bg-ink2`}>
            <img src={url} alt="" className="h-full w-full object-cover" />
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" size="sm" magnetic={false} disabled={busy} onClick={() => inputRef.current?.click()}>
            {busy ? <Spinner className="h-4 w-4" /> : url || id ? 'Replace image' : 'Upload image'}
          </Button>
          {(url || id) && (
            <button type="button" onClick={clear} className="text-sm text-flare hover:underline">
              Remove
            </button>
          )}
          <span className="text-xs text-mute">PNG, JPEG, WEBP or GIF</span>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_TYPES}
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0])}
      />
    </FormField>
  )
}

/**
 * A gallery bound to a form path holding `[{ assetId, kind, caption }]`. The preview url rides
 * along in the same array (the payload builder drops it), so a wizard step change does not lose it.
 */
export function MediaListField({ form, path, label: text, hint, kind = 'SCREENSHOT', max = 8 }) {
  const inputRef = useRef(null)
  const rows = getPath(form.values, path) ?? []
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const write = (next) => form.setValues((cur) => setPath(cur, path, next))

  const add = async (file) => {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const { data } = await api.uploadImage(file, { purpose: kind })
      write([...rows, { assetId: data.id, url: data.url, kind, caption: '' }])
    } catch (err) {
      setError(err?.message || 'Upload failed. Try again.')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <FormField label={text} hint={hint} error={error || form.errors[path]}>
      <div className="space-y-3">
        {rows.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {rows.map((row, i) => (
              <div key={row.assetId ?? i} className="space-y-2">
                <div className="aspect-video overflow-hidden rounded-xl border border-line/12 bg-ink2">
                  {row.url ? <img src={row.url} alt="" className="h-full w-full object-cover" /> : null}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    value={row.caption ?? ''}
                    placeholder="Caption"
                    onChange={(e) => write(rows.map((r, k) => (k === i ? { ...r, caption: e.target.value } : r)))}
                  />
                  <button
                    type="button"
                    onClick={() => write(rows.filter((_, k) => k !== i))}
                    className="shrink-0 text-sm text-flare hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          magnetic={false}
          disabled={busy || rows.length >= max}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? <Spinner className="h-4 w-4" /> : 'Add screenshot'}
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_TYPES}
        className="hidden"
        onChange={(e) => add(e.target.files?.[0])}
      />
    </FormField>
  )
}

