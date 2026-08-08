import { ComingSoon } from '../components/ComingSoon';

export default function Calendario() {
  return (
    <ComingSoon
      crumb="Financeiro"
      title="Calendário financeiro"
      subtitle="Parcelas, vencimentos e recebimentos"
      note="Vai ser alimentado automaticamente pelas parcelas geradas no módulo de Pedidos de Venda."
    />
  );
}
