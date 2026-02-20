import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, 
  User as UserIcon, 
  Settings as AdminIcon, 
  Plus, 
  Trash2, 
  Save, 
  LogOut, 
  Clock, 
  CheckCircle, 
  FileText, 
  Download,
  ShieldCheck,
  Smartphone,
  Monitor,
  RefreshCw,
  Image as ImageIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- Types ---

type User = {
  id: string;
  name: string;
  re: string;
  login: string;
  password?: string;
  shiftStart: string; // HH:mm
  shiftEnd: string;   // HH:mm
};

type OSField = {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'number';
  required: boolean;
};

type OS = {
  id: string;
  techId: string;
  techName: string;
  techRE: string;
  timestamp: number;
  data: Record<string, string>;
  status: 'Concluída';
};

type AppSettings = {
  logo: string | null;
  osFields: OSField[];
  companyName: string;
  appTitle: string;
  primaryColor: string;
  borderRadius: 'none' | 'md' | 'lg' | 'xl' | '2xl';
  cloudSyncEnabled: boolean;
};

// --- Initial Data ---

const DEFAULT_FIELDS: OSField[] = [
  { id: '1', label: 'Local', type: 'text', required: true },
  { id: '2', label: 'Setor', type: 'text', required: true },
  { id: '3', label: 'Empresa', type: 'text', required: true },
  { id: '4', label: 'Executante', type: 'text', required: true },
  { id: '5', label: 'Equipamento', type: 'text', required: true },
  { id: '6', label: 'Descrição do Problema', type: 'textarea', required: true },
];

const MASTER_PASSWORDS = ['portotpc', 'jesus', 'douglas'];

// --- Main Component ---

