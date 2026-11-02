/**
 * Depois de um deploy, um separador aberto com a versão anterior pede ficheiros
 * (chunks) que já não existem no servidor. Nesse caso recarrega a página uma vez
 * para obter a versão nova. Devolve false se já recarregou há pouco (evita ciclos).
 */
const KEY = 'autonomous:chunk-reload-at';

export function isChunkLoadError(error: unknown): boolean {
  const m = error instanceof Error ? `${error.name} ${error.message}` : String(error ?? '');
  return /dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk .* failed|error loading dynamically imported module/i.test(m);
}

export function reloadOnce(): boolean {
  try {
    const last = Number(window.sessionStorage.getItem(KEY) || 0);
    if (Date.now() - last < 30_000) return false;
    window.sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    // sem sessionStorage: recarrega na mesma (uma vez por erro)
  }
  window.location.reload();
  return true;
}

/** `import()` que, se falhar por ser de uma versão antiga, recarrega a página. */
export function importWithReload<T>(load: () => Promise<T>): Promise<T> {
  return load().catch((error) => {
    if (isChunkLoadError(error) && reloadOnce()) return new Promise<T>(() => {});
    throw error;
  });
}
