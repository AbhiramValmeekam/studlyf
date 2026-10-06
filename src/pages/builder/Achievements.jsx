import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { formatDate } from '../../lib/format'
import { USER_ACHIEVEMENT_TYPES } from '../../lib/enums'
import { Badge } from '../../components/ui/atoms'
import { Button } from '../../components/ui/Button'
import { Panel, ProductPage, QueryState, label } from '../../components/ecosystem/product'
import { Area, Choice, SaveRow, Text, clean, useForm } from '../../components/ecosystem/forms'
import { RevealGroup, RevealItem, trackSpotlight } from '../../components/ui/Reveal'
import { EASE } from '../../lib/motion'

const EMPTY = { title: '', type: 'CERTIFICATE', issuer: '', date: '', url: '', description: '', visibility: 'PUBLIC' }

/**
 * /builders/achievements — platform-issued achievements (verified automatically when you submit,
 * get shortlisted, win or complete a project) plus ones you add yourself, which stay "unverified"
 * until the STUDLYF team checks them.
 */
export default function BuilderAchievements() {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['achievements', 'mine'], queryFn: () => api.myAchievements({ pageSize: 100 }).then((r) => r.data) })
  const [adding, setAdding] = useState(false)
  const form = useForm(EMPTY)
  const refresh = () => qc.invalidateQueries({ queryKey: ['achievements'] })

  const submit = (e) => {
    e.preventDefault()
    form.run(async (v) => {
      const body = clean(v)
      if (body.date) body.date = new Date(body.date).toISOString()
      await api.createAchievement(body)
      form.setValues(EMPTY)
      setAdding(false)
      refresh()
    }, 'Achievement added — it shows as unverified until reviewed.')
  }
  const toggleVisibility = async (a) => {
    await api.updateAchievement(a.id, { visibility: a.visibility === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC' })
    refresh()
  }
  const remove = async (a) => {
    if (!window.confirm(`Delete “${a.title}”?`)) return
    await api.deleteAchievement(a.id)
    refresh()
  }

  return (
    <ProductPage
      eco="BUILDER"
      title="Achievements"
      subtitle="Verified by STUDLYF when they come from your projects and opportunities. Add others yourself — they’re marked unverified until reviewed."
      actions={!adding && <Button magnetic={false} onClick={() => setAdding(true)}>Add achievement</Button>}
    >
      {adding && (
        <Panel title="Add an achievement" className="mb-6">
          <form onSubmit={submit} className="space-y-5" noValidate>
            <div className="grid gap-5 md:grid-cols-2">
              <Text form={form} path="title" label="Title" placeholder="e.g. Finalist — CodeSprint 2025" required />
              <Choice form={form} path="type" label="Type" options={USER_ACHIEVEMENT_TYPES} placeholder="Choose a type" />
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              <Text form={form} path="issuer" label="Issued by" />
              <Text form={form} path="date" label="Date" type="date" />
              <Text form={form} path="url" label="Proof link" type="url" hint="Certificate or results page." />
            </div>
            <Area form={form} path="description" label="Description" rows={3} />
            <SaveRow form={form} extra={<Button type="button" variant="ghost" magnetic={false} onClick={() => setAdding(false)}>Cancel</Button>}>Add achievement</SaveRow>
          </form>
        </Panel>
      )}
      <QueryState query={q} empty={q.data?.length === 0} emptyTitle="No achievements yet" emptyHint="Submit a project to an opportunity — participation, shortlists and wins are added automatically.">
        <RevealGroup className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(q.data ?? []).map((a) => (
            <RevealItem
              as="article"
              key={a.id}
              onMouseMove={trackSpotlight}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.25, ease: EASE }}
              className="spotlight-card card-surface flex flex-col p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <Badge tone={a.verified ? 'open' : a.verificationStatus === 'REJECTED' ? 'urgent' : 'neutral'}>
                  {a.verified ? 'Verified' : a.verificationStatus === 'REJECTED' ? 'Not verified' : 'Unverified'}
                </Badge>
                <span className="text-xs text-mute">{formatDate(a.date)}</span>
              </div>
              <p className="mt-4 font-semibold text-bone">{a.title}</p>
              <p className="text-sm text-mute">{label(a.type)}{a.issuer ? ` · ${a.issuer}` : ''}</p>
              {a.description && <p className="mt-2 text-sm text-mute">{a.description}</p>}
              {a.project && <p className="mt-2 text-xs text-mute">Project: <span className="text-bone">{a.project.title}</span></p>}
              {a.url && <a href={a.url} target="_blank" rel="noreferrer" className="mt-2 text-xs text-acid hover:underline">Proof ↗</a>}
              <div className="mt-auto flex items-center gap-4 pt-5 text-sm">
                <button type="button" onClick={() => toggleVisibility(a)} className="text-mute hover:text-bone">
                  {a.visibility === 'PUBLIC' ? 'Hide from profile' : 'Show on profile'}
                </button>
                {a.editable && (
                  <button type="button" onClick={() => remove(a)} className="text-mute hover:text-flare">Delete</button>
                )}
                <span className="ml-auto text-xs text-mute">{a.source === 'SYSTEM' ? 'Issued by STUDLYF' : 'Added by you'}</span>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </QueryState>
    </ProductPage>
  )
}