export default function App() {
  const [activeTab, setActiveTab] = useState<'user' | 'admin'>('user');
  const [users, setUsers] = useState<User[]>([]);
  const [orders, setOrders] = useState<OS[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    logo: null,
    osFields: DEFAULT_FIELDS,
    companyName: 'MantémOS',
    appTitle: 'MantémOS',
    primaryColor: '#2563eb', // Blue 600
    borderRadius: '2xl',
    cloudSyncEnabled: false
  });

  // Estilos dinâmicos aplicados via settings 


  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [adminAuth, setAdminAuth] = useState(false);
  const [adminPass, setAdminPass] = useState('');
  
  const [loginForm, setLoginForm] = useState({ login: '', password: '' });
  const [showNewOSModal, setShowNewOSModal] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // --- Persistence & Sync ---

  useEffect(() => {
    const savedUsers = localStorage.getItem('mantemos_users');
    const savedOrders = localStorage.getItem('mantemos_orders');
    const savedSettings = localStorage.getItem('mantemos_settings');

    if (savedUsers) setUsers(JSON.parse(savedUsers));
    if (savedOrders) setOrders(JSON.parse(savedOrders));
    if (savedSettings) setSettings(JSON.parse(savedSettings));
  }, []);

  useEffect(() => {
    localStorage.setItem('mantemos_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('mantemos_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('mantemos_settings', JSON.stringify(settings));
  }, [settings]);

  // Logout and clear passwords when changing tabs
  useEffect(() => {
    logoutAdmin();
    logoutTech();
  }, [activeTab]);

  // --- Cloud Sync Simulation ---
  // In a real production app, this would use a real database like Firebase, Supabase or AWS.
  // This simulation mimics the behavior of a cloud-synchronized system.
  const syncToCloud = async (newOrders: OS[], newUsers: User[], newSettings: AppSettings) => {
    setSyncing(true);
    // Mimic network latency
    await new Promise(resolve => setTimeout(resolve, 800));
    
    localStorage.setItem('mantemos_cloud_orders', JSON.stringify(newOrders));
    localStorage.setItem('mantemos_cloud_users', JSON.stringify(newUsers));
    localStorage.setItem('mantemos_cloud_settings', JSON.stringify(newSettings));
    
    setSyncing(false);
  };

  const loadFromCloud = async () => {
    setSyncing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const cloudOrders = localStorage.getItem('mantemos_cloud_orders');
    const cloudUsers = localStorage.getItem('mantemos_cloud_users');
    const cloudSettings = localStorage.getItem('mantemos_cloud_settings');

    if (cloudOrders) setOrders(JSON.parse(cloudOrders));
    if (cloudUsers) setUsers(JSON.parse(cloudUsers));
    if (cloudSettings) setSettings(JSON.parse(cloudSettings));
    
    setSyncing(false);
  };

  useEffect(() => {
    // Initial load simulating cloud fetch
    loadFromCloud();
  }, []);

  // Update cloud whenever local data changes
  useEffect(() => {
    if (users.length > 0 || orders.length > 0) {
      syncToCloud(orders, users, settings);
    }
  }, [users, orders, settings]);

  // --- Auth Logic ---

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(u => u.login === loginForm.login && u.password === loginForm.password);
    if (user) {
      setCurrentUser(user);
    } else {
      alert('Login ou senha incorretos.');
    }
  };

  const checkShift = (user: User) => {
    const now = new Date();
    const currentTime = format(now, 'HH:mm');
    
    // Simple time string comparison for shift
    // For midnight shifts, logic would be more complex, but this covers standard daily shifts
    if (user.shiftStart <= user.shiftEnd) {
      return currentTime >= user.shiftStart && currentTime <= user.shiftEnd;
    } else {
      // Overnight shift
      return currentTime >= user.shiftStart || currentTime <= user.shiftEnd;
    }
  };

  const handleAdminAuth = () => {
    if (MASTER_PASSWORDS.includes(adminPass.toLowerCase())) {
      setAdminAuth(true);
    } else {
      alert('Senha administrativa incorreta.');
      setAdminPass(''); // Clear on failure
    }
  };

  const logoutAdmin = () => {
    setAdminAuth(false);
    setAdminPass('');
  };

  const logoutTech = () => {
    setCurrentUser(null);
    setLoginForm({ login: '', password: '' });
  };

  // --- OS Logic ---

  const createOS = (formData: FormData) => {
    if (!currentUser) return;
    
    if (!checkShift(currentUser)) {
      alert('Erro: Você está fora do seu horário de turno. Emissão bloqueada.');
      return;
    }

    const data: Record<string, string> = {};
    settings.osFields.forEach(field => {
      data[field.label] = formData.get(field.id) as string;
    });

    // ID puramente numérico e sequencial
    const lastNum = orders.length > 0 ? parseInt(orders[0].id) : 0;
    const nextId = (lastNum + 1).toString().padStart(4, '0');

    const newOS: OS = {
      id: nextId,
      techId: currentUser.id,
      techName: currentUser.name,
      techRE: currentUser.re,
      timestamp: Date.now(),
      data,
      status: 'Concluída'
    };

    setOrders([newOS, ...orders]);
    setShowNewOSModal(false);
    // Sync will be triggered by useEffect
  };

  // --- PDF Logic ---

  const generatePDF = (os: OS) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Logo
    if (settings.logo) {
      doc.addImage(settings.logo, 'PNG', 10, 10, 30, 30);
    }

    // Title
    doc.setFontSize(20);
    doc.setTextColor(40);
    doc.text('ORDEM DE SERVIÇO', pageWidth / 2, 25, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`ID: ${os.id}`, pageWidth / 2, 32, { align: 'center' });

    // Tech Info
    doc.setDrawColor(200);
    doc.line(10, 45, pageWidth - 10, 45);
    doc.setFontSize(12);
    doc.text('INFORMAÇÕES DO TÉCNICO', 10, 55);
    doc.setFontSize(10);
    doc.text(`Nome: ${os.techName}`, 10, 62);
    doc.text(`RE: ${os.techRE}`, 10, 67);
    doc.text(`Data/Hora: ${format(os.timestamp, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, pageWidth - 10, 62, { align: 'right' });

    // OS Data
    const tableData = Object.entries(os.data).map(([label, value]) => [label, value]);
    autoTable(doc, {
      startY: 75,
      head: [['Campo', 'Descrição']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
    });

    // Signatures
    const finalY = (doc as any).lastAutoTable.finalY + 30;
    doc.line(20, finalY, 90, finalY);
    doc.text('Assinatura do Executante', 35, finalY + 5);
    doc.line(pageWidth - 90, finalY, pageWidth - 20, finalY);
    doc.text('Assinatura da Supervisão', pageWidth - 75, finalY + 5);

    doc.save(`OS_${os.id}_${os.techRE}.pdf`);
  };

  // --- Renderers ---

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {settings.logo ? (
              <img src={settings.logo} alt="Logo" className={`h-10 w-10 object-contain rounded-${settings.borderRadius}`} />
            ) : (
              <div 
                className={`h-10 w-10 rounded-${settings.borderRadius} flex items-center justify-center text-white shadow-lg`}
                style={{ backgroundColor: settings.primaryColor }}
              >
                <ClipboardList size={24} />
              </div>
            )}
            <h1 className="text-xl font-bold tracking-tight text-slate-800 hidden sm:block">
              {settings.appTitle}
            </h1>
          </div>
          
          <nav className="flex gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200">
            <button
              onClick={() => setActiveTab('user')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                activeTab === 'user' ? 'bg-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
              style={{ color: activeTab === 'user' ? settings.primaryColor : undefined }}
            >
              <UserIcon size={18} />
              <span>Usuário</span>
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                activeTab === 'admin' ? 'bg-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
              style={{ color: activeTab === 'admin' ? settings.primaryColor : undefined }}
            >
              <AdminIcon size={18} />
              <span>Admin</span>
            </button>
          </nav>

          <div className="flex items-center gap-2">
            {syncing ? (
              <RefreshCw size={18} className="text-blue-500 animate-spin" />
            ) : (
              <div className="flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100">
                <ShieldCheck size={12} />
                <span>Nuvem Ativa</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {activeTab === 'user' ? (
          <div>
            {!currentUser ? (
              <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-slate-800">Acesso do Técnico</h2>
                  <p className="text-slate-500 mt-1">Entre para emitir ordens de serviço</p>
                </div>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Login</label>
                    <input
                      type="text"
                      required
                      value={loginForm.login}
                      onChange={e => setLoginForm({ ...loginForm, login: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      placeholder="seu_login"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Senha</label>
                    <input
                      type="password"
                      required
                      value={loginForm.password}
                      onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                  <button
                    type="submit"
                    className={`w-full text-white py-3 font-bold transition-colors shadow-md rounded-${settings.borderRadius}`}
                    style={{ backgroundColor: settings.primaryColor }}
                  >
                    Entrar no Sistema
                  </button>
                </form>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-xl">
                      {currentUser.name.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-800">{currentUser.name}</h2>
                      <div className="flex items-center gap-3 text-sm text-slate-500">
                        <span className="bg-slate-100 px-2 py-0.5 rounded">RE: {currentUser.re}</span>
                        <div className="flex items-center gap-1">
                          <Clock size={14} />
                          <span>Turno: {currentUser.shiftStart} às {currentUser.shiftEnd}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 ${
                      checkShift(currentUser) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      <div className={`h-2 w-2 rounded-full ${checkShift(currentUser) ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                      {checkShift(currentUser) ? 'Dentro do Turno' : 'Fora do Turno'}
                    </div>
                    <button
                      onClick={logoutTech}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      title="Sair"
                    >
                      <LogOut size={20} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-800">Minhas Ordens de Serviço</h3>
                  <button
                    onClick={() => {
                      if (!checkShift(currentUser)) {
                        alert('Emissão bloqueada: Você está fora do seu horário de turno.');
                      } else {
                        setShowNewOSModal(true);
                      }
                    }}
                    disabled={!checkShift(currentUser)}
                    className={`flex items-center gap-2 px-6 py-2.5 font-bold shadow-lg transition-all rounded-${settings.borderRadius} ${
                      checkShift(currentUser) 
                      ? 'text-white hover:-translate-y-0.5' 
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                    style={{ backgroundColor: checkShift(currentUser) ? settings.primaryColor : undefined }}
                  >
                    <Plus size={20} />
                    Nova OS
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {orders.filter(os => os.techId === currentUser.id).length > 0 ? (
                    orders.filter(os => os.techId === currentUser.id).map(os => (
                      <div key={os.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-200 transition-colors">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-2 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-bold">
                            <FileText size={14} />
                            #{os.id}
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Emitida em</div>
                            <div className="text-sm font-bold text-slate-700">
                              {format(os.timestamp, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2 mb-4">
                          {Object.entries(os.data).slice(0, 3).map(([label, value]) => (
                            <div key={label} className="text-sm">
                              <span className="font-semibold text-slate-500">{label}: </span>
                              <span className="text-slate-800">{value}</span>
                            </div>
                          ))}
                        </div>
                        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600 px-2 py-0.5 bg-green-50 rounded">
                            <CheckCircle size={12} />
                            {os.status}
                          </span>
                          <button
                            onClick={() => generatePDF(os)}
                            className="flex items-center gap-1 px-3 py-1 bg-white text-blue-600 rounded-lg text-xs font-bold border border-blue-100 shadow-sm hover:bg-blue-600 hover:text-white transition-all"
                          >
                            <Download size={14} />
                            Gerar PDF
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full py-12 text-center bg-slate-100 rounded-2xl border-2 border-dashed border-slate-300">
                      <p className="text-slate-400 font-medium">Nenhuma ordem de serviço emitida ainda.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            {!adminAuth ? (
              <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-slate-800">Área Administrativa</h2>
                  <p className="text-slate-500 mt-1">Insira a senha de ativação para gerenciar</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Senha de Ativação</label>
                    <input
                      type="password"
                      value={adminPass}
                      onChange={e => setAdminPass(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      placeholder="••••••••"
                      onKeyDown={e => e.key === 'Enter' && handleAdminAuth()}
                    />
                  </div>
                  <button
                    onClick={handleAdminAuth}
                    className="w-full bg-slate-800 text-white py-3 rounded-lg font-bold hover:bg-slate-900 transition-colors shadow-md shadow-slate-200"
                  >
                    Acessar Configurações
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between flex-wrap gap-4 bg-white p-6 rounded-2xl border border-slate-200">
                  <div>
                    <h2 className="text-2xl font-extrabold text-slate-800">Painel de Controle</h2>
                    <p className="text-slate-500">Gestão de equipe, sincronização e registros</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={loadFromCloud}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg font-bold border border-blue-100 hover:bg-blue-100 transition-all"
                    >
                      <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
                      Sincronizar Dados (Nuvem)
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const data = { users, orders, settings };
                          const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `backup_mantemos_${format(new Date(), 'dd_MM_yyyy')}.json`;
                          a.click();
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-bold border border-slate-200 hover:bg-slate-200 transition-all text-xs"
                      >
                        <Download size={16} />
                        Exportar Dados
                      </button>
                      <label className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-bold border border-slate-200 hover:bg-slate-200 transition-all text-xs cursor-pointer">
                        <Plus size={16} />
                        Importar Dados
                        <input 
                          type="file" 
                          className="hidden" 
                          accept=".json" 
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                try {
                                  const data = JSON.parse(event.target?.result as string);
                                  if (data.users) setUsers(data.users);
                                  if (data.orders) setOrders(data.orders);
                                  if (data.settings) setSettings(data.settings);
                                  alert('Dados importados com sucesso!');
                                } catch (err) {
                                  alert('Erro ao importar arquivo.');
                                }
                              };
                              reader.readAsText(file);
                            }
                          }}
                        />
                      </label>
                    </div>
                    <button
                      onClick={logoutAdmin}
                      className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg font-bold border border-red-100 hover:bg-red-100 transition-all"
                    >
                      <LogOut size={18} />
                      Sair do Admin
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left Column: Management */}
                  <div className="lg:col-span-2 space-y-8">
                    {/* User Management */}
                    <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                          <UserIcon size={20} className="text-blue-500" />
                          Gestão de Equipe
                        </h3>
                      </div>
                      <div className="space-y-4">
                        <form className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100" onSubmit={e => {
                          e.preventDefault();
                          const fd = new FormData(e.currentTarget);
                          const newUser: User = {
                            id: Math.random().toString(36).substr(2, 9),
                            name: fd.get('name') as string,
                            re: fd.get('re') as string,
                            login: fd.get('login') as string,
                            password: fd.get('pass') as string,
                            shiftStart: fd.get('start') as string,
                            shiftEnd: fd.get('end') as string,
                          };
                          setUsers([...users, newUser]);
                          (e.target as HTMLFormElement).reset();
                        }}>
                          <input name="name" placeholder="Nome Completo" required className="px-3 py-2 rounded-lg border border-slate-200 text-sm" />
                          <input name="re" placeholder="RE" required className="px-3 py-2 rounded-lg border border-slate-200 text-sm" />
                          <input name="login" placeholder="Login de Acesso" required className="px-3 py-2 rounded-lg border border-slate-200 text-sm" />
                          <input name="pass" type="password" placeholder="Senha" required className="px-3 py-2 rounded-lg border border-slate-200 text-sm" />
                          <div className="flex items-center gap-2 col-span-full">
                            <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Horário do Turno:</span>
                            <input name="start" type="time" required className="px-3 py-2 rounded-lg border border-slate-200 text-sm flex-1" />
                            <span className="text-slate-300">às</span>
                            <input name="end" type="time" required className="px-3 py-2 rounded-lg border border-slate-200 text-sm flex-1" />
                          </div>
                          <button 
                            type="submit" 
                            className={`col-span-full text-white py-2 font-bold text-sm rounded-${settings.borderRadius}`}
                            style={{ backgroundColor: settings.primaryColor }}
                          >
                            Adicionar Técnico
                          </button>
                        </form>
                        
                        <div className="divide-y divide-slate-100">
                          {users.map(u => (
                            <div key={u.id} className="py-3 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold text-xs uppercase">
                                  {u.name.charAt(0)}
                                </div>
                                <div>
                                  <div className="text-sm font-bold text-slate-800">{u.name} <span className="text-xs font-normal text-slate-400">(RE: {u.re})</span></div>
                                  <div className="text-xs text-slate-500 font-medium">Turno: {u.shiftStart} - {u.shiftEnd} | Login: {u.login}</div>
                                </div>
                              </div>
                              <button onClick={() => setUsers(users.filter(x => x.id !== u.id))} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </section>

                    {/* All OS History */}
                    <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                          <ClipboardList size={20} className="text-blue-500" />
                          Histórico Geral de OS
                        </h3>
                      </div>
                      <div className="space-y-4">
                        {orders.length > 0 ? (
                          orders.map(os => (
                            <div key={os.id} className="p-4 rounded-xl border border-slate-100 hover:border-blue-100 transition-all group bg-slate-50/50">
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-800 text-sm">#{os.id}</span>
                                    <span className="text-xs text-slate-400 font-medium">{format(os.timestamp, "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                                  </div>
                                  <div className="text-xs font-bold text-blue-600 mt-0.5">Técnico: {os.techName} (RE: {os.techRE})</div>
                                </div>
                                <button
                                  onClick={() => generatePDF(os)}
                                  className="flex items-center gap-1 px-3 py-1 bg-white text-blue-600 rounded-lg text-xs font-bold border border-blue-100 shadow-sm hover:bg-blue-600 hover:text-white transition-all"
                                >
                                  <Download size={14} />
                                  PDF
                                </button>
                              </div>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                {Object.entries(os.data).map(([label, value]) => (
                                  <div key={label} className="text-xs text-slate-600 truncate">
                                    <span className="font-semibold">{label}:</span> {value}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-10 text-slate-400 italic">Nenhum registro encontrado.</div>
                        )}
                      </div>
                    </section>
                  </div>

                  {/* Right Column: App Settings */}
                  <div className="space-y-8">
                    {/* Layout Settings */}
                    <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <Smartphone size={20} style={{ color: settings.primaryColor }} />
                        Personalizar Layout
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Título do Aplicativo</label>
                          <input 
                            type="text" 
                            value={settings.appTitle}
                            onChange={e => setSettings({ ...settings, appTitle: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2"
                            style={{ ['--tw-ring-color' as any]: settings.primaryColor }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Cor Primária</label>
                          <div className="flex gap-2 items-center">
                            <input 
                              type="color" 
                              value={settings.primaryColor}
                              onChange={e => setSettings({ ...settings, primaryColor: e.target.value })}
                              className="h-10 w-10 p-1 rounded-lg border border-slate-200 cursor-pointer"
                            />
                            <input 
                              type="text" 
                              value={settings.primaryColor}
                              onChange={e => setSettings({ ...settings, primaryColor: e.target.value })}
                              className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm uppercase"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Estilo de Bordas</label>
                          <select 
                            value={settings.borderRadius}
                            onChange={e => setSettings({ ...settings, borderRadius: e.target.value as any })}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
                          >
                            <option value="none">Reto (None)</option>
                            <option value="md">Suave (Medium)</option>
                            <option value="lg">Arredondado (Large)</option>
                            <option value="xl">Extra Arredondado (XL)</option>
                            <option value="2xl">Muito Arredondado (2XL)</option>
                          </select>
                        </div>
                      </div>
                    </section>

                    {/* Logo & Branding */}
                    <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <ImageIcon size={20} className="text-blue-500" />
                        Logo & Marca
                      </h3>
                      <div className="space-y-4">
                        <div className="flex justify-center p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                          {settings.logo ? (
                            <div className="relative group">
                              <img src={settings.logo} alt="Preview" className="h-24 w-24 object-contain rounded-lg" />
                              <button 
                                onClick={() => setSettings({ ...settings, logo: null })}
                                className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Plus size={14} className="rotate-45" />
                              </button>
                            </div>
                          ) : (
                            <label className="cursor-pointer flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-blue-500 transition-colors">
                              <Plus size={32} />
                              <span className="text-xs font-bold">Adicionar Logo</span>
                              <input 
                                type="file" 
                                className="hidden" 
                                accept="image/*" 
                                onChange={e => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => setSettings({ ...settings, logo: reader.result as string });
                                    reader.readAsDataURL(file);
                                  }
                                }} 
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    </section>

                    {/* OS Form Configuration */}
                    <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <FileText size={20} className="text-blue-500" />
                        Formato da OS
                      </h3>
                      <p className="text-xs text-slate-500 mb-4">Personalize quais campos o técnico deve preencher na OS.</p>
                      
                      <div className="space-y-3 mb-6">
                        {settings.osFields.map(f => (
                          <div key={f.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-sm border border-slate-100">
                            <span className="font-semibold text-slate-700">{f.label}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-500 uppercase">{f.type === 'textarea' ? 'Texto Longo' : f.type}</span>
                              <button 
                                onClick={() => setSettings({ ...settings, osFields: settings.osFields.filter(x => x.id !== f.id) })}
                                className="text-slate-300 hover:text-red-500"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                        <div className="text-xs font-bold text-blue-700 mb-2">Adicionar Novo Campo</div>
                        <form className="space-y-2" onSubmit={e => {
                          e.preventDefault();
                          const fd = new FormData(e.currentTarget);
                          const newF: OSField = {
                            id: Math.random().toString(36).substr(2, 9),
                            label: fd.get('label') as string,
                            type: fd.get('type') as any,
                            required: true
                          };
                          setSettings({ ...settings, osFields: [...settings.osFields, newF] });
                          (e.target as HTMLFormElement).reset();
                        }}>
                          <input name="label" required placeholder="Nome do Campo (ex: Local)" className="w-full px-2 py-1.5 rounded border border-blue-200 text-xs" />
                          <div className="flex gap-2">
                            <select name="type" className="flex-1 px-2 py-1.5 rounded border border-blue-200 text-xs bg-white">
                              <option value="text">Texto Curto</option>
                              <option value="textarea">Texto Longo</option>
                              <option value="number">Número</option>
                            </select>
                            <button type="submit" className="px-3 py-1.5 bg-blue-600 text-white rounded font-bold text-xs">
                              Add
                            </button>
                          </div>
                        </form>
                      </div>
                    </section>

                    {/* Device Sync Info */}
                    <section className="bg-blue-600 p-6 rounded-2xl shadow-lg text-white">
                      <div className="flex items-center gap-2 mb-3">
                        <Smartphone size={20} />
                        <Monitor size={20} />
                        <h3 className="font-bold">Sincronização Ativa</h3>
                      </div>
                      <p className="text-xs text-blue-100 leading-relaxed mb-4">
                        Este aplicativo está configurado para salvar dados localmente e sincronizar automaticamente entre o seu Celular e o Computador.
                      </p>
                      <div className="flex items-center gap-2 text-[10px] font-bold bg-blue-700 p-2 rounded-lg">
                        <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
                        {syncing ? 'SINCRONIZANDO...' : 'ESTADO: SINCRONIZADO'}
                      </div>
                    </section>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* New OS Modal */}
      {showNewOSModal && currentUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Nova Ordem de Serviço</h3>
                <p className="text-xs text-slate-500 font-medium">Técnico: {currentUser.name} | RE: {currentUser.re}</p>
              </div>
              <button onClick={() => setShowNewOSModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <Plus size={24} className="rotate-45" />
              </button>
            </div>
            
            <div className="overflow-y-auto p-6 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                <Clock size={14} />
                Emissão registrada para: {format(new Date(), "HH:mm 'em' dd/MM/yyyy")}
              </div>

              <form id="new-os-form" onSubmit={e => {
                e.preventDefault();
                createOS(new FormData(e.currentTarget));
              }} className="space-y-4">
                {settings.osFields.map(field => (
                  <div key={field.id}>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    {field.type === 'textarea' ? (
                      <textarea
                        name={field.id}
                        required={field.required}
                        rows={5}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                        placeholder={`Descreva detalhadamente o problema ou serviço realizado...`}
                      />
                    ) : (
                      <input
                        type={field.type}
                        name={field.id}
                        required={field.required}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                        placeholder={`Preencha o campo ${field.label.toLowerCase()}`}
                      />
                    )}
                  </div>
                ))}
              </form>
            </div>

            <div className="p-6 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => setShowNewOSModal(false)}
                className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors border border-transparent"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="new-os-form"
                className={`flex-1 py-3 text-white text-sm font-bold shadow-lg transition-all flex items-center justify-center gap-2 rounded-${settings.borderRadius}`}
                style={{ backgroundColor: settings.primaryColor }}
              >
                <Save size={18} />
                Emitir Registro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sync Notification (Mobile Style) */}
      <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ${syncing ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'}`}>
        <div className="bg-slate-800 text-white px-4 py-2 rounded-full shadow-2xl flex items-center gap-3 text-xs font-bold ring-4 ring-white">
          <RefreshCw size={14} className="animate-spin text-blue-400" />
          Sincronizando com a Nuvem...
        </div>
      </div>
    </div>
  );
}
