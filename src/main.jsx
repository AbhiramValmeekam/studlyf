import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'framer-motion'
import App from './App'
import { ErrorBoundary } from './components/layout/ErrorBoundary'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import { SmoothScrollProvider } from './lib/lenis'
import './styles/globals.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Outermost, so a throw anywhere below — including inside a provider — still renders the
        fallback instead of unmounting to a blank page. App.jsx keeps its own boundary for
        route-level errors. */}
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ThemeProvider>
            <AuthProvider>
              <MotionConfig reducedMotion="user">
                <SmoothScrollProvider>
                  <App />
                </SmoothScrollProvider>
              </MotionConfig>
            </AuthProvider>
          </ThemeProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
