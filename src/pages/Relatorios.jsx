import { useMemo } from 'react';
import { PageHeader } from '../components/PageHeader';
import { useCollection } from '../hooks/useCollection';
import { Card, Loading } from '../components/ui';
import { Icon } from '../components/Icons';
import { money } from '../lib/format';
import { exportCSV } from '../lib/csv';

export default function Relatorios() {
  const { data: pedidos, loading: l1 } = useCollection('pedidos');
  const { data: produtos, loading: l2 } = useCollection('produtos');
  const { data: clientes, loading: l3 } = useCollection('clientes');
  const { data: entradas, loading: l4 } = useCollection('entradas');
  const { data: saidas, loading: l5 } = useCollection('saidas');
  const loading = l1 || l2 || l3 || l4 || l5;

  const stats = useMemo(() => {
    const ticketMedio = pedidos.length ? pedidos.reduce((s, p) => s + (p.valorTotal || 0), 0) / pedidos.length : 0;

    // Lucro estimado: soma, por pedido, (precoVenda - precoCusto) * quantidade de cada item
    const custoPorProduto = Object.fromEntries(produtos.map((p) => [p.id, Number(p.precoCusto) || 0]));
    let lucroTotal = 0;
    for (const pedido of pedidos) {
      for (const item of pedido.itens || []) {
        const custo = custoPorProduto[item.produtoId] || 0;
        lucroTotal += (item.precoUnitario - custo) * item.quantidade;
      }
    }

    const estoqueBaixo = produtos.filter((p) => Number(p.estoque) <= Number(p.estoqueMinimo)).length;
    const inadimplentes = clientes.filter((c) => Number(c.valorEmAberto) > 0).length;
    const totalEntradas = entradas.reduce((s, e) => s + (Number(e.valor) || 0), 0);
    const totalSaidas = saidas.reduce((s, e) => s + (Number(e.valor) || 0), 0);

    return { ticketMedio, lucroTotal, estoqueBaixo, inadimplentes, totalEntradas, totalSaidas };
  }, [pedidos, produtos, clientes, entradas, saidas]);

  const reports = [
    {
      title: 'Vendas', desc: `${pedidos.length} pedidos · ticket médio ${money(stats.ticketMedio)}`,
      onExport: () => exportCSV('vendas.csv', pedidos, [
        { label: 'Pedido', value: (r) => r.id },
        { label: 'Cliente', value: (r) => r.clienteNome },
        { label: 'Data', value: (r) => r.data },
        { label: 'Itens', value: (r) => (r.itens || []).length },
        { label: 'Valor total', value: (r) => r.valorTotal },
        { label: 'Status', value: (r) => r.status },
      ]),
    },
    {
      title: 'Clientes', desc: `${clientes.length} cadastrados · ${stats.inadimplentes} com valor em aberto`,
      onExport: () => exportCSV('clientes.csv', clientes, [
        { label: 'Nome', value: (r) => r.nome },
        { label: 'Cidade', value: (r) => r.cidade },
        { label: 'WhatsApp', value: (r) => r.whatsapp },
        { label: 'Total comprado', value: (r) => r.totalComprado },
        { label: 'Em aberto', value: (r) => r.valorEmAberto },
      ]),
    },
    {
      title: 'Produtos', desc: `${produtos.length} produtos · ${stats.estoqueBaixo} com estoque baixo`,
      onExport: () => exportCSV('produtos.csv', produtos, [
        { label: 'Nome', value: (r) => r.nome },
        { label: 'SKU', value: (r) => r.sku },
        { label: 'Categoria', value: (r) => r.categoria },
        { label: 'Preço de custo', value: (r) => r.precoCusto },
        { label: 'Preço de venda', value: (r) => r.precoVenda },
        { label: 'Estoque', value: (r) => r.estoque },
      ]),
    },
    {
      title: 'Lucro', desc: `${money(stats.lucroTotal)} de margem estimada nos pedidos`,
      onExport: () => exportCSV('lucro_por_pedido.csv', pedidos, [
        { label: 'Pedido', value: (r) => r.id },
        { label: 'Cliente', value: (r) => r.clienteNome },
        { label: 'Data', value: (r) => r.data },
        { label: 'Valor total', value: (r) => r.valorTotal },
      ]),
    },
    {
      title: 'Estoque', desc: `${produtos.reduce((s, p) => s + (Number(p.estoque) || 0), 0)} unidades em estoque no total`,
      onExport: () => exportCSV('estoque.csv', produtos, [
        { label: 'Produto', value: (r) => r.nome },
        { label: 'SKU', value: (r) => r.sku },
        { label: 'Estoque atual', value: (r) => r.estoque },
        { label: 'Estoque mínimo', value: (r) => r.estoqueMinimo },
      ]),
    },
    {
      title: 'Financeiro', desc: `Entradas ${money(stats.totalEntradas)} · Saídas ${money(stats.totalSaidas)}`,
      onExport: () => exportCSV('financeiro.csv', [
        ...entradas.map((e) => ({ ...e, tipo: 'Entrada' })),
        ...saidas.map((e) => ({ ...e, tipo: 'Saída' })),
      ], [
        { label: 'Tipo', value: (r) => r.tipo },
        { label: 'Descrição', value: (r) => r.descricao },
        { label: 'Categoria', value: (r) => r.categoria },
        { label: 'Valor', value: (r) => r.valor },
        { label: 'Data', value: (r) => r.data },
      ]),
    },
  ];

  if (loading) return <Loading />;

  return (
    <div>
      <PageHeader crumb="Sistema" title="Relatórios" subtitle="Números calculados a partir dos seus dados reais, com exportação em CSV" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {reports.map((r) => (
          <Card key={r.title} className="p-4.5 flex flex-col gap-2.5">
            <div className="w-[38px] h-[38px] rounded-[10px] bg-primary-light text-primary-dark flex items-center justify-center">
              <Icon.chart className="w-[18px] h-[18px]" />
            </div>
            <div>
              <div className="font-bold text-[14.5px]">{r.title}</div>
              <div className="text-[12px] text-muted mt-0.5">{r.desc}</div>
            </div>
            <button onClick={r.onExport} className="text-[11.5px] font-bold border border-line rounded-lg px-2.5 py-1.5 text-muted hover:border-primary hover:text-primary-dark w-fit mt-1">
              Exportar CSV
            </button>
          </Card>
        ))}
      </div>
      <div className="text-[12px] text-muted mt-4">
        Exportação em PDF e Excel entra em uma próxima etapa — por enquanto, o CSV abre certinho no Excel e no Google Sheets.
      </div>
    </div>
  );
}
