import { Component, type ReactNode } from 'react';

// Keeps one broken page from blanking the whole app (header and navigation stay usable).
export class ErrorBoundary extends Component<{ children: ReactNode; resetKey: string }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidUpdate(prev: { resetKey: string }) {
    if (this.state.failed && prev.resetKey !== this.props.resetKey) this.setState({ failed: false });
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="card mx-auto mt-10 max-w-lg p-10 text-center" role="alert">
        <h1 className="text-3xl font-semibold">A page fell off the shelf</h1>
        <p className="mt-3 text-ink-muted">Something went wrong showing this page. Reloading usually fixes it.</p>
        <button type="button" className="btn-primary mt-6" onClick={() => location.reload()}>Reload the page</button>
      </div>
    );
  }
}
