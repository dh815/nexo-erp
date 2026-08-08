import { ComingSoon } from '../components/ComingSoon';

export default function Pedidos() {
  return (
    <ComingSoon
      crumb="Vendas"
      title="Pedidos de Venda"
      subtitle="Acompanhe todos os pedidos, status e parcelas"
      note="Vamos construir este módulo já usando o mesmo padrão de Produtos e Clientes: pedido gera baixa automática de estoque e, quando parcelado, cria as parcelas no Calendário financeiro."
    />
  );
}
