import { Component } from 'react';
import { captureError } from '../lib/errorMonitoring';

// Last-resort boundary for a crashed route. The fallback deliberately never
// renders error.message: error text can carry clinical fragments, and this
// screen is the one thing everyone sees when everything else has failed.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    const firstFrame = String(info?.componentStack || '')
      .split('\n')
      .map((line) => line.trim())
      .find(Boolean);
    captureError(error, {
      component: firstFrame || 'unknown',
      route: typeof window !== 'undefined' ? window.location.pathname : '',
    });
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="error-boundary">
        <h1>This screen could not be loaded</h1>
        <p>
          Clinical records are safe. Reload the page to try again; if it keeps
          happening, ask the app administrator to check the error report.
        </p>
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
          Reload
        </button>
      </div>
    );
  }
}
