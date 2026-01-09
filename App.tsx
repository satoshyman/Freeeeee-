
import React, { useState, useEffect, useCallback, useRef } from 'react';

// AdsGram TypeScript Declaration
declare global {
  interface Window {
    Adsgram: any;
  }
}

interface WithdrawalHistory {
  id: string;
  amount: number;
  address: string;
  status: 'Pending' | 'Completed' | 'Rejected';
  date: string;
}

interface User {
  id: string;
  username: string;
  balance: number;
  joined: string;
  lastActive: string;
}

const App: React.FC = () => {
  // --- USER STATES ---
  const [balance, setBalance] = useState(0.01152);
  const [activeTab, setActiveTab] = useState<'home' | 'friends'>('home');
  
  // Mining States
  const [isMining, setIsMining] = useState(false);
  const [miningBalance, setMiningBalance] = useState(0);
  const [miningTime, setMiningTime] = useState(18000); 

  // Faucet States
  const [faucetTime, setFaucetTime] = useState(1800); 
  const [isFaucetReady, setIsFaucetReady] = useState(true);

  // Daily Bonus States
  const [bonusTime, setBonusTime] = useState(0);
  const [isBonusReady, setIsBonusReady] = useState(true);
  
  // Withdrawal States
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawHistory, setWithdrawHistory] = useState<WithdrawalHistory[]>([
    { id: '1', amount: 0.0105, address: 'UQAs...3f9X', status: 'Completed', date: '2024-05-20' },
    { id: '2', amount: 0.0050, address: 'UQAs...3f9X', status: 'Pending', date: '2024-05-22' }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Referral logic
  const [friendsCount, setFriendsCount] = useState(12);
  const [referralEarnings, setReferralEarnings] = useState(0.00012);

  // --- ADMIN & CONFIG STATES ---
  const [showAdmin, setShowAdmin] = useState(false);
  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [adminTab, setAdminTab] = useState<'finance' | 'withdrawals' | 'stats' | 'system'>('finance');
  
  const [config, setConfig] = useState({
    minWithdraw: 0.01,
    dailyReward: 0.0001,
    faucetReward: 0.00001,
    miningReward: 0.00001,
    faucetInterval: 1800,
    miningInterval: 18000,
    referralPercent: 15,
    adsGramId: 'YOUR_BLOCK_ID',
    telegramToken: 'YOUR_BOT_TOKEN_HERE',
    telegramChatId: 'YOUR_CHAT_ID_HERE',
    adminPin: '1234' 
  });

  const [dummyUsers] = useState<User[]>([
    { id: '101', username: 'CryptoKing', balance: 0.55, joined: '2024-01-10', lastActive: '2h ago' },
    { id: '102', username: 'TonMaster', balance: 0.12, joined: '2024-02-15', lastActive: '5m ago' },
    { id: '103', username: 'BeeLover', balance: 0.004, joined: '2024-03-01', lastActive: '1d ago' }
  ]);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = dummyUsers.filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.id.includes(searchTerm)
  );

  const clickData = useRef({ count: 0, last: 0 });

  const triggerAdminEntry = () => {
    const now = Date.now();
    if (now - clickData.current.last < 500) {
      clickData.current.count += 1;
    } else {
      clickData.current.count = 1;
    }
    clickData.current.last = now;
    if (clickData.current.count >= 5) {
      setShowAdmin(true);
      clickData.current.count = 0;
      if (window.navigator && window.navigator.vibrate) window.navigator.vibrate([30, 30, 30]);
    }
  };

  const showAd = useCallback(async (onReward: () => void) => {
    if (window.Adsgram) {
      const AdController = window.Adsgram.init({ blockId: config.adsGramId });
      try {
        const result = await AdController.show();
        if (result.done) onReward();
      } catch (e) { onReward(); }
    } else { onReward(); }
  }, [config.adsGramId]);

  const sendToTelegram = async (msg: string) => {
    try {
      await fetch(`https://api.telegram.org/bot${config.telegramToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: config.telegramChatId, text: msg, parse_mode: 'Markdown' })
      });
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    let interval: any;
    if (isMining && miningTime > 0) {
      interval = setInterval(() => {
        setMiningBalance(prev => prev + (config.miningReward / config.miningInterval));
        setMiningTime(prev => prev - 1);
      }, 1000);
    } else if (isMining && miningTime <= 0) {
      setIsMining(false);
      setMiningTime(config.miningInterval);
    }
    return () => clearInterval(interval);
  }, [isMining, miningTime, config]);

  useEffect(() => {
    let interval: any;
    if (!isFaucetReady && faucetTime > 0) {
      interval = setInterval(() => setFaucetTime(prev => prev - 1), 1000);
    } else if (faucetTime <= 0) {
      setIsFaucetReady(true);
      setFaucetTime(config.faucetInterval);
    }
    return () => clearInterval(interval);
  }, [isFaucetReady, faucetTime, config]);

  useEffect(() => {
    let interval: any;
    if (!isBonusReady && bonusTime > 0) {
      interval = setInterval(() => setBonusTime(prev => prev - 1), 1000);
    } else if (bonusTime <= 0) setIsBonusReady(true);
    return () => clearInterval(interval);
  }, [isBonusReady, bonusTime]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h.toString().padStart(2, '0') + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleWithdrawRequest = async () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount < config.minWithdraw) return alert("Min limit error.");
    if (amount > balance) return alert("Low balance.");
    setIsSubmitting(true);
    await sendToTelegram(`🚀 *Withdrawal Request*\nAmt: ${amount} TON\nAdr: \`${withdrawAddress}\``);
    setTimeout(() => {
      setWithdrawHistory([{ id: Math.random().toString(), amount, address: withdrawAddress, status: 'Pending', date: new Date().toLocaleDateString() }, ...withdrawHistory]);
      setBalance(p => p - amount);
      setIsSubmitting(false);
      setWithdrawAmount('');
      alert("Sent for review.");
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white flex flex-col items-center font-sans select-none overflow-y-auto pb-40 scroll-smooth">
      {/* Header Bar */}
      <div className="w-full flex justify-between items-center p-5 sticky top-0 bg-[#020202]/95 backdrop-blur-xl z-40 border-b border-white/5">
        <button className="text-blue-500 font-bold uppercase text-[10px] tracking-widest active:opacity-50 transition-opacity">Close</button>
        <div className="text-center select-none">
          <h1 className="font-black text-white uppercase leading-none tracking-tighter text-xl">BeeClaimer</h1>
        </div>
        <div 
          onClick={triggerAdminEntry}
          className="w-10 h-10 rounded-full bg-[#111] border border-white/5 flex items-center justify-center text-blue-500 cursor-pointer active:scale-90 transition-transform"
        >
          <i className="fa-solid fa-ellipsis"></i>
        </div>
      </div>

      <div className="w-full flex flex-col items-center px-5 mt-6">
        <h2 className="text-yellow-500 font-black text-2xl tracking-[0.2em] mb-8 italic uppercase animate-pulse">BEECLAIMER</h2>

        {activeTab === 'home' ? (
          <div className="w-full flex flex-col items-center animate-in fade-in duration-500">
            {/* BALANCE CARD */}
            <div className="w-full max-w-md bg-gradient-to-br from-[#0d0d0d] to-[#000] border-2 border-yellow-500/30 rounded-[3.5rem] p-10 mb-8 flex flex-col items-center shadow-[0_25px_50px_rgba(0,0,0,0.7)]">
              <p className="text-yellow-500/60 text-[11px] font-black uppercase mb-4 tracking-[0.3em]">Operational Balance</p>
              <div className="flex items-center gap-5 mb-10">
                <i className="fa-solid fa-vault text-4xl text-blue-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.6)]"></i>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black tabular-nums tracking-tighter">{balance.toFixed(5)}</span>
                  <span className="text-gray-500 font-black text-sm uppercase">TON</span>
                </div>
              </div>
              <button onClick={() => setShowWithdraw(true)} className="w-full bg-yellow-400 text-black font-black py-5 rounded-2xl uppercase text-[12px] tracking-[0.2em] shadow-[0_15px_30px_rgba(234,179,8,0.3)]">Execute Withdrawal</button>
            </div>

            <div className="w-full max-w-md grid grid-cols-2 gap-5 mb-5">
              {/* DAILY BONUS */}
              <div className={`bg-[#0a0a0a] border-2 rounded-[2.5rem] p-6 flex flex-col items-center justify-between text-center transition-all ${isBonusReady ? 'border-purple-500/40 shadow-xl' : 'border-white/5 opacity-50'}`}>
                <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 mb-3">
                    <i className={`fa-solid fa-gift text-2xl ${isBonusReady ? 'text-purple-400' : 'text-gray-700'}`}></i>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-gray-500">Daily Gift</p>
                  <p className="text-[16px] font-black text-purple-400 mt-1">+{config.dailyReward.toFixed(5)}</p>
                </div>
                <div className="my-3 h-6">
                  {!isBonusReady && <span className="text-[13px] font-mono font-black text-white/30 tracking-widest">{formatTime(bonusTime)}</span>}
                </div>
                <button onClick={() => isBonusReady && showAd(() => { setBalance(p => p+config.dailyReward); setIsBonusReady(false); setBonusTime(86400); })} className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase transition-all ${isBonusReady ? 'bg-purple-600 text-white shadow-lg' : 'bg-[#111] text-gray-700'}`}>
                  {isBonusReady ? 'Claim' : 'Locked'}
                </button>
              </div>

              {/* CLOUD MINING */}
              <div className={`bg-[#0a0a0a] border-2 rounded-[2.5rem] p-6 flex flex-col items-center justify-between text-center transition-all ${isMining ? 'border-blue-500 shadow-xl' : 'border-white/5'}`}>
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 mb-3">
                    <i className={`fa-solid fa-microchip text-2xl ${isMining ? 'text-blue-400 animate-pulse' : 'text-gray-700'}`}></i>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-gray-500">Cloud Miner</p>
                  <p className="text-[16px] font-black text-blue-400 mt-1">+{config.miningReward.toFixed(5)}</p>
                </div>
                <div className="my-3 h-6">
                   <span className={`text-[13px] font-mono font-black tracking-widest ${isMining ? 'text-blue-400 animate-pulse' : 'text-white/30'}`}>{isMining ? formatTime(miningTime) : 'OFFLINE'}</span>
                </div>
                <button onClick={() => { if(miningBalance > 0 && !isMining){ setBalance(p=>p+miningBalance); setMiningBalance(0); setMiningTime(config.miningInterval); } else if(!isMining){ showAd(()=>setIsMining(true)); } else setIsMining(false); }} className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase transition-all ${isMining ? 'bg-red-500/20 text-red-500 border border-red-500/40' : 'bg-blue-600 text-white shadow-lg'}`}>
                  {isMining ? 'Stop' : (miningBalance > 0 ? 'Collect' : 'Start')}
                </button>
              </div>
            </div>

            {/* HONEY FAUCET */}
            <div className={`w-full max-w-md bg-[#0a0a0a] border-2 rounded-[3.5rem] p-8 flex items-center justify-between mb-12 relative overflow-hidden ${isFaucetReady ? 'border-yellow-500/30 shadow-2xl' : 'border-white/5 opacity-50'}`}>
              <div className="flex items-center gap-6">
                <div className={`w-16 h-16 rounded-[2rem] flex items-center justify-center shadow-inner border ${isFaucetReady ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 'bg-[#111] text-gray-700 border-white/5'}`}>
                  <i className="fa-solid fa-faucet-drip text-2xl"></i>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Faucet Status</p>
                  <p className="text-xl font-black text-white mt-1">+{config.faucetReward.toFixed(5)} <span className="text-xs text-yellow-500">TON</span></p>
                  <div className="mt-1">
                    {!isFaucetReady ? <span className="text-[12px] font-mono font-black text-emerald-400 tracking-widest">{formatTime(faucetTime)}</span> : <span className="text-[11px] font-black text-emerald-400 animate-pulse">READY</span>}
                  </div>
                </div>
              </div>
              <button onClick={() => isFaucetReady && showAd(() => { setBalance(p => p+config.faucetReward); setIsFaucetReady(false); setFaucetTime(config.faucetInterval); })} className={`px-10 py-5 rounded-3xl font-black uppercase text-[12px] transition-all active:scale-[0.95] ${isFaucetReady ? 'bg-yellow-400 text-black shadow-lg' : 'bg-[#111] text-gray-700'}`}>Claim</button>
            </div>
          </div>
        ) : (
          /* --- NETWORK SECTION --- */
          <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom duration-500 text-center">
             <div className="bg-[#0a0a0a] border-2 border-yellow-500/20 rounded-[3.5rem] p-12 flex flex-col items-center relative overflow-hidden shadow-2xl mb-10">
               <i className="fa-solid fa-users-viewfinder text-7xl text-yellow-500 mb-8 drop-shadow-[0_0_20px_rgba(234,179,8,0.5)]"></i>
               <h3 className="text-2xl font-black uppercase tracking-tighter mb-3 text-white">Network Expansion</h3>
               <p className="text-gray-500 text-[11px] font-bold mb-12 uppercase tracking-[0.25em] leading-relaxed">Invite nodes to the network and secure <span className="text-yellow-500 font-black">{config.referralPercent}%</span> lifetime commission.</p>
               <div className="grid grid-cols-2 gap-6 w-full mb-12">
                 <div className="bg-[#0c0c0c] p-8 rounded-[3rem] border border-white/5 flex flex-col items-center shadow-inner">
                   <p className="text-5xl font-black text-white tabular-nums">{friendsCount}</p>
                   <p className="text-[10px] text-gray-600 font-black uppercase mt-3 tracking-widest">Peers</p>
                 </div>
                 <div className="bg-[#0c0c0c] p-8 rounded-[3rem] border border-white/5 flex flex-col items-center shadow-inner">
                   <p className="text-4xl font-black text-emerald-400 tabular-nums">{referralEarnings.toFixed(5)}</p>
                   <p className="text-[10px] text-gray-600 font-black uppercase mt-3 tracking-widest">Yield</p>
                 </div>
               </div>
               <button onClick={() => { navigator.clipboard.writeText(`t.me/BeeClaimerBot?start=user${Math.random().toString(36).substring(7)}`); alert("Protocol Link Copied!"); }} className="w-full bg-yellow-400 text-black font-black py-6 rounded-3xl uppercase tracking-[0.4em] text-[12px] active:scale-95 shadow-2xl transition-all">Generate Invite Hash</button>
             </div>
          </div>
        )}
      </div>

      {/* WITHDRAWAL OVERLAY - FIXED WITH HISTORY */}
      {showWithdraw && (
        <div className="fixed inset-0 z-[100] bg-black/98 backdrop-blur-3xl p-6 flex flex-col items-center overflow-y-auto pt-10 pb-20 animate-in fade-in duration-300">
          <div className="w-full max-w-md flex flex-col items-center">
            {/* Header Withdrawal */}
            <div className="w-full flex justify-between items-center mb-8 px-4">
               <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Execute: Payout</h3>
               <button onClick={() => setShowWithdraw(false)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white"><i className="fa-solid fa-xmark"></i></button>
            </div>

            {/* Input Form */}
            <div className="w-full bg-[#0a0a0a] border-2 border-yellow-500/40 rounded-[3rem] p-8 shadow-[0_40px_80px_rgba(0,0,0,1)] mb-10">
              <div className="space-y-6 mb-8">
                <div className="bg-[#111] p-5 rounded-[1.5rem] border border-white/5">
                  <label className="text-[10px] font-black text-gray-500 uppercase mb-3 block tracking-widest">Wallet Address</label>
                  <input type="text" value={withdrawAddress} onChange={e=>setWithdrawAddress(e.target.value)} placeholder="UQAs... (TON Network)" className="bg-transparent w-full text-sm font-black outline-none text-white placeholder-gray-800" />
                </div>
                <div className="bg-[#111] p-5 rounded-[1.5rem] border border-white/5 relative">
                  <label className="text-[10px] font-black text-gray-500 uppercase mb-3 block tracking-widest">Transfer Amount</label>
                  <input type="number" value={withdrawAmount} onChange={e=>setWithdrawAmount(e.target.value)} placeholder="0.00000" className="bg-transparent w-full text-sm font-black outline-none text-white placeholder-gray-800" />
                  <button onClick={() => setWithdrawAmount(balance.toFixed(5))} className="absolute right-5 bottom-4 bg-yellow-500 text-black text-[10px] font-black px-4 py-1.5 rounded-xl active:scale-90">MAX</button>
                </div>
              </div>
              <button onClick={handleWithdrawRequest} disabled={isSubmitting} className={`w-full bg-yellow-400 text-black font-black py-6 rounded-2xl uppercase tracking-[0.2em] text-[12px] active:scale-95 transition-all ${isSubmitting ? 'opacity-30' : 'shadow-2xl shadow-yellow-500/10'}`}>
                {isSubmitting ? 'ENCRYPTING...' : 'CONFIRM TRANSACTION'}
              </button>
            </div>

            {/* TRANSACTION LOG - RE-ADDED */}
            <div className="w-full bg-[#0a0a0a] border border-white/5 rounded-[3rem] p-8 shadow-inner overflow-hidden">
               <div className="flex items-center gap-3 mb-8 border-b border-white/5 pb-4">
                  <i className="fa-solid fa-clock-rotate-left text-yellow-500"></i>
                  <p className="text-[12px] font-black text-gray-400 uppercase tracking-[0.2em]">Activity Log</p>
               </div>
               
               <div className="space-y-6">
                  {withdrawHistory.length === 0 ? (
                    <div className="py-10 text-center opacity-30">
                       <i className="fa-solid fa-ghost text-4xl mb-4"></i>
                       <p className="text-[10px] font-black uppercase tracking-widest">Zero Operations</p>
                    </div>
                  ) : withdrawHistory.map(h => (
                    <div key={h.id} className="flex justify-between items-center border-b border-white/5 pb-5 last:border-0 last:pb-0 animate-in fade-in slide-in-from-left duration-300">
                      <div>
                        <div className="flex items-center gap-2">
                           <p className="text-base font-black text-white">{h.amount.toFixed(4)}</p>
                           <span className="text-[9px] text-gray-600 font-bold uppercase mt-1">TON</span>
                        </div>
                        <p className="text-[9px] text-gray-700 font-mono truncate w-32 mt-1">{h.address}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-xl border ${
                          h.status === 'Completed' ? 'bg-emerald-500/5 text-emerald-500 border-emerald-500/10' :
                          h.status === 'Rejected' ? 'bg-red-500/5 text-red-500 border-red-500/10' :
                          'bg-yellow-500/5 text-yellow-500 border-yellow-500/10'
                        }`}>
                          {h.status}
                        </span>
                        <p className="text-[8px] text-gray-800 mt-2 font-black">{h.date}</p>
                      </div>
                    </div>
                  ))}
               </div>
            </div>
            
            <button onClick={() => setShowWithdraw(false)} className="mt-12 text-gray-800 font-black uppercase text-[11px] tracking-widest border-b border-gray-900 pb-1 hover:text-white transition-colors">Close Terminal</button>
          </div>
        </div>
      )}

      {/* SYSTEM ADMIN TERMINAL */}
      {showAdmin && (
        <div className="fixed inset-0 z-[200] bg-[#000] flex flex-col overflow-y-auto animate-in slide-in-from-bottom duration-500">
          {!isAdminAuth ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12">
              <div className="w-28 h-28 bg-blue-500/10 rounded-full flex items-center justify-center mb-12 border border-blue-500/20 shadow-[0_0_50px_rgba(59,130,246,0.1)]">
                <i className="fa-solid fa-user-shield text-5xl text-blue-500"></i>
              </div>
              <h2 className="text-blue-500 font-black mb-12 tracking-[0.5em] uppercase text-xl">Admin Auth</h2>
              <input type="password" value={adminPinInput} onChange={e=>setAdminPinInput(e.target.value)} placeholder="ROOT KEY" className="bg-[#050505] text-center text-4xl font-black w-64 p-10 rounded-[3rem] border border-blue-500/40 outline-none text-white tracking-[0.5em] mb-12" />
              <button onClick={()=>{ if(adminPinInput===config.adminPin) setIsAdminAuth(true); else { alert("DENIED"); setAdminPinInput(''); } }} className="bg-blue-600 text-white px-20 py-7 rounded-[2.5rem] font-black uppercase tracking-[0.4em] active:scale-95 transition-all">Grant Access</button>
              <button onClick={()=>setShowAdmin(false)} className="mt-12 text-gray-800 font-black text-[12px] uppercase">Abort</button>
            </div>
          ) : (
            <div className="max-w-md w-full mx-auto p-7 pb-32">
               <div className="flex justify-between items-center mb-12 bg-[#0a0a0a] p-6 rounded-[2rem] border border-white/10 shadow-2xl">
                 <div className="flex items-center gap-4">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]"></div>
                    <h2 className="text-blue-500 font-black uppercase text-[12px] tracking-[0.4em]">Node-Root:~$</h2>
                 </div>
                 <button onClick={()=>{setShowAdmin(false); setIsAdminAuth(false); setAdminPinInput('');}} className="text-red-500 uppercase text-[11px] font-black bg-red-500/10 px-5 py-2.5 rounded-2xl border border-red-500/10">Logout</button>
               </div>
               
               <div className="flex gap-4 overflow-x-auto mb-12 scrollbar-hide py-3">
                 {['finance','withdrawals','stats','system'].map(t=>(
                   <button key={t} onClick={()=>setAdminTab(t as any)} className={`px-8 py-5 rounded-3xl text-[11px] font-black uppercase tracking-[0.15em] transition-all shrink-0 ${adminTab===t?'bg-blue-600 text-white shadow-xl':'bg-[#0a0a0a] text-gray-600 border border-white/5'}`}>{t}</button>
                 ))}
               </div>

               <div className="animate-in fade-in duration-300">
                 {adminTab==='finance' && (
                   <div className="bg-[#0a0a0a] p-10 rounded-[3.5rem] border border-white/10 space-y-10 shadow-2xl">
                     <p className="text-[12px] font-black text-gray-600 uppercase tracking-[0.4em] mb-6 border-b border-white/5 pb-5">Core Variables</p>
                     {Object.entries(config).filter(([k])=>['minWithdraw','dailyReward','faucetReward','miningReward','referralPercent'].includes(k)).map(([k,v])=>(
                       <div key={k} className="flex justify-between items-center bg-[#050505] p-6 rounded-2xl border border-white/5">
                         <label className="text-[11px] font-black uppercase text-gray-500">{k.replace(/([A-Z])/g, ' $1')}</label>
                         <input type="number" step="0.0001" value={v} onChange={e=>setConfig({...config, [k]:parseFloat(e.target.value)})} className="bg-transparent p-2 text-blue-400 w-32 text-[14px] font-black text-right outline-none"/>
                       </div>
                     ))}
                   </div>
                 )}
                 {adminTab==='withdrawals' && (
                   <div className="space-y-6">
                     <p className="text-[12px] font-black text-gray-600 uppercase tracking-[0.4em] mb-6 px-4">Pipeline</p>
                     {withdrawHistory.filter(h=>h.status==='Pending').length === 0 && <div className="bg-[#0a0a0a] border border-white/5 rounded-[3rem] py-20 text-center text-gray-700 font-black text-sm uppercase">Empty</div>}
                     {withdrawHistory.filter(h=>h.status==='Pending').map(h=>(
                       <div key={h.id} className="bg-[#0a0a0a] p-8 rounded-[3rem] border border-white/10 shadow-2xl">
                          <div className="flex justify-between items-start mb-8">
                            <div><p className="text-2xl font-black text-white">{h.amount} TON</p><p className="text-[10px] text-gray-500 font-mono break-all mt-3">{h.address}</p></div>
                            <span className="text-[10px] font-black text-yellow-500 bg-yellow-500/10 px-4 py-2 rounded-xl uppercase">Pending</span>
                          </div>
                          <div className="flex gap-4">
                            <button onClick={()=>setWithdrawHistory(withdrawHistory.map(wh=>wh.id===h.id?{...wh,status:'Completed'}:wh))} className="flex-1 bg-emerald-600 py-5 rounded-[1.5rem] text-[11px] font-black text-white uppercase active:scale-95 shadow-lg">Release</button>
                            <button onClick={()=>setWithdrawHistory(withdrawHistory.map(wh=>wh.id===h.id?{...wh,status:'Rejected'}:wh))} className="flex-1 bg-red-600/10 py-5 rounded-[1.5rem] text-[11px] font-black text-red-500 uppercase border border-red-500/10">Deny</button>
                          </div>
                       </div>
                     ))}
                   </div>
                 )}
                 {adminTab==='stats' && (
                   <div className="space-y-10">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="bg-[#0a0a0a] p-10 rounded-[3rem] border border-white/10 shadow-xl"><p className="text-5xl font-black text-white">1,240</p><p className="text-[11px] text-gray-600 font-black uppercase mt-4">Nodes</p></div>
                        <div className="bg-[#0a0a0a] p-10 rounded-[3rem] border border-white/10 shadow-xl"><p className="text-5xl font-black text-blue-400">482</p><p className="text-[11px] text-gray-600 font-black uppercase mt-4">Active</p></div>
                      </div>
                      <div className="bg-[#0a0a0a] p-10 rounded-[3rem] border border-white/10">
                        <input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="Search Hub..." className="w-full bg-[#050505] p-6 rounded-[1.5rem] text-[12px] font-black outline-none mb-10 border border-white/5" />
                        <div className="space-y-5 max-h-[400px] overflow-y-auto custom-scroll pr-2">
                          {filteredUsers.map(u=>(
                            <div key={u.id} className="bg-black/40 p-6 rounded-3xl flex justify-between items-center border border-white/5">
                               <div><p className="text-[14px] font-black text-white uppercase">{u.username}</p><p className="text-[10px] text-gray-600 font-bold mt-1 uppercase">{u.balance} TON</p></div>
                               <i className="fa-solid fa-bolt text-blue-500"></i>
                            </div>
                          ))}
                        </div>
                      </div>
                   </div>
                 )}
                 {adminTab==='system' && (
                   <div className="bg-[#0a0a0a] p-10 rounded-[4rem] border border-white/10 space-y-10">
                     <p className="text-[12px] font-black text-gray-600 uppercase tracking-[0.4em] mb-6 border-b border-white/5 pb-5">Operational Keys</p>
                     <div className="space-y-6">
                       <div className="space-y-3"><label className="text-[10px] uppercase text-gray-600 font-black ml-4">Ad Block ID</label><input value={config.adsGramId} onChange={e=>setConfig({...config, adsGramId:e.target.value})} className="w-full bg-[#050505] p-6 rounded-2xl text-[12px] font-mono text-blue-300 border border-white/5" /></div>
                       <div className="space-y-3"><label className="text-[10px] uppercase text-gray-600 font-black ml-4">Telegram Bot Token</label><input value={config.telegramToken} onChange={e=>setConfig({...config, telegramToken:e.target.value})} className="w-full bg-[#050505] p-6 rounded-2xl text-[12px] font-mono text-blue-300 border border-white/5" /></div>
                       <div className="space-y-3"><label className="text-[10px] uppercase text-gray-600 font-black ml-4">Chat ID</label><input value={config.telegramChatId} onChange={e=>setConfig({...config, telegramChatId:e.target.value})} className="w-full bg-[#050505] p-6 rounded-2xl text-[12px] font-mono text-blue-300 border border-white/5" /></div>
                       <div className="space-y-3"><label className="text-[10px] uppercase text-gray-600 font-black ml-4">Root PIN</label><input value={config.adminPin} onChange={e=>setConfig({...config, adminPin:e.target.value})} className="w-full bg-[#050505] p-6 rounded-2xl text-[12px] font-mono text-blue-300 border border-white/5" /></div>
                     </div>
                   </div>
                 )}
               </div>
            </div>
          )}
        </div>
      )}

      {/* FOOTER NAVIGATION */}
      <div className="fixed bottom-6 w-[94%] max-w-md bg-[#0a0a0a]/95 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-4 flex justify-around shadow-[0_30px_70px_rgba(0,0,0,1)] z-50 left-1/2 -translate-x-1/2">
        <button onClick={()=>setActiveTab('home')} className={`flex-1 py-5 rounded-[2.5rem] flex flex-col items-center gap-2 transition-all ${activeTab==='home'?'text-yellow-500 bg-yellow-500/5 shadow-inner':'text-gray-600'}`}>
          <i className={`fa-solid fa-house-user ${activeTab==='home'?'text-xl':'text-lg'}`}></i>
          <span className="text-[10px] font-black uppercase">Home</span>
        </button>
        <button onClick={()=>setActiveTab('friends')} className={`flex-1 py-5 rounded-[2.5rem] flex flex-col items-center gap-2 transition-all ${activeTab==='friends'?'text-yellow-500 bg-yellow-500/5 shadow-inner':'text-gray-600'}`}>
          <i className={`fa-solid fa-network-wired ${activeTab==='friends'?'text-xl':'text-lg'}`}></i>
          <span className="text-[10px] font-black uppercase">Network</span>
        </button>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeIn 0.5s cubic-bezier(0.1, 0.9, 0.2, 1) forwards; }
        ::-webkit-scrollbar { display: none; }
        .custom-scroll::-webkit-scrollbar { display: block; width: 4px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>
    </div>
  );
};

export default App;
