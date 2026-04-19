// ============================================================
// VelAccounts — All Models / Interfaces
// ============================================================

// ── Generic API response wrapper ──────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  count?: number;
}

// ── Auth ──────────────────────────────────────────────────────
export interface LoginRequest {
  Client_Code: string;
  User_Name: string;
  Password: string;
}

export interface AppUser {
  UserSno: number;
  User_Name: string;
  Email?: string;
  Role: 'SUPERADMIN' | 'ADMIN' | 'USER';
  ClientSno: number;
  MustChangePwd: boolean;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface LoginResponse extends TokenResponse {
  user: AppUser;
  accounts: Account[];
}

// ── Accounts (book of accounts) ───────────────────────────────
export interface Account {
  AccSno: number;
  Acc_Code: string;
  Acc_Name: string;
  Remarks?: string;
  IsActive: boolean;
  CurrentRowVer: string;
}

// ── Ledger Groups ─────────────────────────────────────────────
export interface LedgerGroup {
  GrpSno: number;
  Grp_Code: string;
  Grp_Name: string;
  Remarks?: string;
  IsActive: boolean;
  CurrentRowVer: string;
}

// ── Ledgers ───────────────────────────────────────────────────
export interface Ledger {
  LedSno: number;
  Led_Code: string;
  Led_Name: string;
  GrpSno: number;
  Grp_Name?: string;
  Remarks?: string;
  IsActive: boolean;
  CurrentRowVer: string;
}

// ── Voucher Types ─────────────────────────────────────────────
export type CashType = 'IN' | 'OUT';

export interface VoucherType {
  VouTypeSno: number;
  VTyp_Code: string;
  VTyp_Name: string;
  Cash_Type: CashType;
  IsActive: boolean;
  CurrentRowVer: string;
}

// ── Voucher Series ────────────────────────────────────────────
export type NumberingMethod = 'AUTO' | 'SEMI' | 'MANUAL';

export interface VoucherSeries {
  SeriesSno: number;
  Series_Name: string;
  VouTypeSno: number;
  VTyp_Code?: string;
  VTyp_Name?: string;
  Cash_Type?: CashType;
  Prefix: string;
  Width: number;
  Current_No: number;
  Numbering_Method: NumberingMethod;
  IsActive: boolean;
  CurrentRowVer: string;
}

export interface NextVoucherNo {
  PreviewVouNo: string;
  Current_No: number;
  Prefix: string;
  Width: number;
}

// ── Vouchers ──────────────────────────────────────────────────
export interface Voucher {
  VouSno: number;
  SeriesSno: number;
  Series_Name?: string;
  VoucherType?: string;
  Cash_Type?: CashType;
  LedSno: number;
  Led_Name?: string;
  Vou_No: string;
  Vou_Date: string;
  Amount: number;
  Narration: string;
  CreateDate?: string;
  CurrentRowVer: string;
}

export interface VoucherSaveResult {
  RetSno: number;
  Vou_No: string;
  Status: string;
  Message: string;
  CurrentRowVer: string;
}

// ── Ledger Statement ──────────────────────────────────────────
export interface LedgerStatementLine {
  VouSno: number;
  Vou_No: string;
  Vou_Date: string;
  VoucherType: string;
  Series_Name: string;
  Cash_Type: CashType;
  Narration: string;
  Debit: number;
  Credit: number;
  RunningBalance: number;
  OpeningBalance: number;
}

export interface LedgerStatementSummary {
  OpeningBalance: number;
  ClosingBalance: number;
  FromDate: string;
  ToDate: string;
}

export interface LedgerStatement {
  data: LedgerStatementLine[];
  summary: LedgerStatementSummary;
}

// ── Users (admin) ─────────────────────────────────────────────
export interface ManagedUser {
  UserSno: number;
  User_Name: string;
  Email?: string;
  Role: 'SUPERADMIN' | 'ADMIN' | 'USER';
  IsActive: boolean;
  MustChangePwd: boolean;
  FailedAttempts: number;
  LastLoginDate?: string;
  CurrentRowVer: string;
}

