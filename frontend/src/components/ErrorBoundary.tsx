import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div
          className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4 text-center"
          role="alert"
          aria-live="assertive"
        >
          <div
            className="w-12 h-12 flex items-center justify-center"
            style={{ border: '2px solid var(--text-danger)', color: 'var(--text-danger)' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <h2
            className="text-lg font-bold tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            Something went wrong
          </h2>
          <p
            className="text-xs max-w-md"
            style={{ color: 'var(--text-secondary)' }}
          >
            An unexpected error occurred. Your data is safe — the encryption key
            never left your browser. Try reloading the page.
          </p>
          {this.state.error && (
            <pre
              className="text-[10px] mono p-3 max-w-lg overflow-auto"
              style={{
                color: 'var(--text-tertiary)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
              }}
            >
              {this.state.error.message}
            </pre>
          )}
          <div className="flex gap-3">
            <button
              onClick={this.handleRetry}
              className="btn btn-primary text-xs tracking-wider uppercase"
              style={{ padding: '12px 24px' }}
            >
              Try again
            </button>
            <button
              onClick={() => { window.location.href = '/'; }}
              className="btn btn-ghost text-xs tracking-wider uppercase"
              style={{ padding: '12px 24px', border: '1px solid var(--border-default)' }}
            >
              Go home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
