import { useMemo } from 'react';
import { useCollection } from '../hooks/useCollection';
import { StatCard, Card, Loading } from '../components/ui';
import { Icon } from '../components/Icons';
import { money } from '../lib/format';

export default function Dashboard() {
  const { data: entradas, loading: l1 } = useCollection('entradas');
  const { data: saidas, loading: l2 } = useCollection('saidas');
  const { data: produtos, loading: l3 } = useCollection('produtos');
  const { data: clientes, loading: l4 } = useCollection('clientes');
  const { data: pedidos, loading: l5 } = useCollection('pedidos');

  const loading = l1 || l2 || l3 || l4 || l5;

  const stats = useMemo(() => {
    const totalEntradas = entradas.reduce((s, e) => s + (Number(e.valor) || 0), 0);
    const totalSaidas = saidas.reduce((s, e) => s + (Number(e.valor) || 0), 0);
    const estoqueBaixo = produtos.filter((p) => Number(p.estoque) <= Number(p.estoqueMinimo)).length;
    const totalEstoque = produtos.reduce((s, p) => s + (Number(p.estoque) || 0), 0);
    return { totalEntradas, totalSaidas, estoqueBaixo, totalEstoque };
  }, [entradas, saidas, produtos]);

  if (loading) return <Loading />;

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-[22px] font-extrabold tracking-tight font-display">Visão geral</h1>
        <div className="text-[13px] text-muted mt-1">Resumo em tempo real dos dados da sua empresa</div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <StatCard icon={Icon.wallet} color="blue" num={money(stats.totalEntradas)} label="Total de entradas" />
        <StatCard icon={Icon.arrowUp} color="red" num={money(stats.totalSaidas)} label="Total de saídas" />
        <StatCard icon={Icon.box} color="blue" num={stats.totalEstoque} label="Produtos em estoque" />
        <StatCard icon={Icon.layers} color="red" num={`${stats.estoqueBaixo} itens`} label="Estoque baixo" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        <StatCard icon={Icon.users} color="green" num={clientes.length} label="Clientes cadastrados" />
        <StatCard icon={Icon.cart} color="blue" num={pedidos.length} label="Pedidos realizados" />
        <StatCard icon={Icon.tag} color="blue" num={produtos.length} label="Produtos cadastrados" />
        <StatCard icon={Icon.calendar} color="orange" num="—" label="Próximos recebimentos" />
      </div>

      {(entradas.length === 0 && produtos.length === 0 && clientes.length === 0) && (
        <Card className="p-6 text-center">
          <div className="font-bold text-[14.5px] mb-1">Comece cadastrando seus dados</div>
          <div className="text-[13px] text-muted">
            Cadastre suas categorias, produtos e clientes para começar a ver os números do seu negócio aqui.
          </div>
        </Card>
      )}
    </div>
  );
}
