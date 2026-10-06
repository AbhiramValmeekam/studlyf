import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { CompleteProfileModal } from './CompleteProfileModal'
import { ecosystemFromPath, isBuilderSharedPath } from '../../lib/ecosystems'

// Pages that already show the full profile editor — never pop the prompt over them.
const PROFILE_PAGES = ['/account', '/builders/profile']
const SNOOZE_KEY = (userId) => `studlyf:profile-prompt-snoozed:${userId}`

function isSnoozed(userId) {
  try {
    return !!userId && sessionStorage.getItem(SNOOZE_KEY(userId)) === '1'
  } catch {
    return false
  }
}

function snooze(userId) {
  try {
    sessionStorage.setItem(SNOOZE_KEY(userId), '1')
  } catch {
    // storage unavailable (private mode) — the prompt simply may reappear
  }
}

/**
 * Opens the "Complete your profile" dialog for signed-in members whose required
 * profile fields are still missing — right after sign-up, and on later visits until
 * they finish. "Skip for now" snoozes it for the rest of the browser session.
 */
export function ProfilePrompt() {
  const { user, isAuthed, isBuilder } = useAuth()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [snoozed, setSnoozed] = useState(false)

  useEffect(() => setSnoozed(isSnoozed(user?.id)), [user?.id])

  // Student details (college, branch, year, links) are asked only of builders, and only while
  // they're in the builder experience — never over an investor, HR, founder or org dashboard.
  const inBuilderArea = ecosystemFromPath(pathname) === 'BUILDER' || isBuilderSharedPath(pathname)
  const needsProfile =
    isAuthed && !!user && isBuilder && inBuilderArea && !user.admin && user.completion && !user.completion.isComplete && !snoozed

  useEffect(() => {
    if (open || !needsProfile || PROFILE_PAGES.includes(pathname)) return
    // Let the page paint first so the dialog doesn't feel like it blocked navigation.
    const t = setTimeout(() => setOpen(true), 700)
    return () => clearTimeout(t)
  }, [needsProfile, pathname, open])

  // Signing out mid-flow closes it.
  useEffect(() => {
    if (!isAuthed) setOpen(false)
  }, [isAuthed])

  const close = () => {
    // Still incomplete → don't nag again this session. Complete → nothing to snooze.
    if (!user?.completion?.isComplete) {
      snooze(user?.id)
      setSnoozed(true)
    }
    setOpen(false)
  }

  return (
    <AnimatePresence>
      {open && user && <CompleteProfileModal key={user.id} user={user} onClose={close} onFinished={() => setOpen(false)} />}
    </AnimatePresence>
  )
}
