import { useState } from 'react';
import { Icon } from './Icons';
import { money } from '../lib/format';

export function ProductPicker({ produtos, cart, onChange }) {
  const [search, setSearch] = useState('');

  const filtered = produtos.filter((p) =>
    p.nome.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase())
  );

  function qtyOf(produtoId) {
    return cart.find((c) => c.produtoId === produtoId)?.quantidade || 0;
  }

  function setQty(produto, qty) {
    if (qty <= 0) {
      onChange(cart.filter((c) => c.produtoId !== produto.id));
      return;
    }
    const exists = cart.find((c) => c.produtoId === produto.id);
    if (exists) {
      onChange(cart.map((c) => (c.produtoId === produto.id ? { ...c, quantidade: qty } : c)));
    } else {
      onChange([...cart, { produtoId: produto.id, nome: produto.nome, precoUnitario: produto.precoVenda, quantidade: qty }]);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 bg-bg-soft border border-line rounded-lg px-3 py-2 mb-3">
        <Icon.search className="w-4 h-4 text-faint shrink-0" />
        <input
          className="bg-transparent outline-none text-sm w-full"
          placeholder="Buscar produto por nome ou SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
        {filtered.length === 0 && <div className="text-center py-6 text-[12.5px] text-faint">Nenhum produto encontrado.</div>}
        {filtered.map((p) => {
          const qty = qtyOf(p.id);
          return (
            <div key={p.id} className="flex items-center gap-2.5 p-2.5 border border-line rounded-lg">
              <div className="w-9 h-9 rounded-lg bg-bg-soft-2 flex items-center justify-center text-faint shrink-0">
                <Icon.box className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-bold truncate">{p.nome}</div>
                <div className="text-[11px] text-muted">{money(p.precoVenda)} · {p.estoque} em estoque</div>
              </div>
              {qty > 0 ? (
                <div className="flex items-center gap-2 bg-bg-soft rounded-lg p-0.5">
                  <button type="button" onClick={() => setQty(p, qty - 1)} className="w-6 h-6 rounded-md bg-white shadow-card font-bold">–</button>
                  <span className="text-[12.5px] font-bold w-4 text-center">{qty}</span>
                  <button type="button" onClick={() => setQty(p, qty + 1)} className="w-6 h-6 rounded-md bg-white shadow-card font-bold">+</button>
                </div>
              ) : (
                <button type="button" onClick={() => setQty(p, 1)} className="text-xs font-bold text-primary-dark border border-line rounded-lg px-2.5 py-1.5 hover:bg-primary-light">
                  + Adicionar
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
