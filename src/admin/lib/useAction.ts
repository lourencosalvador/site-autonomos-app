import { useCallback } from 'react';
import { useToast } from '../../components/Toast';

/**
 * Executa uma ação do painel com feedback: toast de sucesso (opcional) ou de erro.
 * Volta a lançar o erro para quem chama poder manter um diálogo aberto.
 */
export function useAction() {
  const { success, error } = useToast();
  return useCallback(
    async <T,>(fn: () => Promise<T>, successMessage?: string): Promise<T> => {
      try {
        const result = await fn();
        if (successMessage) success(successMessage);
        return result;
      } catch (e) {
        error('Não foi possível concluir', e instanceof Error ? e.message : undefined);
        throw e;
      }
    },
    [success, error],
  );
}
