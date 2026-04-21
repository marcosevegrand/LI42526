import { ApiError } from '@/lib/api/http-client';

const GENERIC_RETRY_HINT = 'Tente novamente dentro de instantes.';

export function getUserFacingError(error: unknown, fallbackMessage: string): string {
  if (error instanceof ApiError) {
    if (error.status === 0 || error.code === 'network_error') {
      return 'Sem ligacao a API. Verifique se o backend esta ativo e tente novamente.';
    }

    if (error.status === 401) {
      return 'A sessao expirou. Inicie sessao novamente.';
    }

    if (error.status === 403) {
      return 'Nao tem permissoes para esta operacao.';
    }

    if (error.status >= 500) {
      return `O servidor encontrou um problema. ${GENERIC_RETRY_HINT}`;
    }

    if (error.message && error.message !== 'Request failed') {
      return error.message;
    }
  }

  if (error instanceof Error && /network|fetch/i.test(error.message)) {
    return 'Falha de ligacao de rede. Confirme a conexao e tente novamente.';
  }

  return `${fallbackMessage} ${GENERIC_RETRY_HINT}`;
}
