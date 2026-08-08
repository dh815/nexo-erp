import { useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { useCollection } from '../hooks/useCollection';
import { Card, Modal, Field, inputClass, Button, Loading, EmptyState } from '../components/ui';
import { Icon } from '../components/Icons';
import { money } from '../lib/format';
import { uploadImage } from '../lib/cloudinary';

const emptyForm = {
  nome: '', sku: '', categoria: '', fornecedor: '', precoCusto: '', precoVenda: '',
  estoque: '', estoqueMinimo: '', codigoBarras: '', peso: '', dimensoes: '', fotoUrl: '',
};

export default function Produtos() {
  const { data: produtos, loading, add, update, remove } = useCollection('produtos', { orderByField: 'nome', direction: 'asc' });
  const { data: categorias } = useCollection('categorias', { orderByField: 'nome', direction: 'asc' });
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);

  function openNew() { setForm(emptyForm); setModal({}); }
  function openEdit(p) { setForm({ ...emptyForm, ...p }); setModal(p); }
  function set(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  async function handleFotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadImage(file, 'produtos');
      set('fotoUrl', url);
    } catch (err) {
      alert('Não foi possível enviar a imagem. Verifique a configuração do Cloudinary.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!form.nome.trim() || !form.sku.trim()) return;
    const payload = {
      ...form,
      precoCusto: Number(form.precoCusto) || 0,
      precoVenda: Number(form.precoVenda) || 0,
      estoque: Number(form.estoque) || 0,
      estoqueMinimo: Number(form.estoqueMinimo) || 0,
    };
    if (modal.id) await update(modal.id, payload);
    else await add(payload);
    setModal(null);
  }

  return (
    <div>
      <PageHeader crumb="Catálogo" title="Produtos" subtitle={`${produtos.length} produtos cadastrados`} actionLabel="Novo produto" onAction={openNew} />

      {loading ? <Loading /> : produtos.length === 0 ? (
        <EmptyState message="Nenhum produto cadastrado ainda. Cadastre o primeiro." />
      ) : (
        <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))' }}>
          {produtos.map((p) => (
            <Card key={p.id} className="overflow-hidden relative">
              {p.estoque <= p.estoqueMinimo && (
                <span className="absolute m-2 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-danger-bg text-danger">Estoque baixo</span>
              )}
              <div className="h-[120px] bg-bg-soft-2 flex items-center justify-center text-faint">
                {p.fotoUrl ? <img src={p.fotoUrl} alt={p.nome} className="w-full h-full object-cover" /> : <Icon.image className="w-[34px] h-[34px]" />}
              </div>
              <div className="p-3.5">
                <div className="text-[10px] text-primary font-bold uppercase tracking-wide">{p.categoria || 'Sem categoria'}</div>
                <div className="text-[13.5px] font-bold mt-1 mb-0.5">{p.nome}</div>
                <div className="text-[11px] text-faint">SKU {p.sku} · {p.estoque} un.</div>
                <div className="flex items-center justify-between mt-2.5">
                  <div className="text-[14.5px] font-extrabold">{money(p.precoVenda)}</div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(p)} className="w-7 h-7 rounded-lg flex items-center justify-center text-faint hover:bg-bg-soft-2 hover:text-primary-dark">
                      <Icon.edit className="w-[14px] h-[14px]" />
                    </button>
                    <button onClick={() => remove(p.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-faint hover:bg-bg-soft-2 hover:text-danger">
                      <Icon.trash className="w-[14px] h-[14px]" />
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {modal && (
        <Modal title={modal.id ? 'Editar produto' : 'Novo produto'} onClose={() => setModal(null)}
          footer={<><Button variant="ghost" onClick={() => setModal(null)}>Cancelar</Button><Button onClick={handleSave}>Salvar</Button></>}>
          <Field label="Foto do produto">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-lg bg-bg-soft-2 flex items-center justify-center overflow-hidden shrink-0">
                {form.fotoUrl ? <img src={form.fotoUrl} className="w-full h-full object-cover" /> : <Icon.image className="w-6 h-6 text-faint" />}
              </div>
              <label className="text-xs font-semibold text-primary-dark cursor-pointer">
                {uploading ? 'Enviando...' : 'Escolher imagem'}
                <input type="file" accept="image/*" className="hidden" onChange={handleFotoChange} disabled={uploading} />
              </label>
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nome"><input className={inputClass} value={form.nome} onChange={(e) => set('nome', e.target.value)} /></Field>
            <Field label="SKU"><input className={inputClass} value={form.sku} onChange={(e) => set('sku', e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Categoria">
              <select className={inputClass} value={form.categoria} onChange={(e) => set('categoria', e.target.value)}>
                <option value="">Selecione...</option>
                {categorias.map((c) => <option key={c.id} value={c.nome}>{c.nome}</option>)}
              </select>
            </Field>
            <Field label="Fornecedor"><input className={inputClass} value={form.fornecedor} onChange={(e) => set('fornecedor', e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Preço de custo (R$)"><input type="number" className={inputClass} value={form.precoCusto} onChange={(e) => set('precoCusto', e.target.value)} /></Field>
            <Field label="Preço de venda (R$)"><input type="number" className={inputClass} value={form.precoVenda} onChange={(e) => set('precoVenda', e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quantidade em estoque"><input type="number" className={inputClass} value={form.estoque} onChange={(e) => set('estoque', e.target.value)} /></Field>
            <Field label="Estoque mínimo"><input type="number" className={inputClass} value={form.estoqueMinimo} onChange={(e) => set('estoqueMinimo', e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Código de barras"><input className={inputClass} value={form.codigoBarras} onChange={(e) => set('codigoBarras', e.target.value)} /></Field>
            <Field label="Peso (kg)"><input className={inputClass} value={form.peso} onChange={(e) => set('peso', e.target.value)} /></Field>
          </div>
          <Field label="Dimensões"><input className={inputClass} value={form.dimensoes} onChange={(e) => set('dimensoes', e.target.value)} placeholder="C x L x A (cm)" /></Field>
        </Modal>
      )}
    </div>
  );
}
