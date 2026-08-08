import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button, Field, inputClass } from '../components/ui';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError('E-mail ou senha inválidos.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-soft px-4">
      <div className="w-full max-w-sm bg-white border border-line rounded-2xl shadow-card-lg p-7">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-[#6f8dff] to-primary flex items-center justify-center text-white font-extrabold font-display">N</div>
          <div className="font-extrabold text-lg font-display">Nexo ERP</div>
        </div>
        <h1 className="text-lg font-bold mb-1">Entrar na sua conta</h1>
        <p className="text-[13px] text-muted mb-5">Acesse o painel da sua empresa.</p>
        <form onSubmit={handleSubmit}>
          <Field label="E-mail">
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="voce@empresa.com" />
          </Field>
          <Field label="Senha">
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} placeholder="••••••••" />
          </Field>
          {error && <div className="text-[12.5px] text-danger mb-3">{error}</div>}
          <Button type="submit" disabled={loading} className="w-full justify-center mt-2">
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </div>
    </div>
  );
}
