import { useMemo, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { useCollection } from '../hooks/useCollection';
import { Card, Loading, Button } from '../components/ui';
import { money } from '../lib/format';

const dow = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function toDateKey(d) { return d.toISOString().slice(0, 10); }

export default function Calendario() {
  const { data: parcelas, loading, update } = useCollection('parcelas', { orderByField: 'vencimento', direction: 'asc' });
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [selectedDay, setSelectedDay] = useState(null);

  const todayKey = toDateKey(new Date());

  const byDay = useMemo(() => {
    const map = {};
    for (const p of parcelas) {
      if (!p.vencimento) continue;
      (map[p.vencimento] ||= []).push(p);
    }
    return map;
  }, [parcelas]);

  function statusOf(p) {
    if (p.status === 'pago') return 'green';
    if (p.vencimento < todayKey) return 'red';
    return 'blue';
  }

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = cursor.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const selectedList = selectedDay ? (byDay[selectedDay] || []) : (byDay[todayKey] || []);
  const selectedLabel = selectedDay
    ? new Date(selectedDay + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })
    : 'Hoje';

  async function receber(p) {
    await update(p.id, { status: 'pago' });
  }

  if (loading) return <Loading />;

  return (
    <div>
      <PageHeader crumb="Financeiro" title="Calendário financeiro"
        subtitle="Parcelas geradas automaticamente pelos Pedidos de Venda" />

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="font-bold text-[14.5px] capitalize">{monthLabel}</div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setCursor(new Date(year, month - 1, 1))}>← Anterior</Button>
            <Button variant="ghost" size="sm" onClick={() => setCursor(new Date(year, month + 1, 1))}>Próximo →</Button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {dow.map((d) => <div key={d} className="text-[10.5px] font-bold text-faint text-center uppercase pb-2">{d}</div>)}
          {Array.from({ length: firstWeekday }).map((_, i) => <div key={'e' + i} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const key = toDateKey(new Date(year, month, day));
            const items = byDay[key] || [];
            const isToday = key === todayKey;
            return (
              <button key={day} onClick={() => setSelectedDay(key)}
                className={`aspect-square border rounded-lg p-1.5 text-[12px] font-semibold flex flex-col text-left
                  ${isToday ? 'border-primary bg-primary-light text-primary-dark' : 'border-line text-muted hover:bg-bg-soft'}
                  ${selectedDay === key ? 'ring-2 ring-primary' : ''}`}>
                {day}
                <div className="flex gap-0.5 mt-auto flex-wrap">
                  {items.slice(0, 4).map((p, idx) => (
                    <span key={idx} className={`w-1.5 h-1.5 rounded-full ${
                      statusOf(p) === 'green' ? 'bg-success' : statusOf(p) === 'red' ? 'bg-danger' : 'bg-primary'
                    }`} />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
        <div className="flex gap-5 mt-4 flex-wrap text-[12px] text-muted font-semibold">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-success" /> Parcela recebida</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-danger" /> Parcela vencida</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary" /> A vencer</span>
        </div>
      </Card>

      <Card className="p-5 mt-4">
        <div className="font-bold text-[14.5px] mb-3">Parcelas — {selectedLabel}</div>
        {selectedList.length === 0 ? (
          <div className="text-center py-6 text-[12.5px] text-faint">Nenhuma parcela nesse dia.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {selectedList.map((p) => (
              <div key={p.id} className="flex items-center justify-between border border-line rounded-lg px-3.5 py-2.5">
                <div>
                  <div className="text-[13px] font-bold">{p.clienteNome}</div>
                  <div className="text-[11.5px] text-muted">Parcela {p.numero}/{p.totalParcelas}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-[13.5px]">{money(p.valor)}</span>
                  {p.status === 'pago' ? (
                    <span className="text-[11px] font-bold text-success bg-success-bg px-2.5 py-1 rounded-full">Recebida</span>
                  ) : (
                    <Button size="sm" onClick={() => receber(p)}>Receber</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
