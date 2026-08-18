
import React, { useState } from 'react';
import { AppProvider, useAppContext } from './store';
import { Dashboard } from './components/Dashboard';
import { ProjectsTab } from './components/ProjectsTab';
import { TasksTab } from './components/TasksTab';
import { BacklogTab } from './components/BacklogTab';
import { Login } from './components/Login';
import { LayoutDashboard, FolderKanban, CheckSquare, Archive, Settings, LogOut, KeyRound, Eye, EyeOff, Menu, X } from 'lucide-react';

const AdminTab = React.lazy(() => import('./components/AdminTab').then(module => ({ default: module.AdminTab })));

function AppContent() {
  const { currentUser, logout, departments, updateUser, rolePermissions } = useAppContext();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'projects' | 'tasks' | 'backlog' | 'admin'>('dashboard');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [cpCurrentPassword, setCpCurrentPassword] = useState('');
  const [cpNewPassword, setCpNewPassword] = useState('');
  const [showCpNewPassword, setShowCpNewPassword] = useState(false);
  const [cpConfirmPassword, setCpConfirmPassword] = useState('');
  const [cpError, setCpError] = useState('');
  const [cpSuccess, setCpSuccess] = useState('');

  if (!currentUser) {
    return <Login />;
  }

  const userRolePerm = rolePermissions.find(rp => rp.role === currentUser.role);
  const canAccessAdmin = userRolePerm?.canAccessAdmin ?? (currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN');

  const getRoleLabel = (role: string) => {
    if (role === 'SUPER_ADMIN') return 'Супер адмін';
    if (role === 'ADMIN') return 'Адміністратор';
    return 'Користувач';
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setCpError('');
    setCpSuccess('');
    
    if (!cpCurrentPassword || !cpNewPassword || !cpConfirmPassword) {
      setCpError('Будь ласка, заповніть всі поля');
      return;
    }
    
    if (cpNewPassword !== cpConfirmPassword) {
      setCpError('Нові паролі не співпадають');
      return;
    }
    
    if (currentUser.password && currentUser.password !== cpCurrentPassword) {
      setCpError('Невірний поточний пароль');
      return;
    }
    
    updateUser(currentUser.id, { password: cpNewPassword });
    setCpSuccess('Пароль успішно змінено!');
    
    setTimeout(() => {
      setShowPasswordModal(false);
      setCpCurrentPassword('');
      setCpNewPassword('');
      setCpConfirmPassword('');
      setCpSuccess('');
    }, 2000);
  };

  const deptName = currentUser.departmentId ? departments.find(d => d.id === currentUser.departmentId)?.name : '';
  const tabs = [
    { id: 'dashboard', label: 'Аналітика', icon: <LayoutDashboard size={20} />, show: true },
    { id: 'projects', label: 'Проєкти', icon: <FolderKanban size={20} />, show: true },
    { id: 'tasks', label: 'Операційні задачі', icon: <CheckSquare size={20} />, show: true },
    { id: 'backlog', label: 'Беклог', icon: <Archive size={20} />, show: true },
    { id: 'admin', label: 'Адміністрування', icon: <Settings size={20} />, show: canAccessAdmin },
  ] as const;

  const visibleTabs = tabs.filter(t => t.show);
  const currentTab = visibleTabs.find(t => t.id === activeTab) || visibleTabs[0];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col lg:flex-row overflow-hidden">
      {/* Mobile/Tablet Backdrop Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`w-64 bg-slate-900 flex flex-col p-6 text-slate-300 border-r border-slate-800 fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg width="28" height="28" viewBox="0 0 100 100" fill="currentColor" className="text-indigo-500 shrink-0">
              <rect x="0" y="0" width="34" height="34" />
              <rect x="33" y="0" width="34" height="34" />
              <rect x="33" y="33" width="34" height="34" />
              <rect x="66" y="33" width="34" height="34" />
              <rect x="66" y="66" width="34" height="34" />
              <rect x="0" y="66" width="34" height="34" />
            </svg>
            <h1 className="text-white font-bold text-lg tracking-tight flex items-center gap-2">
              PMO Hub 
            </h1>
          </div>
          <button 
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 space-y-2 overflow-y-auto">
          {visibleTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                currentTab.id === tab.id 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-semibold' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 cursor-pointer'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-4 pt-4 border-t border-slate-800 relative">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="w-10 h-10 bg-indigo-500/20 hover:bg-indigo-500/30 transition-colors text-indigo-300 rounded-full flex items-center justify-center font-bold border-2 border-indigo-500/30 cursor-pointer shrink-0"
            >
              {currentUser.name.charAt(0)}
            </button>
            <div className="overflow-hidden flex-1 cursor-pointer" onClick={() => setShowProfileMenu(!showProfileMenu)}>
              <div className="text-sm font-bold text-white truncate">{currentUser.name}</div>
              <div className="text-xs text-slate-400 font-medium truncate">
                {getRoleLabel(currentUser.role)} {deptName ? `• ${deptName}` : ''}
              </div>
            </div>
          </div>
          
          {showProfileMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowProfileMenu(false)}></div>
              <div className="absolute bottom-full left-0 mb-4 w-full bg-slate-800 rounded-xl shadow-lg border border-slate-700 py-1 z-20">
                <button 
                  onClick={() => { setShowProfileMenu(false); setShowPasswordModal(true); setMobileMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2"
                >
                  <KeyRound size={16} /> Змінити пароль
                </button>
                <button 
                  onClick={() => { logout(); setActiveTab('dashboard'); setMobileMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 text-sm text-rose-400 hover:bg-slate-700 flex items-center gap-2 border-t border-slate-700"
                >
                  <LogOut size={16} /> Вийти
                </button>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 lg:ml-64 ml-0 flex flex-col h-screen overflow-hidden min-w-0">
        {/* Mobile / Tablet Header Bar */}
        <header className="lg:hidden bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800 shrink-0 z-20">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
              aria-label="Toggle menu"
            >
              <Menu size={22} />
            </button>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-white">{currentTab.label}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-indigo-300 bg-indigo-950/80 px-2.5 py-1 rounded-lg border border-indigo-500/30 font-semibold truncate max-w-[150px]">
            {currentUser.name}
          </div>
        </header>

        <div className="flex-1 p-3 sm:p-4 md:p-6 overflow-y-auto space-y-6">
          <div className={`w-full mx-auto ${['projects', 'tasks', 'backlog', 'dashboard'].includes(currentTab.id) ? 'max-w-[1920px] 2xl:max-w-full' : 'max-w-7xl'}`}>
            {currentTab.id === 'dashboard' && <Dashboard />}
            {currentTab.id === 'projects' && <ProjectsTab />}
            {currentTab.id === 'tasks' && <TasksTab />}
            {currentTab.id === 'backlog' && <BacklogTab />}
            {currentTab.id === 'admin' && <React.Suspense fallback={<div className="p-8 text-center text-slate-500">Завантаження адміністрування…</div>}><AdminTab /></React.Suspense>}
          </div>
        </div>
      </main>

      {showPasswordModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] my-auto p-6 relative shadow-2xl overflow-y-auto border border-slate-200">
            <button onClick={() => setShowPasswordModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              ✕
            </button>
            <h2 className="text-xl font-bold text-slate-900 mb-6">Змінити пароль</h2>
            
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Поточний пароль</label>
                <input type="password" value={cpCurrentPassword} onChange={e => setCpCurrentPassword(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Новий пароль</label>
                <div className="relative">
                  <input type={showCpNewPassword ? "text" : "password"} value={cpNewPassword} onChange={e => setCpNewPassword(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 pr-10 outline-none focus:ring-2 focus:ring-indigo-500" />
                  <button type="button" onClick={() => setShowCpNewPassword(!showCpNewPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none">
                    {showCpNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Підтвердження пароля</label>
                <input type="password" value={cpConfirmPassword} onChange={e => setCpConfirmPassword(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              
              {cpError && <div className="text-rose-600 text-sm font-medium">{cpError}</div>}
              {cpSuccess && <div className="text-emerald-600 text-sm font-medium bg-emerald-50 p-2 rounded-lg">{cpSuccess}</div>}
              
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setShowPasswordModal(false)} className="px-4 py-2 rounded-lg font-bold text-slate-600 hover:bg-slate-100">Скасувати</button>
                <button type="submit" className="px-4 py-2 rounded-lg font-bold bg-indigo-500 text-white hover:bg-indigo-600">Змінити пароль</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
