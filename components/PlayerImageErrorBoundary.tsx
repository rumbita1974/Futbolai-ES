/**
 * Player Image Error Boundary - Catches errors from PlayerCard components
 * Prevents entire page crash if one player card fails
 */

import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class PlayerImageErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[PlayerImageErrorBoundary] Caught error:', error);
    console.error('[PlayerImageErrorBoundary] Error info:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="player-card border-2 border-red-300 bg-red-50 rounded-lg p-4">
          <div className="text-center">
            <span className="text-2xl">⚠️</span>
            <p className="text-sm font-semibold text-red-700 mt-2">Failed to load player</p>
            <p className="text-xs text-red-600 mt-1">
              {this.state.error?.message || 'Unknown error'}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Wrapper component for multiple player cards with shared error boundary
 */
interface PlayerGridErrorBoundaryProps {
  children: React.ReactNode;
  fallbackMessage?: string;
}

interface PlayerGridErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class PlayerGridErrorBoundary extends React.Component<
  PlayerGridErrorBoundaryProps,
  PlayerGridErrorBoundaryState
> {
  constructor(props: PlayerGridErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): PlayerGridErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[PlayerGridErrorBoundary] Caught error:', error);
    console.error('[PlayerGridErrorBoundary] Error info:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full bg-red-50 border-2 border-red-300 rounded-lg p-8 text-center">
          <span className="text-4xl">⚠️</span>
          <h3 className="text-lg font-bold text-red-700 mt-4">
            {this.props.fallbackMessage || 'Unable to load player grid'}
          </h3>
          <p className="text-sm text-red-600 mt-2">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
