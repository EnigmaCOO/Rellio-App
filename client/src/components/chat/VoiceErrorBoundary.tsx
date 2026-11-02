import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Determines whether an error is non-critical noise that should be silently
 * swallowed rather than shown to the user.
 *
 * Rules:
 * - DevTools / Eruda injection errors → ignore.
 * - Vite HMR WebSocket errors → ignore (identified by stack containing
 *   "@vite/client", "vite/client", or "/__vite_hmr" — these are development
 *   tooling, not app errors).
 * - Generic "websocket" strings are NOT suppressed here so that real app-level
 *   WebSocket failures (e.g., voice streaming) surface to the user.
 */
function isNonCriticalError(error: Error): boolean {
  const msg = error.toString().toLowerCase();
  const stack = error.stack?.toLowerCase() ?? "";

  // DevTools / Eruda
  if (
    msg.includes("eruda") ||
    stack.includes("eruda") ||
    msg.includes("devtools") ||
    stack.includes("devtools")
  ) {
    return true;
  }

  // Vite HMR WebSocket — identified by the Vite client stack signature.
  // The raw error message may say "failed to construct 'websocket'" with
  // "localhost:undefined" only when it comes from @vite/client, not our app.
  const isViteHmr =
    stack.includes("@vite/client") ||
    stack.includes("vite/client") ||
    stack.includes("/__vite_hmr") ||
    (msg.includes("localhost:undefined") && stack.includes("vite"));

  if (isViteHmr) {
    return true;
  }

  return false;
}

export class VoiceErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    console.error('🚨 Voice Error Boundary caught error:', error);

    if (isNonCriticalError(error)) {
      console.log('📝 Non-critical error ignored (DevTools/Vite HMR):', error.message);
      return { hasError: false, error: null, errorInfo: null };
    }

    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 Voice Error Details:', error, errorInfo);

    if (isNonCriticalError(error)) {
      console.log('📝 Non-critical error, continuing operation (DevTools/Vite HMR)...');
      this.setState({ hasError: false, error: null, errorInfo: null });
    } else {
      this.setState({ error, errorInfo });
    }
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <Card className="p-6 border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-gray-700" />
            <h3 className="text-lg font-semibold text-gray-900">
              Voice System Error
            </h3>
          </div>

          <div className="space-y-4">
            <p className="text-gray-700">
              The voice system encountered an error and needs to be reset.
            </p>

            {this.state.error && (
              <details className="bg-gray-100 p-3 rounded text-sm">
                <summary className="cursor-pointer font-medium text-gray-800">
                  Error Details
                </summary>
                <pre className="mt-2 text-gray-700 whitespace-pre-wrap">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <Button
              onClick={this.handleRetry}
              className="bg-gray-900 hover:bg-gray-700 text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry Voice System
            </Button>
          </div>
        </Card>
      );
    }

    return this.props.children;
  }
}
