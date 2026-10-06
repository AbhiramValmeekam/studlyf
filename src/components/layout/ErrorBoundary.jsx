import { Component } from 'react'

// App-wide safety net. Without this, any error thrown while rendering unmounts
// the whole React tree and leaves a blank white page. Here we catch it, keep
// the chrome usable, and surface the message so failures are diagnosable
// instead of silent.
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Surface to the console so the stack is inspectable in dev.
    console.error('Render error caught by ErrorBoundary:', error, info)
  }

  handleReset = () => {
    this.setState({ error: null })
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="grid min-h-[100svh] place-items-center px-6">
        <div className="card-surface max-w-lg p-8 text-center">
          <p className="eyebrow mb-3">Something broke</p>
          <h1 className="display-face text-2xl tracking-tight">This page hit an error</h1>
          <p className="mt-3 text-sm text-mute">
            The page couldn’t finish loading. You can try again — if it keeps happening, a reload usually clears it.
          </p>
          <pre className="mt-5 max-h-40 overflow-auto rounded-xl bg-line/[0.05] p-3 text-left text-xs text-mute">
            {String(error?.message || error)}
          </pre>
          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={this.handleReset}
              className="rounded-full bg-acid px-5 py-2 text-sm font-semibold text-ink transition-transform hover:-translate-y-0.5"
            >
              Try again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="rounded-full border border-line/15 px-5 py-2 text-sm text-mute transition-colors hover:text-bone"
            >
              Reload
            </button>
          </div>
        </div>
      </div>
    )
  }
}
