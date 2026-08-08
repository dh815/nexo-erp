import { useMemo } from 'react';
import { PageHeader } from '../components/PageHeader';
import { useCollection } from '../hooks/useCollection';
import { StatCard, Loading } from '../components/ui';
import { Icon } from '../components/Icons';
import { money } from '../lib/format';

export default function Financeiro() {
  const { data: entradas, loading: l1 } = useCollection('entradas');
  const { data: saidas, loading: l2 } = useCollection('saidas');
  const loading = l1 || l2;

  const stats = useMemo(() => {
    const totalEntradas = entradas.reduce((s, e) => s + (Number(e.valor) || 0), 0);
    const totalSaidas = saidas.reduce((s, e) => s + (Number(e.valor) || 0), 0);
    return { totalEntradas, totalSaidas, saldo: totalEntradas - totalSaidas };
  }, [entradas, saidas]);

  if (loading) return <Loading />;

  return (
    <div>
      <PageHeader crumb="Financeiro" title="Visão financeira" subtitle="Entradas, saídas e saldo consolidado" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard icon={Icon.arrowDown} color="green" num={money(stats.totalEntradas)} label="Total de entradas" />
        <StatCard icon={Icon.arrowUp} color="red" num={money(stats.totalSaidas)} label="Total de saídas" />
        <StatCard icon={Icon.wallet} color="blue" num={money(stats.saldo)} label="Saldo" />
      </div>
      <div className="text-[12px] text-muted mt-4">
        Gráfico de fluxo de caixa por período entra na próxima etapa do desenvolvimento.
      </div>
    </div>
  );
}
