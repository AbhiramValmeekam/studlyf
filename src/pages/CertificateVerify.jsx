import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { api } from '../lib/api'
import { useSeo } from '../lib/seo'
import { formatDate } from '../lib/format'
import { EASE } from '../lib/motion'
import { Badge, Spinner } from '../components/ui/atoms'
import { ArrowIcon, Button } from '../components/ui/Button'
import { Input } from '../components/ui/Field'
import { label } from '../components/ecosystem/product'
import { NotFoundInline } from './NotFound'

/**
 * Public certificate verification (spec §18). Reached by scanning/typing the code on a
 * certificate — no account, no session. It has to survive three outcomes: never issued,
 * issued and valid, and issued but revoked.
 */
export default function CertificateVerify() {
  const { code = '' } = useParams()
  const navigate = useNavigate()
  const [typed, setTyped] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['certificate-verify', code],
    queryFn: () => api.verifyCertificate(code).then((r) => r.data),
    enabled: !!code,
    retry: false,
  })

  useSeo({
    title: data ? `${data.title} — verified | STUDLYF` : 'Verify a certificate | STUDLYF',
    description: 'Check a STUDLYF certificate against its verification code.',
    path: `/certificates/verify/${code}`,
  })

  const submit = (e) => {
    e.preventDefault()
    const next = typed.trim().replace(/[\s-]/g, '').toUpperCase()
    if (next) navigate(`/certificates/verify/${encodeURIComponent(next)}`)
  }

  const notFound = error?.status === 404

  return (
    <article className="pb-32 pt-36 md:pt-44">
      <div className="wrap max-w-3xl">
        {isLoading && code && (
          <div className="grid min-h-[40svh] place-items-center">
            <Spinner className="h-8 w-8 text-acid" />
          </div>
        )}

        {notFound && !isLoading && <NotFoundInline kind="certificate" backTo="/" />}

        {error && !notFound && (
          <div className="rounded-2xl border border-flare/30 bg-flare/[0.06] p-6 text-bone">
            We couldn’t check that code just now. Try again in a moment.
          </div>
        )}

        {data && (
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}>
            <div className="mb-5 flex flex-wrap items-center gap-2.5">
              <Badge tone={data.valid ? 'open' : 'urgent'}>{data.valid ? 'Verified' : 'Revoked'}</Badge>
              <span className="text-sm text-mute">{label(data.type)}</span>
            </div>
            <h1 className="display-face text-balance text-huge">{data.title}</h1>
            <p className="mt-5 text-lede text-bone/90">
              {data.valid
                ? `Issued by ${data.issuer} to ${data.recipient}.`
                : `This certificate was issued to ${data.recipient} but is no longer valid.`}
            </p>
            {!data.valid && data.revokedReason && <p className="mt-3 text-mute">{data.revokedReason}</p>}

            <dl className="mt-10 divide-y divide-line/10 rounded-2xl border border-line/12">
              {[
                ['Recipient', data.recipient],
                ['Issued by', data.issuer],
                ['Program', data.opportunity],
                ['Issued on', data.issueDate ? formatDate(data.issueDate) : null],
                ['Verification code', data.verificationCode],
              ].map(([term, value]) =>
                value ? (
                  <div key={term} className="grid gap-1 px-5 py-4 sm:grid-cols-[10rem_1fr] sm:gap-4">
                    <dt className="text-sm text-mute">{term}</dt>
                    <dd className="text-bone">{value}</dd>
                  </div>
                ) : null,
              )}
            </dl>
          </motion.div>
        )}

        <section className="mt-16 border-t border-line/10 pt-10">
          <h2 className="display-face text-2xl tracking-tight">Check another certificate</h2>
          <p className="mt-2 max-w-xl text-sm text-mute">Type the code printed on the certificate — spaces and dashes are fine.</p>
          <form onSubmit={submit} className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Input
              aria-label="Verification code"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="e.g. K7M2QP4XR9TD"
              className="sm:max-w-xs"
            />
            <Button type="submit" magnetic={false} disabled={!typed.trim()}>
              Verify <ArrowIcon />
            </Button>
          </form>
        </section>
      </div>
    </article>
  )
}
