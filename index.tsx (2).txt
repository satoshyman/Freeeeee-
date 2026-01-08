
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

// --- التكوين (استبدل YourBotName باسم بوتك الحقيقي) ---
const BOT_USERNAME = "YourBotName"; 
const REWARD_AMOUNT = 0.05; // مكافأة الإحالة (للداعي)
const WELCOME_BONUS = 0.01; // مكافأة للمدعو (للتأكد من عمل النظام)
const MINING_RATE = 0.015; 
const MINING_TIME = 3 * 60 * 60 * 1000; 

enum AppTab { MINING = 'mining', FRIENDS = 'friends', TASKS = 'tasks', WALLET = 'wallet' }

interface User {
  id: string;
  username: string;
  balance: number;
  referralsCount: number;
  referredBy?: string;
  miningState: { isActive: boolean; startTime?: number; };
  hasStartedFirstMining: boolean;
  completedTasks: number[];
}

const DB_KEY = 'ton_miner_v9_db';
const getDB = () => JSON.parse(localStorage.getItem(DB_KEY) || '{}');
const saveDB = (db: any) => localStorage.setItem(DB_KEY, JSON.stringify(db));

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [tab, setTab] = useState<AppTab>(AppTab.MINING);
  const [timeLeft, setTimeLeft] = useState(0);
  const [sessionEarning, setSessionEarning] = useState(0);

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    tg?.ready();
    tg?.expand();

    const tgUser = tg?.initDataUnsafe?.user;
    const startParam = tg?.initDataUnsafe?.start_param;
    const userId = tgUser?.id?.toString() || "dev_test_user";
    
    const db = getDB();
    
    if (db[userId]) {
      setUser(db[userId]);
    } else {
      // مستخدم جديد
      const newUser: User = {
        id: userId,
        username: tgUser?.username || "Miner",
        balance: 0,
        referralsCount: 0,
        referredBy: (startParam && startParam !== userId) ? startParam : undefined,
        miningState: { isActive: false },
        hasStartedFirstMining: false,
        completedTasks: []
      };

      // إذا جاء عن طريق إحالة، نعطيه بونص ترحيبي فوراً كإثبات لعمل النظام
      if (newUser.referredBy) {
        newUser.balance += WELCOME_BONUS;
        // ملاحظة: في النسخة الواقعية، يجب تحديث رصيد "الداعي" في السيرفر (Backend)
        // هنا نقوم بزيادة عداد الإحالات محلياً إذا كان الداعي مسجلاً على نفس المتصفح (للتجربة)
        if (db[newUser.referredBy]) {
          db[newUser.referredBy].referralsCount += 1;
        }
      }

      db[userId] = newUser;
      saveDB(db);
      setUser(newUser);
    }
  }, []);

  useEffect(() => {
    let timer: any;
    if (user?.miningState.isActive && user.miningState.startTime) {
      timer = setInterval(() => {
        const elapsed = Date.now() - user.miningState.startTime!;
        const remaining = Math.max(0, MINING_TIME - elapsed);
        const progress = Math.min(1, elapsed / MINING_TIME);
        
        setTimeLeft(remaining);
        setSessionEarning(progress * MINING_RATE);

        if (remaining <= 0) clearInterval(timer);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [user?.miningState]);

  const startMining = () => {
    if (!user) return;
    const db = getDB();
    const updated = { ...user };
    updated.miningState = { isActive: true, startTime: Date.now() };
    
    // عند أول تشغيل للمعدن، يتم تفعيل المكافأة للداعي
    if (!updated.hasStartedFirstMining && updated.referredBy) {
      updated.hasStartedFirstMining = true;
      // هنا المنطق البرمجي لإرسال المكافأة (يتطلب Backend للعمل بين جهازين)
    }

    db[updated.id] = updated;
    saveDB(db);
    setUser(updated);
    (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');
  };

  const collectMining = () => {
    if (!user) return;
    const db = getDB();
    const updated = { ...user };
    updated.balance += sessionEarning;
    updated.miningState = { isActive: false };
    
    db[updated.id] = updated;
    saveDB(db);
    setUser(updated);
    setSessionEarning(0);
    (window as any).Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
  };

  const formatTime = (ms: number) => {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleShare = () => {
    const link = `https://t.me/${BOT_USERNAME}/app?startapp=${user?.id}`;
    const text = "💎 انضم إلي في تعدين عملة TON! استعمل الرابط واحصل على هدية فورية:";
    const url = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`;
    (window as any).Telegram?.WebApp?.openTelegramLink(url);
  };

  if (!user) return null;

  return (
    <div className="flex flex-col min-h-screen p-4 pb-32">
      {/* Top Header */}
      <div className="flex justify-between items-center mb-10 glass-card p-4 rounded-3xl border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#0088CC] rounded-full flex items-center justify-center font-black shadow-[0_0_15px_#0088CC]">TON</div>
          <div>
            <p className="text-[10px] opacity-40 uppercase font-black mb-0.5">Balance</p>
            <p className="text-xl font-black">{user.balance.toFixed(4)}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-[#00d2ff] font-black tracking-widest uppercase">Node Active</p>
          <p className="text-xs font-bold opacity-60">@{user.username}</p>
        </div>
      </div>

      <main className="flex-grow">
        {tab === AppTab.MINING && (
          <div className="flex flex-col items-center space-y-12">
            <div className="text-center">
              <p className="text-[10px] opacity-30 font-black uppercase tracking-[0.4em] mb-1">Mining Rate</p>
              <h2 className="text-6xl font-black">{sessionEarning.toFixed(6)}</h2>
              <p className="text-[#00d2ff] text-xs font-bold">TON COIN</p>
            </div>

            <div className="relative">
              {user.miningState.isActive && <div className="absolute inset-0 bg-[#0088CC]/20 blur-[80px] rounded-full mining-pulse"></div>}
              <div className={`w-64 h-64 glass-card rounded-full flex items-center justify-center border-2 transition-all duration-700 ${user.miningState.isActive ? 'border-[#0088CC]/50 animate-ton-pulse' : 'border-white/5 opacity-30'}`}>
                <svg viewBox="0 0 100 100" className="w-32 h-32">
                  <circle cx="50" cy="50" r="45" fill="#0088CC" />
                  <path d="M50 25L25 45L50 75L75 45L50 25Z" fill="white" />
                </svg>
              </div>
            </div>

            <div className="w-full space-y-4">
              <div className="glass-card py-3 rounded-2xl text-center text-xs font-black tracking-widest opacity-60">
                {user.miningState.isActive ? `REMAINING: ${formatTime(timeLeft)}` : "STANDBY"}
              </div>
              <button 
                onClick={user.miningState.isActive ? (timeLeft <= 0 ? collectMining : undefined) : startMining}
                className={`w-full py-6 rounded-[2rem] font-black text-xl shadow-2xl transition-all active:scale-95 ${user.miningState.isActive ? (timeLeft <= 0 ? 'bg-green-500 text-black' : 'bg-white/5 text-white/20 cursor-default') : 'bg-gradient-to-r from-[#00d2ff] to-[#0088CC] text-white'}`}
              >
                {user.miningState.isActive ? (timeLeft > 0 ? "Mining..." : "Collect Profit 💎") : "Start Mining ⚡"}
              </button>
            </div>
          </div>
        )}

        {tab === AppTab.FRIENDS && (
          <div className="space-y-6 animate-in slide-in-from-bottom-10">
            <div className="text-center py-4">
              <h2 className="text-3xl font-black mb-1">الأصدقاء 👥</h2>
              <p className="text-xs opacity-50 font-bold">اربح {REWARD_AMOUNT} TON عن كل صديق جديد</p>
            </div>
            
            <div className="glass-card p-6 rounded-3xl text-center border-white/5">
              <p className="text-[10px] opacity-40 font-black mb-1 uppercase tracking-widest">Your Referrals</p>
              <p className="text-4xl font-black">{user.referralsCount}</p>
            </div>

            <div className="glass-card p-5 rounded-3xl space-y-4 border-[#00d2ff]/20">
              <div className="flex gap-4 items-center">
                <div className="w-12 h-12 bg-[#0088CC]/10 rounded-2xl flex items-center justify-center text-2xl">🔗</div>
                <p className="text-xs font-bold leading-relaxed opacity-80">رابط الإحالة الخاص بك يعمل الآن. شاركه مع أصدقائك للحصول على مكافآت فورية عند بدئهم التعدين.</p>
              </div>
              <button onClick={handleShare} className="w-full bg-white text-black py-4 rounded-2xl font-black shadow-xl">دعوة صديق 🚀</button>
            </div>
          </div>
        )}

        {tab === AppTab.TASKS && <div className="text-center py-20 opacity-30 italic font-bold">المهام قريباً...</div>}
        {tab === AppTab.WALLET && <div className="text-center py-20 opacity-30 italic font-bold">المحفظة قريباً...</div>}
      </main>

      {/* Navigation */}
      <nav className="fixed bottom-8 left-6 right-6 glass-card p-2 rounded-[2.5rem] flex justify-around shadow-2xl z-50 border-white/10">
        {[
          { id: AppTab.MINING, icon: "💎", label: "Mining" },
          { id: AppTab.TASKS, icon: "🎯", label: "Tasks" },
          { id: AppTab.FRIENDS, icon: "👥", label: "Friends" },
          { id: AppTab.WALLET, icon: "🏦", label: "Wallet" }
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as AppTab)} className={`flex flex-col items-center px-5 py-3 rounded-[2rem] transition-all ${tab === t.id ? 'bg-[#0088CC] text-white shadow-lg' : 'opacity-30'}`}>
            <span className="text-xl mb-1">{t.icon}</span>
            <span className="text-[8px] font-black uppercase tracking-tighter">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
}
