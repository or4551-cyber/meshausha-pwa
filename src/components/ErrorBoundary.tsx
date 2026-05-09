import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info)
  }

  handleReload = (): void => {
    window.location.reload()
  }

  handleGoHome = (): void => {
    window.location.href = '/'
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="min-h-screen bg-primary flex items-center justify-center px-4 safe-area-inset">
        <div className="bg-secondary rounded-3xl p-6 shadow-2xl max-w-md w-full text-center">
          <div className="text-5xl mb-4" aria-hidden>⚠️</div>
          <h1 className="font-black text-primary text-2xl mb-2">משהו השתבש</h1>
          <p className="text-primary/60 font-bold text-sm mb-6">
            נתקלנו בתקלה לא צפויה. נסה לטעון מחדש או לחזור לדף הבית.
          </p>
          {this.state.error?.message && (
            <p className="text-primary/40 text-xs font-mono mb-6 break-all" dir="ltr">
              {this.state.error.message}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={this.handleReload}
              className="flex-1 bg-primary text-secondary font-bold py-3 rounded-xl active:scale-95 transition-transform touch-manipulation"
            >
              טען מחדש
            </button>
            <button
              onClick={this.handleGoHome}
              className="flex-1 bg-primary/10 text-primary font-bold py-3 rounded-xl active:scale-95 transition-transform touch-manipulation"
            >
              לדף הבית
            </button>
          </div>
        </div>
      </div>
    )
  }
}
