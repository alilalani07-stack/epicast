import { Component } from 'react';
import ErrorState from './ErrorState.jsx';

/**
 * Top-level React error boundary.
 * Catches render errors anywhere in the tree and shows a friendly UI.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
    this.handleReset = this.handleReset.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[EpiCast] Render error:', error, info);
  }

  handleReset() {
    this.setState({ error: null });
    // Soft reset — try re-rendering. If still broken, send the user home.
    if (typeof window !== 'undefined') window.location.assign('/');
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-canvas flex items-center justify-center px-6">
          <ErrorState
            error={{ message: this.state.error?.message || 'Unexpected error.' }}
            onRetry={this.handleReset}
          />
        </div>
      );
    }
    return this.props.children;
  }
}
