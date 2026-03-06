'use client';

import { Component, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

type Props = { children: ReactNode; fallback?: ReactNode };

type State = { hasError: boolean; error?: Error };

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div
          className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-8 text-center"
          role="alert"
        >
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400">
            <AlertTriangle className="h-7 w-7" aria-hidden />
          </div>
          <h3 className="text-base font-medium text-red-800 dark:text-red-200">Terjadi kesalahan</h3>
          <p className="mt-2 text-sm text-red-700 dark:text-red-300">
            {this.state.error?.message ?? 'Silakan muat ulang halaman.'}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
          >
            Muat ulang
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
