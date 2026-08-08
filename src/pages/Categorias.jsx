import { useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { useCollection } from '../hooks/useCollection';
import { Card, Modal, Field, inputClass, Button, Loading, EmptyState } from '../components/ui';
import { Icon } from '../components/Icons';

export default function Categorias() {
  const { data: categorias, loading, add, update, remove } = useCollection('categorias', { orderByField: 'nome', direction: 'asc' });
  const [modal, setModal] = useState(null); // null | {} | {id,...}
  const [nome, setNome] = useState('');

  function openNew() { setNome(''); setModal({}); }
  function openEdit(cat) { setNome(cat.nome); setModal(cat); }

  async function handleSave() {
    if (!nome.trim()) return;
    if (modal.id) await update(modal.id, { nome });
    else await add({ nome });
    setModal(null);
  }

  return (
    <div>
      <PageHeader crumb="Catálogo" title="Categorias" subtitle="Organize seus produtos em categorias ilimitadas" actionLabel="Nova categoria" onAction={openNew} />

      {loading ? <Loading /> : categorias.length === 0 ? (
        <EmptyState message="Nenhuma categoria cadastrada ainda. Crie a primeira." />
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))' }}>
          {categorias.map((c) => (
            <Card key={c.id} className="p-4 flex flex-col gap-2.5">
              <div className="w-[38px] h-[38px] rounded-[10px] bg-primary-light text-primary-dark flex items-center justify-center">
                <Icon.tag className="w-[18px] h-[18px]" />
              </div>
              <div className="font-bold text-[13.5px]">{c.nome}</div>
              <div className="flex gap-1 mt-1">
                <button onClick={() => openEdit(c)} className="w-7 h-7 rounded-lg flex items-center justify-center text-faint hover:bg-bg-soft-2 hover:text-primary-dark">
                  <Icon.edit className="w-[14px] h-[14px]" />
                </button>
                <button onClick={() => remove(c.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-faint hover:bg-bg-soft-2 hover:text-danger">
                  <Icon.trash className="w-[14px] h-[14px]" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {modal && (
        <Modal title={modal.id ? 'Editar categoria' : 'Nova categoria'} onClose={() => setModal(null)}
          footer={<><Button variant="ghost" onClick={() => setModal(null)}>Cancelar</Button><Button onClick={handleSave}>Salvar</Button></>}>
          <Field label="Nome da categoria">
            <input className={inputClass} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Eletrônicos" autoFocus />
          </Field>
        </Modal>
      )}
    </div>
  );
}
