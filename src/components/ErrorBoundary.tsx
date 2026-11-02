import { Component, type ReactNode } from 'react';
import { isChunkLoadError, reloadOnce } from '../lib/chunkReload';

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    // Ficheiro de uma versão antiga: recarregar resolve.
    if (isChunkLoadError(error)) reloadOnce();
  }

  render() {
    if (this.state.error) {
      const outdated = isChunkLoadError(this.state.error);
      return (
        <div id="app-error" className="flex min-h-[100dvh] items-center justify-center bg-cloud-50 p-6">
          <div className="w-full max-w-md rounded-2xl border border-line bg-white p-8 text-center">
            <img src="/logo-principal.svg" alt="AUTONOMOUS" className="mx-auto h-8 w-36 object-cover object-left" />
            <h1 className="mt-6 text-xl font-semibold tracking-tight text-ink-900">
              {outdated ? 'Há uma versão nova da plataforma' : 'Algo correu mal'}
            </h1>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-500">
              {outdated ? 'Recarregue a página para continuar com a versão mais recente.' : 'Recarregue a página. Se o problema continuar, fale connosco.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl bg-brand-dark px-5 text-base font-semibold text-white transition-colors hover:bg-brand-dark2"
            >
              Recarregar
            </button>
            <p className="mt-4 break-words font-mono text-xs text-ink-300">{String(this.state.error?.message).slice(0, 160)}</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
