import { createContext, useContext, useReducer, useCallback, useMemo } from 'react'

/**
 * In-memory session state for cross-flow actions a reviewer takes while walking
 * the prototype: saved/applied opportunities, submissions, investor connections,
 * HR shortlist + hiring pipeline stage. Resets on refresh (MVP scope).
 */
const SessionContext = createContext(null)

const initialState = {
  saved: [], // opportunity ids
  applications: [], // { id, oppId, oppTitle, org, status, submittedAt, team, project }
  connections: [], // startup/founder ids the investor connected with
  shortlist: [], // candidate ids HR shortlisted
  pipeline: {}, // candidateId -> stage key
  drafts: {}, // oppId -> partial application form
}

function reducer(state, action) {
  switch (action.type) {
    case 'TOGGLE_SAVE': {
      const has = state.saved.includes(action.id)
      return { ...state, saved: has ? state.saved.filter((s) => s !== action.id) : [...state.saved, action.id] }
    }
    case 'SAVE_DRAFT':
      return { ...state, drafts: { ...state.drafts, [action.oppId]: action.data } }
    case 'SUBMIT_APPLICATION': {
      const drafts = { ...state.drafts }
      delete drafts[action.app.oppId]
      return { ...state, applications: [action.app, ...state.applications], drafts }
    }
    case 'TOGGLE_CONNECT': {
      const has = state.connections.includes(action.id)
      return { ...state, connections: has ? state.connections.filter((c) => c !== action.id) : [...state.connections, action.id] }
    }
    case 'TOGGLE_SHORTLIST': {
      const has = state.shortlist.includes(action.id)
      const pipeline = { ...state.pipeline }
      if (has) delete pipeline[action.id]
      else pipeline[action.id] = pipeline[action.id] || 'shortlisted'
      return {
        ...state,
        shortlist: has ? state.shortlist.filter((s) => s !== action.id) : [...state.shortlist, action.id],
        pipeline,
      }
    }
    case 'SET_STAGE':
      return { ...state, pipeline: { ...state.pipeline, [action.id]: action.stage } }
    default:
      return state
  }
}

export function SessionProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const api = useMemo(
    () => ({
      toggleSave: (id) => dispatch({ type: 'TOGGLE_SAVE', id }),
      saveDraft: (oppId, data) => dispatch({ type: 'SAVE_DRAFT', oppId, data }),
      submitApplication: (app) => dispatch({ type: 'SUBMIT_APPLICATION', app }),
      toggleConnect: (id) => dispatch({ type: 'TOGGLE_CONNECT', id }),
      toggleShortlist: (id) => dispatch({ type: 'TOGGLE_SHORTLIST', id }),
      setStage: (id, stage) => dispatch({ type: 'SET_STAGE', id, stage }),
    }),
    [],
  )

  return <SessionContext.Provider value={{ ...state, ...api }}>{children}</SessionContext.Provider>
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used within SessionProvider')
  return ctx
}
