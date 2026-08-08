import { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import { Card, Field, inputClass, Button } from '../components/ui';
import { Icon } from '../components/Icons';
import { uploadImage } from '../lib/cloudinary';

const themeColors = [
  { name: 'Azul', value: '#2e5eff' },
  { name: 'Verde-azulado', value: '#0ea5a5' },
  { name: 'Roxo', value: '#7c3aed' },
  { name: 'Vermelho', value: '#e11d48' },
  { name: 'Laranja', value: '#ea580c' },
];

const sections = ['Empresa', 'Aparência', 'Usuários e permissões', 'Assinatura e plano', 'Backup', 'Integrações'];

export default function Configuracoes() {
  const { empresa, updateEmpresa, user } = useAuth();
  const [section, setSection] = useState('Empresa');
  const [nome, setNome] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [corTema, setCorTema] = useState(themeColors[0].value);
  const [logoUrl, setLogoUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (empresa) {
      setNome(empresa.nome || '');
      setCnpj(empresa.cnpj || '');
      setCorTema(empresa.corTema || themeColors[0].value);
      setLogoUrl(empresa.logoUrl || '');
    }
  }, [empresa]);

  async function handleLogoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadImage(file, 'empresa');
      setLogoUrl(url);
    } catch (err) {
      alert('Não foi possível enviar a logo. Verifique a configuração do Cloudinary.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateEmpresa({ nome, cnpj, corTema, logoUrl });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      alert('Não foi possível salvar: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader crumb="Sistema" title="Configurações" subtitle="Dados da empresa, aparência e usuários" />
      <div className="grid gap-6" style={{ gridTemplateColumns: '210px 1fr' }}>
        <div className="flex flex-col gap-0.5">
          {sections.map((s) => (
            <button key={s} onClick={() => setSection(s)}
              className={`text-left px-3 py-2 rounded-lg text-[13px] font-semibold ${
                section === s ? 'bg-primary-light text-primary-dark' : 'text-muted hover:bg-bg-soft'
              }`}>
              {s}
            </button>
          ))}
        </div>

        {section === 'Empresa' && (
          <Card className="p-5">
            <div className="font-bold text-[14.5px] mb-1">Dados da empresa</div>
            <div className="text-[12px] text-muted mb-4">Essas informações vão aparecer nos pedidos e relatórios</div>

            <Field label="Logo da empresa">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-lg bg-bg-soft-2 flex items-center justify-center overflow-hidden shrink-0">
                  {logoUrl ? <img src={logoUrl} className="w-full h-full object-cover" /> : <Icon.image className="w-6 h-6 text-faint" />}
                </div>
                <label className="text-xs font-semibold text-primary-dark cursor-pointer">
                  {uploading ? 'Enviando...' : 'Escolher imagem'}
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} disabled={uploading} />
                </label>
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Nome da empresa"><input className={inputClass} value={nome} onChange={(e) => setNome(e.target.value)} /></Field>
              <Field label="CNPJ"><input className={inputClass} value={cnpj} onChange={(e) => setCnpj(e.target.value)} /></Field>
            </div>

            <Field label="Cor principal do tema">
              <div className="flex gap-2.5">
                {themeColors.map((c) => (
                  <button key={c.value} onClick={() => setCorTema(c.value)} title={c.name}
                    style={{ background: c.value }}
                    className={`w-8 h-8 rounded-lg border-2 ${corTema === c.value ? 'border-ink' : 'border-transparent'}`} />
                ))}
              </div>
              <div className="text-[11px] text-faint mt-2">A cor é salva, mas ainda não muda o tema visual automaticamente — isso entra numa próxima etapa.</div>
            </Field>

            <Button onClick={handleSave} disabled={saving} className="mt-2">
              {saving ? 'Salvando...' : saved ? 'Salvo ✓' : 'Salvar alterações'}
            </Button>
          </Card>
        )}

        {section === 'Usuários e permissões' && (
          <Card className="p-5">
            <div className="font-bold text-[14.5px] mb-3">Usuário atual</div>
            <div className="flex items-center justify-between border border-line rounded-lg px-4 py-3">
              <div>
                <div className="text-[13px] font-bold">{user?.email}</div>
                <div className="text-[11.5px] text-muted">Administrador</div>
              </div>
            </div>
            <div className="text-[12px] text-muted mt-4">
              Convite de novos usuários por e-mail e permissões por papel (vendedor, financeiro, etc.)
              entram numa próxima etapa. Por enquanto, novos usuários são criados direto no Firebase
              Authentication e vinculados manualmente à empresa no Firestore.
            </div>
          </Card>
        )}

        {['Aparência', 'Assinatura e plano', 'Backup', 'Integrações'].includes(section) && (
          <Card className="p-8 text-center">
            <div className="font-bold text-[14.5px] mb-1">{section}</div>
            <div className="text-[13px] text-muted">Esta seção entra em uma próxima etapa do desenvolvimento.</div>
          </Card>
        )}
      </div>
    </div>
  );
}
