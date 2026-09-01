import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UIFeedbackProvider } from './context/UIFeedbackContext';
import { Layout } from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Entradas from './pages/Entradas';
import Saidas from './pages/Saidas';
import Financeiro from './pages/Financeiro';
import Calendario from './pages/Calendario';
import Pedidos from './pages/Pedidos';
import Calculadora from './pages/Calculadora';
import Clientes from './pages/Clientes';
import Produtos from './pages/Produtos';
import Categorias from './pages/Categorias';
import Estoque from './pages/Estoque';
import Compras from './pages/Compras';
import NotasEntrada from './pages/NotasEntrada';
import NotasSaida from './pages/NotasSaida';
import Relatorios from './pages/Relatorios';
import Configuracoes from './pages/Configuracoes';

function PrivateRoute({ children }) {
  const { user, empresaId, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-faint text-sm">Carregando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!empresaId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div className="max-w-sm">
          <div className="font-bold text-[15px] mb-1.5">Conta sem empresa vinculada</div>
          <div className="text-[13px] text-muted">
            Este usuário ({user.email}) não tem um documento em <code>usuarios/{'{uid}'}</code> com o campo
            <code> empresaId</code> no Firestore. Crie esse documento (ou vincule ao <code>empresa_principal</code>
            já existente) para acessar o sistema.
          </div>
        </div>
      </div>
    );
  }
  return children;
}

function LoginRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-faint text-sm">Carregando...</div>;
  if (user) return <Navigate to="/" replace />;
  return <Login />;
}

// Envolve uma rota que só deve existir para empresas com determinada feature
// flag ligada (empresas/{id}.features.chaveDoRecurso === true). Uso:
// <Route path="recurso-exclusivo" element={<FeatureRoute feature="chaveDoRecurso"><PaginaX /></FeatureRoute>} />
function FeatureRoute({ feature, children }) {
  const { hasFeature } = useAuth();
  if (!hasFeature(feature)) {
    return (
      <div className="p-8 text-center">
        <div className="font-bold text-[14.5px] mb-1">Recurso não disponível</div>
        <div className="text-[13px] text-muted">Este módulo não está ativado para a sua empresa.</div>
      </div>
    );
  }
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <UIFeedbackProvider>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="entradas" element={<Entradas />} />
            <Route path="saidas" element={<Saidas />} />
            <Route path="financeiro" element={<Financeiro />} />
            <Route path="calendario" element={<Calendario />} />
            <Route path="pedidos" element={<Pedidos />} />
            <Route path="calculadora" element={<Calculadora />} />
            <Route path="clientes" element={<Clientes />} />
            <Route path="produtos" element={<Produtos />} />
            <Route path="categorias" element={<Categorias />} />
            <Route path="estoque" element={<Estoque />} />
            <Route path="compras" element={<Compras />} />
            <Route path="notas-entrada" element={<NotasEntrada />} />
            <Route path="notas-saida" element={<NotasSaida />} />
            <Route path="relatorios" element={<Relatorios />} />
            <Route path="configuracoes" element={<Configuracoes />} />
          </Route>
        </Routes>
      </AuthProvider>
      </UIFeedbackProvider>
    </BrowserRouter>
  );
}
