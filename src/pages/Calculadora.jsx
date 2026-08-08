import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { useCollection } from '../hooks/useCollection';
import { useAuth } from '../context/AuthContext';
import { Card, Field, inputClass, Button } from '../components/ui';
import { ProductPicker } from '../components/ProductPicker';
import { Icon } from '../components/Icons';
import { money } from '../lib/format';
import { createPedido } from '../lib/pedidos';

const formasPagamento = ['Pix', 'Cartão', 'Boleto', 'Dinheiro', 'Transferência'];

export default function Calculadora() {
  const { empresaId } = useAuth();
  const navigate = useNavigate();
  const { data: produtos } = useCollection('produtos', { orderByField: 'nome', direction: 'asc' });
  const { data: clientes } = useCollection('clientes', { orderByField: 'nome', direction: 'asc' });

  const [cart, setCart] = useState([]);
  const [clienteId, setClienteId] = useState('');
  const [desconto, setDesconto] = useState(0);
  const [frete, setFrete] = useState(0);
  const [parcelas, setParcelas] = useState(0);
  const [formaPagamento, setFormaPagamento] = useState('Pix');
  const [saving, setSaving] = useState(false);

  const geraParcelas = Number(parcelas) > 0 && ['Cartão', 'Boleto'].includes(formaPagamento);

  const totals = useMemo(() => {
    const subtotal = cart.reduce((s, i) => s + i.quantidade * i.precoUnitario, 0);
    const descontoVal = subtotal * (Number(desconto) / 100 || 0);
    const total = Math.max(subtotal - descontoVal + (Number(frete) || 0), 0);
    return { subtotal, descontoVal, total };
  }, [cart, desconto, frete]);

  const datasParcelas = useMemo(() => {
    if (totals.total <= 0 || !geraParcelas) return null;
    const base = new Date();
    const first = new Date(base); first.setMonth(first.getMonth() + 1);
    const last = new Date(base); last.setMonth(last.getMonth() + Number(parcelas));
    const fmt = (d) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    return `${fmt(first)} até ${fmt(last)}`;
  }, [totals.total, parcelas, geraParcelas]);

  async function handleGerarPedido() {
    const cliente = clientes.find((c) => c.id === clienteId);
    if (!cliente) { alert('Selecione um cliente.'); return; }
    if (cart.length === 0) { alert('Adicione ao menos um produto.'); return; }
    setSaving(true);
    try {
      await createPedido(empresaId, {
        clienteId: cliente.id,
        clienteNome: cliente.nome,
        data: new Date().toISOString().slice(0, 10),
        itens: cart,
        desconto: Number(desconto) || 0,
        frete: Number(frete) || 0,
        valorTotal: totals.total,
        formaPagamento,
        numeroParcelas: Number(parcelas),
        status: 'pendente',
        observacoes: '',
      });
      navigate('/pedidos');
    } catch (err) {
      alert('Não foi possível gerar o pedido: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader crumb="Vendas" title="Calculadora de venda" subtitle="Monte o pedido, aplique desconto/frete e simule o parcelamento" />

      <div className="grid gap-4" style={{ gridTemplateColumns: '1.4fr 1fr' }}>
        <Card className="p-5">
          <ProductPicker produtos={produtos} cart={cart} onChange={setCart} />
        </Card>

        <Card className="p-5 h-fit sticky top-24">
          <Field label="Cliente">
            <select className={inputClass} value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
              <option value="">Selecione um cliente...</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </Field>

          <div className="font-bold text-[13px] mb-2 mt-4">Carrinho</div>
          {cart.length === 0 ? (
            <div className="text-center py-7 text-[12.5px] text-faint">
              <Icon.cart className="w-6 h-6 mx-auto mb-2 opacity-50" />
              Nenhum produto adicionado ainda
            </div>
          ) : (
            <div className="flex flex-col mb-2">
              {cart.map((i) => (
                <div key={i.produtoId} className="flex justify-between text-[13px] py-2 border-b border-[#f0f2f8]">
                  <span>{i.quantidade} × {i.nome}</span>
                  <span className="font-semibold">{money(i.quantidade * i.precoUnitario)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mt-3">
            <Field label="Desconto (%)"><input type="number" className={inputClass} value={desconto} onChange={(e) => setDesconto(e.target.value)} /></Field>
            <Field label="Frete (R$)"><input type="number" className={inputClass} value={frete} onChange={(e) => setFrete(e.target.value)} /></Field>
          </div>

          <div className="text-[13px] text-muted flex justify-between py-1"><span>Subtotal</span><span>{money(totals.subtotal)}</span></div>
          <div className="text-[13px] text-muted flex justify-between py-1"><span>Desconto</span><span>- {money(totals.descontoVal)}</span></div>
          <div className="text-[13px] text-muted flex justify-between py-1"><span>Frete</span><span>+ {money(Number(frete) || 0)}</span></div>
          <div className="text-base font-extrabold flex justify-between py-2 mt-1 border-t border-line"><span>Total</span><span>{money(totals.total)}</span></div>

          <Field label="Forma de pagamento">
            <select className={inputClass} value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)}>
              {formasPagamento.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </Field>
          <Field label="Parcelas">
            <select className={inputClass} value={parcelas} onChange={(e) => setParcelas(e.target.value)}>
              <option value={0}>0x — à vista</option>
              {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((n) => <option key={n} value={n}>{n}x</option>)}
            </select>
          </Field>
          <div className="text-[11.5px] text-muted -mt-1.5">
            {geraParcelas
              ? 'Vai gerar parcelas no Calendário financeiro.'
              : 'Não gera parcela no calendário (recebido à vista) — só Cartão ou Boleto parcelado geram.'}
          </div>

          {geraParcelas ? (
            <div className="bg-primary-light rounded-xl p-3.5 mt-2">
              <div className="text-[11.5px] font-bold text-primary-dark">Valor de cada parcela</div>
              <div className="text-lg font-extrabold text-primary-dark mt-0.5">{money(totals.total / Number(parcelas) || 0)}</div>
              <div className="text-[11.5px] font-bold text-primary-dark mt-2">Vencimentos: {datasParcelas || '—'}</div>
            </div>
          ) : (
            <div className="bg-success-bg rounded-xl p-3.5 mt-2">
              <div className="text-[11.5px] font-bold text-success">Pagamento à vista</div>
              <div className="text-lg font-extrabold text-success mt-0.5">{money(totals.total)}</div>
            </div>
          )}

          <Button className="w-full justify-center mt-4" onClick={handleGerarPedido} disabled={saving}>
            <Icon.cart className="w-[15px] h-[15px]" /> {saving ? 'Gerando...' : 'Gerar pedido de venda'}
          </Button>
        </Card>
      </div>
    </div>
  );
}
