import React from 'react'
import { Button } from '@/components/ui/button'
import logger from '@/lib/logger'

type Props = {
  children: React.ReactNode
}

type State = {
  hasError: boolean
  error?: Error | null
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Send to centralized logger and optionally a remote error tracker
    try {
      logger.error('Uncaught error in ErrorBoundary:', error, info)
      logger.captureException(error, { info })
    } catch {
      // ignore
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
          <div className="max-w-md text-center bg-white border rounded-lg p-6 shadow">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-sm text-gray-600 mb-4">An unexpected error occurred. Try refreshing the page or come back later.</p>
            <div className="flex items-center justify-center space-x-3">
              <Button onClick={() => window.location.reload()}>Reload</Button>
              <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>Go to Dashboard</Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children as React.ReactElement
  }
}

export default ErrorBoundary
