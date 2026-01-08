
import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom/client';

// --- CONFIGURATION ---
const BOT_USERNAME = "YourBotName"; 
const SECRET_PASS = "778899";
const ADMIN_IDS = ["dev_test_user"]; // إضافة ID الخاص بك هنا

const DEFAULT_CONFIG = {
  miningDuration: 3 * 60 * 60 * 1000,
  miningRate: 0.015,
  minWithdrawal: 0.1
};

enum AppTab { MINING = 'mining', FRIENDS = 'friends', TASKS = 'tasks', WALLET = 'wallet', ADMIN = 'admin' }

// --- DB SYSTEM ---
const DB_KEY = 'ton_miner_v10_db';
const getDB = () => JSON.parse(localStorage.getItem(DB_KEY) || '{}');
const saveDB = (db: any) => localStorage.setItem(DB_KEY, JSON.stringify(db));

// --- COMPONENTS ---

const TonIcon = ({ size = "w-8 h-8" }) => (
  <svg viewBox="0 0 100 100" fill="none" className={`${size} drop-shadow-[0_0_8px_rgba(0,136,204,0.6)]`}>
    <circle cx="50" cy="50" r="45" fill="#0088CC"/>
    <path d="M50 25L25 45L50 75L75 45L50 25Z" fill="white"/>
  </svg>
);

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.MINING);
  const [adminTaps, setAdminTaps] = useState(0);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [sessionEarning, setSessionEarning] = useState(0);

  // Initialize
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    tg?.ready();
    tg?.expand();

    const tgUser = tg?.initDataUnsafe?.user;
    const userId = tgUser?.id?.toString() || "dev_test_user";
    const startParam = tg?.initDataUnsafe?.start_param;
    
    const db = getDB();
    if (db[userId]) {
      setUser(db[userId]);
    } else {
      const newUser = {
        id: userId,
        username: tgUser?.username || "Miner",
        balance: 0,
        referrals: [],
        activeReferrals: [],
        miningState: { isActive: false },
        completedTasks: [],
        withdrawals: [],
        hasStartedFirstMining: false
      };
      
      if (startParam && db[startParam]) {
        db[startParam].referrals.push(userId);
      }

      db[userId] = newUser;
      saveDB(db);
      setUser(newUser);
    }
  }, []);

  // Timer Effect
  useEffect(() => {
    let timer: any;
    if (user?.miningState?.isActive) {
      timer = setInterval(() => {
        const elapsed = Date.now() - user.miningState.startTime;
        const remaining = Math.max(0, DEFAULT_CONFIG.miningDuration - elapsed);
        const progress = Math.min(1, elapsed / DEFAULT_CONFIG.miningDuration);
        
        setTimeLeft(remaining);
        setSessionEarning(progress * DEFAULT_CONFIG.miningRate);
        if (remaining <= 0) clearInterval(timer);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [user?.miningState]);

  const handleStartMining = () => {
    const db = getDB();
    const updated = { ...user, miningState: { isActive: true, startTime: Date.now() } };
    db[user.id] = updated;
    saveDB(db);
    setUser(updated);
    (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');
  };

  const handleCollect = () => {
    const db = getDB();
    const updated = { 
      ...user, 
      balance: user.balance + sessionEarning, 
      miningState: { isActive: false } 
    };
    db[user.id] = updated;
    saveDB(db);
    setUser(updated);
    setSessionEarning(0);
    (window as any).Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
  };

  const handleSecretTrigger = () => {
    setAdminTaps(v => v + 1);
    if (adminTaps + 1 >= 5) {
      const pass = prompt("أدخل الرمز السري للإدارة:");
      if (pass === SECRET_PASS) {
        setIsAdminUnlocked(true);
        setActiveTab(AppTab.ADMIN);
      }
      setAdminTaps(0);
    }
  };

  const formatTime = (ms: number) => {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!user) return null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <header className="flex justify-between items-center p-4 z-20">
        <div className="glass-card px-4 py-2 rounded-2xl flex items-center gap-3 glass-border-blue">
          <TonIcon size="w-6 h-6" />
          <div>
            <p className="text-[8px] opacity-60 uppercase font-black leading-none mb-0.5 tracking-wider">TON Balance</p>
            <p className="text-base font-black leading-none">{user.balance.toFixed(6)}</p>
          </div>
        </div>
        <div onClick={handleSecretTrigger} className="text-right active:scale-95 transition-transform cursor-pointer">
          <p className="text-[9px] text-[#00d2ff] font-black uppercase tracking-tighter">
            {isAdminUnlocked ? "ADMIN MODE" : "NETWORK NODE"}
          </p>
          <p className="text-xs font-bold opacity-70">@{user.username}</p>
        </div>
      </header>

      {/* Main Viewport */}
      <main className="flex-1 overflow-y-auto px-4 pb-32">
        {activeTab === AppTab.MINING && (
          <div className="flex flex-col items-center justify-between min-h-[70vh] py-2">
            <div className="text-center space-y-1 mt-4">
              <p className="text-[10px] opacity-30 font-black uppercase tracking-[0.3em]">Mining Progress</p>
              <h2 className="text-5xl font-black">{sessionEarning.toFixed(6)}</h2>
              <p className="text-[#00d2ff] text-xs font-bold tracking-widest">TON COINS</p>
            </div>

            <div className="relative my-4">
              {user.miningState.isActive && <div className="absolute inset-0 bg-[#0088CC]/20 blur-[60px] rounded-full animate-pulse"></div>}
              <div className={`w-56 h-56 glass-card rounded-full flex items-center justify-center border-2 transition-all duration-700 ${user.miningState.isActive ? 'border-[#0088CC]/50 animate-ton-pulse' : 'border-white/5 opacity-40'}`}>
                <TonIcon size="w-24 h-24" />
              </div>
            </div>

            <div className="w-full space-y-3">
              <div className="glass-card py-2.5 rounded-2xl text-center text-[10px] font-black tracking-[0.2em] opacity-60">
                {user.miningState.isActive ? `SESSION ENDS IN: ${formatTime(timeLeft)}` : "SYSTEM READY"}
              </div>
              <button 
                onClick={user.miningState.isActive ? (timeLeft <= 0 ? handleCollect : undefined) : handleStartMining}
                className={`w-full py-5 rounded-[2rem] font-black text-lg transition-all active:scale-95 shadow-2xl ${user.miningState.isActive ? (timeLeft <= 0 ? 'bg-green-500 text-black' : 'bg-white/5 text-white/20') : 'bg-gradient-to-r from-[#00d2ff] to-[#0088CC] text-white'}`}
              >
                {user.miningState.isActive ? (timeLeft > 0 ? "Mining in progress..." : "Collect Profit 💎") : "Start Mining ⚡"}
              </button>
            </div>
          </div>
        )}

        {activeTab === AppTab.FRIENDS && (
          <div className="space-y-6 pt-4 animate-in fade-in">
            <div className="text-center">
              <h2 className="text-2xl font-black mb-1">الأصدقاء 👥</h2>
              <p className="text-xs opacity-50">اربح 0.01 TON عن كل صديق نشط</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="glass-card p-4 rounded-3xl text-center">
                <p className="text-[10px] opacity-40 uppercase mb-1">Total</p>
                <p className="text-2xl font-black">{user.referrals.length}</p>
              </div>
              <div className="glass-card p-4 rounded-3xl text-center border-[#00d2ff]/20">
                <p className="text-[10px] text-[#00d2ff] uppercase mb-1">Active</p>
                <p className="text-2xl font-black text-[#00d2ff]">{user.activeReferrals.length}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === AppTab.ADMIN && (
          <div className="space-y-4 pt-4 animate-in slide-in-from-bottom-5">
            <h2 className="text-xl font-black text-center text-red-400">Control Panel 🛠️</h2>
            <div className="glass-card p-4 rounded-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-xs">رصيدك الحالي</span>
                <span className="font-bold text-[#00d2ff]">{user.balance.toFixed(4)}</span>
              </div>
              <button onClick={() => {
                const amount = prompt("أدخل الرصيد الجديد:");
                if(amount) {
                  const db = getDB();
                  db[user.id].balance = parseFloat(amount);
                  saveDB(db);
                  setUser(db[user.id]);
                }
              }} className="w-full bg-white/5 py-3 rounded-xl text-xs font-bold">تعديل رصيدي (Admin Only)</button>
              <button onClick={() => setActiveTab(AppTab.MINING)} className="w-full bg-red-500/20 text-red-400 py-3 rounded-xl text-xs font-bold">إغلاق لوحة التحكم</button>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-6 left-6 right-6 glass-card p-1.5 rounded-[2.5rem] flex justify-around shadow-2xl z-50 border-white/10">
        {[
          { id: AppTab.MINING, icon: "💎", label: "Mine" },
          { id: AppTab.TASKS, icon: "🎯", label: "Tasks" },
          { id: AppTab.FRIENDS, icon: "👥", label: "Friends" },
          { id: AppTab.WALLET, icon: "🏦", label: "Wallet" }
        ].map(t => (
          <button 
            key={t.id} 
            onClick={() => setActiveTab(t.id as AppTab)}
            className={`flex flex-col items-center px-4 py-2.5 rounded-[2rem] transition-all ${activeTab === t.id ? 'bg-[#0088CC] text-white shadow-lg scale-105' : 'opacity-30'}`}
          >
            <span className="text-lg">{t.icon}</span>
            <span className="text-[7px] font-black uppercase tracking-tighter mt-0.5">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
