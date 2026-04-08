import { FeaturePage } from '@/components/layout/feature-page';

export function SettingsPage() {
  return (
    <FeaturePage
      eyebrow="Configuracao"
      title="Parametros globais"
      description="Taxa horaria, IVA e templates de email editaveis ficam agrupados neste modulo manager-only."
    >
      Area preparada para parametros financeiros e templates de notificacao.
    </FeaturePage>
  );
}
