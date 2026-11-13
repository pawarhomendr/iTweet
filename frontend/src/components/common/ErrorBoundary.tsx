import { Component, ErrorInfo, ReactNode } from 'react';

/**
 * ErrorBoundary component to catch unexpected React render exceptions and prevent full white-screen crashes.
 * Called by App.tsx around the routing tree. No existing file serves this purpose.
 * Implemented per user approval instruction to provide a friendly fallback UI consistent with Indiagram's editorial design.
 */
interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(_error: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="shell" style={{ padding: '80px 20px', textAlign: 'center' }}>
          <div style={{ maxWidth: '480px', margin: '0 auto' }}>
            <p className="eyebrow" style={{ color: 'var(--accent)' }}>{'// unexpected error'}</p>
            <h2 style={{ fontSize: '28px', marginTop: '12px', fontFamily: 'var(--heading)' }}>Something went wrong.</h2>
            <p className="prose" style={{ marginTop: '12px', color: 'var(--ink-2)' }}>
              An unexpected error occurred while rendering this page. You can try refreshing or returning to the feed.
            </p>
            <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-accent"
                onClick={() => {
                  this.setState({ hasError: false });
                  window.location.reload();
                }}
              >
                Reload page
              </button>
              <a href="/" className="btn btn-ghost">
                Return home
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
