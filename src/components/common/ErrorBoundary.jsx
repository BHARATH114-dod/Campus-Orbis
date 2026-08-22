import { Component } from 'react';

/**
 * Catches render/lifecycle errors in its subtree and shows a recoverable
 * screen instead of letting the crash blank out the whole page. Does not
 * catch errors in event handlers or async code (React error boundaries
 * never do) — those still need their own try/catch, which is why the
 * Test Monitoring recorder code guards its own MediaRecorder calls. This
 * is a last-resort safety net on top of that, not a replacement for it.
 *
 * @param {{ children: React.ReactNode, message?: string, onReset?: () => void }} props
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught an error:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line bg-paper-card p-8 text-center">
          <p className="text-sm font-semibold text-ink">{this.props.message || 'Something went wrong.'}</p>
          <button
            type="button"
            onClick={this.handleReset}
            className="rounded-full bg-hero-primary px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
