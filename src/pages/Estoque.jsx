import { PageHeader } from '../components/PageHeader';
import { useCollection } from '../hooks/useCollection';
import { DataTable } from '../components/DataTable';
import { Pill } from '../components/ui';

export default function Estoque() {
  const { data: produtos, loading } = useCollection('produtos', { orderByField: 'nome', direction: 'asc' });

  const columns = [
    { key: 'nome', header: 'Produto', render: (r) => <b>{r.nome}</b> },
    { key: 'sku', header: 'SKU', render: (r) => <span className="text-muted">{r.sku}</span> },
    { key: 'categoria', header: 'Categoria', render: (r) => r.categoria ? <Pill color="blue">{r.categoria}</Pill> : '—' },
    { key: 'estoque', header: 'Em estoque', render: (r) => <b>{r.estoque} un.</b> },
    { key: 'estoqueMinimo', header: 'Mínimo', render: (r) => <span className="text-muted">{r.estoqueMinimo} un.</span> },
    { key: 'status', header: 'Status', render: (r) => Number(r.estoque) <= Number(r.estoqueMinimo)
        ? <Pill color="red">Estoque baixo</Pill> : <Pill color="green">Normal</Pill> },
  ];

  return (
    <div>
      <PageHeader crumb="Catálogo" title="Estoque" subtitle="Posição atual do estoque, calculada a partir dos produtos cadastrados" />
      <div className="bg-white border border-line rounded-2xl shadow-card p-5">
        <DataTable columns={columns} rows={produtos} loading={loading}
          emptyMessage="Cadastre produtos para ver a posição de estoque aqui." />
      </div>
      <div className="text-[12px] text-muted mt-3">
        Ajustes manuais, entrada de estoque e histórico de movimentações entram na próxima etapa do desenvolvimento.
      </div>
    </div>
  );
}
