import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { formatDate } from '../../lib/format'
import { EmptyState } from '../../components/ui/atoms'
import { Panel, ProductPage, QueryState } from '../../components/ecosystem/product'
import { Area, SaveRow, Text, useForm } from '../../components/ecosystem/forms'
import { useFounderProfile } from './shared'

export default function UpdatesPage() {
  const qc = useQueryClient()
  const q = useFounderProfile()
  const form = useForm({ title: '', body: '' })
  const [removing, setRemoving] = useState(null)

  const post = (e) => {
    e.preventDefault()
    form.run(async (v) => {
      const { data } = await api.addStartupUpdate({ title: v.title, body: v.body })
      qc.setQueryData(['founder', 'profile'], data)
      form.setValues({ title: '', body: '' })
    }, 'Update posted.')
  }
  const remove = async (id) => {
    if (!window.confirm('Delete this update?')) return
    setRemoving(id)
    try {
      const { data } = await api.deleteStartupUpdate(id)
      qc.setQueryData(['founder', 'profile'], data)
    } finally {
      setRemoving(null)
    }
  }

  const updates = q.data?.updates ?? []
  return (
    <ProductPage eco="FOUNDER" title="Startup updates" subtitle="Short progress notes — pilots, hires, launches. Verified investors see your latest five.">
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Panel title="Post an update">
          <form onSubmit={post} className="space-y-4" noValidate>
            <Text form={form} path="title" label="Title" placeholder="e.g. Second FPO signed" />
            <Area form={form} path="body" label="What happened" rows={4} />
            <SaveRow form={form}>Post update</SaveRow>
          </form>
        </Panel>
        <QueryState query={q}>
          {updates.length ? (
            <ol className="space-y-3">
              {updates.map((u) => (
                <li key={u.id} className="card-surface p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-bone">{u.title}</p>
                      <p className="mt-0.5 text-xs text-mute">{formatDate(u.createdAt)}</p>
                    </div>
                    <button type="button" onClick={() => remove(u.id)} disabled={removing === u.id} className="text-sm text-mute hover:text-flare">
                      Delete
                    </button>
                  </div>
                  <p className="mt-3 whitespace-pre-line text-sm text-mute">{u.body}</p>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState title="No updates yet" hint="Your first update tells investors the startup is moving." />
          )}
        </QueryState>
      </div>
    </ProductPage>
  )
}
