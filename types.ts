
export interface UserStats {
  totalUsers: number;
  activeToday: number;
  totalDistributed: number;
  pendingWithdrawals: number;
}

export interface FaucetConfig {
  coinName: string;
  claimAmount: number;
  claimIntervalMinutes: number;
  referralPercent: number;
  minWithdraw: number;
}

export interface RecentActivity {
  id: string;
  user: string;
  amount: number;
  type: 'claim' | 'withdrawal' | 'referral';
  timestamp: string;
}
