import { Component, type ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <pre
          id="app-error"
          style={{ padding: 24, color: '#b00020', whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 13 }}
        >
          {String(this.state.error?.message)}
          {'\n\n'}
          {String(this.state.error?.stack)}
        </pre>
      );
    }
    return this.props.children;
  }
}
