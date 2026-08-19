import React, { useState } from 'react';
import { useAppContext } from '../store';
import { User } from '../types';
import { Eye, EyeOff } from 'lucide-react';

export const Login = () => {
  const { users, login, departments, updateUser } = useAppContext();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showCpNewPassword, setShowCpNewPassword] = useState(false);
  
  const [cpEmail, setCpEmail] = useState('');
  const [cpCurrentPassword, setCpCurrentPassword] = useState('');
  const [cpNewPassword, setCpNewPassword] = useState('');
  const [cpConfirmPassword, setCpConfirmPassword] = useState('');
  const [cpError, setCpError] = useState('');
  const [cpSuccess, setCpSuccess] = useState('');

  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (user) {
      if (user.password === password) {
        login(user);
      } else {
        setError('Невірний пароль');
      }
    } else {
      setError('Користувача з таким email не знайдено');
    }
  };

  const handleTestUserClick = (user: User) => {
    setEmail(user.email);
    setPassword(user.password || 'password123');
    setError('');
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setCpError('');
    setCpSuccess('');
    
    if (!cpEmail || !cpCurrentPassword || !cpNewPassword || !cpConfirmPassword) {
      setCpError('Будь ласка, заповніть всі поля');
      return;
    }
    
    if (cpNewPassword !== cpConfirmPassword) {
      setCpError('Нові паролі не співпадають');
      return;
    }
    
    const user = users.find(u => u.email.toLowerCase() === cpEmail.toLowerCase());
    if (!user || user.password !== cpCurrentPassword) {
      setCpError('Невірний email або поточний пароль');
      return;
    }
    
    updateUser(user.id, { password: cpNewPassword });
    setCpSuccess('Пароль успішно змінено!');
    
    setTimeout(() => {
      setShowPasswordModal(false);
      setCpEmail('');
      setCpCurrentPassword('');
      setCpNewPassword('');
      setCpConfirmPassword('');
      setCpSuccess('');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 w-full max-w-md my-8">
        
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex items-center gap-3">
            <svg width="28" height="28" viewBox="0 0 100 100" fill="currentColor" className="text-indigo-500 shrink-0">
              <rect x="0" y="0" width="34" height="34" />
              <rect x="33" y="0" width="34" height="34" />
              <rect x="33" y="33" width="34" height="34" />
              <rect x="66" y="33" width="34" height="34" />
              <rect x="66" y="66" width="34" height="34" />
              <rect x="0" y="66" width="34" height="34" />
            </svg>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">PMO Hub</h1>
          </div>
          <p className="text-slate-500 text-sm">Увійдіть у систему для продовження</p>
        </div>

        <form onSubmit={handleEmailLogin} className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Ел. пошта</label>
            <input 
              type="email" 
              value={email}
              onChange={e => { setEmail(e.target.value); setError(''); }}
              className="w-full border border-slate-300 rounded-lg px-4 py-2 bg-slate-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
              placeholder="Введіть email..."
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Пароль</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                className="w-full border border-slate-300 rounded-lg px-4 py-2 pr-10 bg-slate-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                placeholder="Введіть пароль..."
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          {error && <p className="text-rose-600 text-sm font-medium">{error}</p>}
          <button type="submit" className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 rounded-lg transition-colors mt-2">
            Увійти
          </button>
        </form>

        <div className="text-center mb-8">
          <button 
            onClick={() => setShowPasswordModal(true)} 
            className="text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors"
          >
            Змінити пароль
          </button>
        </div>

        <div className="relative mb-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-slate-500">швидкий вибір тестового користувача</span>
          </div>
        </div>
        
        <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
          {((users || [])).map(user => (
            <button
              key={user.id}
              onClick={() => handleTestUserClick(user)}
              className="w-full text-left px-4 py-3 rounded-lg border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 transition-colors flex justify-between items-center group"
            >
              <div>
                <div className="font-bold text-slate-900 group-hover:text-indigo-900">{user.name}</div>
                <div className="text-xs text-slate-500">{user.email} &bull; {departments.find(d => d.id === user.departmentId)?.name || '—'}</div>
              </div>
              <div className="text-xs font-bold px-2 py-1 bg-slate-100 text-slate-600 rounded uppercase group-hover:bg-indigo-100 group-hover:text-indigo-700">
                {user.role}
              </div>
            </button>
          ))}
        </div>
      </div>

      {showPasswordModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 relative shadow-2xl">
            <button onClick={() => setShowPasswordModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              ✕
            </button>
            <h2 className="text-xl font-bold text-slate-900 mb-6">Змінити пароль</h2>
            
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ел. пошта</label>
                <input type="email" value={cpEmail} onChange={e => setCpEmail(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Поточний / Тимчасовий пароль</label>
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
};

export default Login;
