import { ComingSoon } from '../components/ComingSoon';

export default function Calculadora() {
  return (
    <ComingSoon
      crumb="Vendas"
      title="Calculadora de venda"
      subtitle="Monte o pedido, aplique desconto/frete e simule o parcelamento"
      note="A versão funcional (como no protótipo) entra depois de Produtos e Pedidos estarem prontos, já que ela lê do catálogo e gera um pedido de venda de verdade."
    />
  );
}
