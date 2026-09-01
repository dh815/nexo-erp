import { useMemo } from 'react';
import { useCollection } from '../hooks/useCollection';
import { StatCard, Card, StatCardSkeleton, Skeleton } from '../components/ui';
import { Icon } from '../components/Icons';
import { money } from '../lib/format';

export default function Dashboard() {
  const { data: entradas, loading: l1 } = useCollection('entradas');
  const { data: saidas, loading: l2 } = useCollection('saidas');
  const { data: produtos, loading: l3 } = useCollection('produtos');
  const { data: clientes, loading: l4 } = useCollection('clientes');
  const { data: pedidos, loading: l5 } = useCollection('pedidos');
  const { data: parcelas, loading: l6 } = useCollection('parcelas');

  const loading = l1 || l2 || l3 || l4 || l5 || l6;

  const stats = useMemo(() => {
    const totalEntradas = entradas.reduce((s, e) => s + (Number(e.valor) || 0), 0);
    const totalSaidas = saidas.reduce((s, e) => s + (Number(e.valor) || 0), 0);
    const estoqueBaixo = produtos.filter((p) => Number(p.estoque) <= Number(p.estoqueMinimo)).length;
    const totalEstoque = produtos.reduce((s, p) => s + (Number(p.estoque) || 0), 0);
    const todayKey = new Date().toISOString().slice(0, 10);
    const pendentes = parcelas.filter((p) => p.status !== 'pago');
    const vencidas = pendentes.filter((p) => p.vencimento < todayKey);
    const aReceber = pendentes.reduce((s, p) => s + (Number(p.valor) || 0), 0);
    const vencidoTotal = vencidas.reduce((s, p) => s + (Number(p.valor) || 0), 0);
    const proximos = pendentes
      .filter((p) => p.vencimento >= todayKey)
      .sort((a, b) => a.vencimento.localeCompare(b.vencimento))
      .slice(0, 4);
    return { totalEntradas, totalSaidas, estoqueBaixo, totalEstoque, aReceber, vencidoTotal, proximos, vencidasCount: vencidas.length };
  }, [entradas, saidas, produtos, parcelas]);

  const semDados = !loading && entradas.length === 0 && produtos.length === 0 && clientes.length === 0 && pedidos.length === 0;

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-[22px] font-extrabold tracking-tight font-display">Visão geral</h1>
        <div className="text-[13px] text-muted mt-1">Resumo em tempo real dos dados da sua empresa</div>
      </div>

      {loading ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <StatCard icon={Icon.wallet} color="blue" num={money(stats.totalEntradas)} label="Total vendido / recebido" />
            <StatCard icon={Icon.calendar} color="orange" num={money(stats.aReceber)} label="Valor a receber" />
            <StatCard icon={Icon.bell} color="red" num={`${stats.vencidasCount} · ${money(stats.vencidoTotal)}`} label="Contas vencidas" />
            <StatCard icon={Icon.arrowUp} color="red" num={money(stats.totalSaidas)} label="Total de saídas" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            <StatCard icon={Icon.box} color="blue" num={stats.totalEstoque} label="Produtos em estoque" />
            <StatCard icon={Icon.layers} color="red" num={`${stats.estoqueBaixo} itens`} label="Estoque baixo" />
            <StatCard icon={Icon.users} color="green" num={clientes.length} label="Clientes cadastrados" />
            <StatCard icon={Icon.cart} color="blue" num={pedidos.length} label="Pedidos realizados" />
          </div>
        </>
      )}

      <Card className="p-5">
        <div className="font-bold text-[14.5px] mb-3">Próximos recebimentos</div>
        {loading ? (
          <div className="flex flex-col gap-2.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-1">
                <div>
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-2.5 w-24 mt-1.5" />
                </div>
                <Skeleton className="h-3.5 w-16" />
              </div>
            ))}
          </div>
        ) : stats.proximos.length === 0 ? (
          <div className="text-[12.5px] text-faint py-4 text-center">Nenhuma parcela a vencer no momento.</div>
        ) : (
          <div className="flex flex-col gap-1">
            {stats.proximos.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-[#f0f2f8] last:border-0">
                <div>
                  <div className="text-[13px] font-semibold">{p.clienteNome}</div>
                  <div className="text-[11px] text-faint">{new Date(p.vencimento + 'T00:00:00').toLocaleDateString('pt-BR')} · parcela {p.numero}/{p.totalParcelas}</div>
                </div>
                <div className="font-bold text-[13px]">{money(p.valor)}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {semDados && (
        <Card className="p-6 text-center mt-4">
          <div className="font-bold text-[14.5px] mb-1">Comece cadastrando seus dados</div>
          <div className="text-[13px] text-muted">
            Cadastre categorias, produtos e clientes, depois crie um pedido de venda para ver os números do seu negócio aqui.
          </div>
        </Card>
      )}
    </div>
  );
}
