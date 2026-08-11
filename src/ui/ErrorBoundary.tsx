/**
 * Last line of defence around the whole flow.
 *
 * A thrown render error would otherwise leave a blank white page with no way
 * back — the worst possible outcome for a tool someone opened once from a
 * phone. Reloading is offered as the recovery, since all state is in memory.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  failed: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // No telemetry is collected; this is here so the cause is visible in the
    // console when someone reports a problem.
    console.error('Card builder failed to render', error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.failed) return this.props.children;

    return (
      <div className="fallback" role="alert">
        <h1 className="fallback__title">Something broke on our side</h1>
        <p className="fallback__body">
          Your photo never left your device. Reload and try again — it usually works second time.
        </p>
        <button type="button" className="button button--primary" onClick={() => location.reload()}>
          Reload
        </button>
      </div>
    );
  }
}
