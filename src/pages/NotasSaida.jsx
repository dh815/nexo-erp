import { useMemo } from 'react';
import { PageHeader } from '../components/PageHeader';
import { useCollection } from '../hooks/useCollection';
import { useAuth } from '../context/AuthContext';
import { Card, Loading, Button, Pill } from '../components/ui';
import { Icon } from '../components/Icons';
import { money } from '../lib/format';
import { createNotaSaida, updateNotaSaidaStatus, deleteNotaSaida } from '../lib/notas';

const statusColor = { rascunho: 'gray', transmitida: 'green', cancelada: 'red' };
const statusLabel = { rascunho: 'Rascunho', transmitida: 'Transmitida', cancelada: 'Cancelada' };

export default function NotasSaida() {
  const { empresaId } = useAuth();
  const { data: notas, loading: l1 } = useCollection('notasSaida');
  const { data: pedidos, loading: l2 } = useCollection('pedidos');
  const loading = l1 || l2;

  const pedidosPendentes = useMemo(() => {
    const comNota = new Set(notas.map((n) => n.pedidoId));
    return pedidos.filter((p) => !comNota.has(p.id));
  }, [notas, pedidos]);

  async function gerar(pedido) {
    try {
      await createNotaSaida(empresaId, pedido);
    } catch (err) {
      alert(err.message);
    }
  }

  async function transmitir(nota) {
    await updateNotaSaidaStatus(empresaId, nota.id, 'transmitida');
  }
  async function cancelar(nota) {
    if (!confirm('Cancelar essa nota de saída?')) return;
    await updateNotaSaidaStatus(empresaId, nota.id, 'cancelada');
  }
  async function excluir(nota) {
    if (!confirm('Excluir essa nota de saída? Essa ação não pode ser desfeita.')) return;
    await deleteNotaSaida(empresaId, nota.id);
  }

  if (loading) return <Loading />;

  return (
    <div>
      <PageHeader crumb="Notas Fiscais" title="NFs de Saída" subtitle="Gere a nota a partir de um Pedido de Venda já existente" />

      <Card className="p-4.5 mb-4 bg-primary-light">
        <div className="text-[12.5px] text-primary-dark">
          <b>Sobre a transmissão:</b> emitir NF-e com validade fiscal (assinatura digital, DANFE, envio pra SEFAZ)
          exige um certificado digital e um provedor de NF-e (ex: PlugNotas, Focus NFe, eNotas, NFe.io). Por enquanto,
          esta tela gera e organiza a nota internamente — o status "Transmitida" aqui é apenas um controle manual,
          não uma emissão fiscal real. Quando você escolher um provedor, essa parte é conectada.
        </div>
      </Card>

      {pedidosPendentes.length > 0 && (
        <Card className="p-4.5 mb-4">
          <div className="font-bold text-[13.5px] mb-3">Pedidos sem nota gerada ({pedidosPendentes.length})</div>
          <div className="flex flex-col gap-1.5">
            {pedidosPendentes.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-[13px] py-1.5 border-b border-[#f0f2f8] last:border-0">
                <div><b>{p.clienteNome}</b> <span className="text-muted">— {money(p.valorTotal)} · {p.data ? new Date(p.data).toLocaleDateString('pt-BR') : ''}</span></div>
                <button onClick={() => gerar(p)} className="text-[11.5px] font-bold text-primary-dark border border-line rounded-lg px-2.5 py-1 hover:bg-primary-light">
                  Gerar nota
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-5">
        <div className="font-bold text-[13.5px] mb-3">Notas geradas</div>
        {notas.length === 0 ? (
          <div className="text-center py-8 text-[12.5px] text-faint">Nenhuma nota de saída gerada ainda.</div>
        ) : (
          <div className="table-wrap overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr>
                  {['Cliente', 'Data', 'Itens', 'Valor', 'Status', ''].map((h) => (
                    <th key={h} className="text-left text-[11px] uppercase tracking-wider text-faint font-bold pb-2.5 px-3.5 border-b border-line whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {notas.map((n) => (
                  <tr key={n.id} className="hover:bg-bg-soft">
                    <td className="px-3.5 py-3 border-b border-[#f0f2f8] font-bold">{n.clienteNome}</td>
                    <td className="px-3.5 py-3 border-b border-[#f0f2f8] text-muted">{n.data ? new Date(n.data).toLocaleDateString('pt-BR') : '—'}</td>
                    <td className="px-3.5 py-3 border-b border-[#f0f2f8] text-muted">{n.itens?.length || 0} itens</td>
                    <td className="px-3.5 py-3 border-b border-[#f0f2f8] font-bold">{money(n.valorTotal)}</td>
                    <td className="px-3.5 py-3 border-b border-[#f0f2f8]"><Pill color={statusColor[n.status]}>{statusLabel[n.status]}</Pill></td>
                    <td className="px-3.5 py-3 border-b border-[#f0f2f8] whitespace-nowrap">
                      <span className="flex gap-1.5">
                        {n.status === 'rascunho' && (
                          <button onClick={() => transmitir(n)} className="text-[11px] font-bold text-primary-dark border border-line rounded-lg px-2 py-1 hover:bg-primary-light">Marcar transmitida</button>
                        )}
                        {n.status !== 'cancelada' && (
                          <button onClick={() => cancelar(n)} className="text-[11px] font-bold text-danger border border-line rounded-lg px-2 py-1 hover:bg-danger-bg">Cancelar</button>
                        )}
                        <button onClick={() => excluir(n)} className="w-7 h-7 rounded-lg flex items-center justify-center text-faint hover:bg-bg-soft-2 hover:text-danger">
                          <Icon.trash className="w-[14px] h-[14px]" />
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
