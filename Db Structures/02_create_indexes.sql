-- ============================================================
-- VelAccounts  |  02_create_indexes.sql
-- Run this file SECOND (after tables are created).
-- Covers: FK columns, login lookup, date-range queries,
--         ledger statement, day book, token validation.
-- ============================================================

USE VelAccounts;
GO

-- ── Clients ──────────────────────────────────────────────────
-- Covering index for login Client_Code lookup
CREATE UNIQUE NONCLUSTERED INDEX IX_Clients_Code
    ON dbo.Clients (Client_Code)
    INCLUDE (ClientSno, Client_Name, IsActive)
    WHERE IsActive = 1;
GO

-- ── Accounts ─────────────────────────────────────────────────
CREATE NONCLUSTERED INDEX IX_Accounts_Client
    ON dbo.Accounts (ClientSno)
    INCLUDE (AccSno, Acc_Code, Acc_Name, IsActive);
GO

-- ── Users ─────────────────────────────────────────────────────
-- Fast login by username + client
CREATE NONCLUSTERED INDEX IX_Users_Login
    ON dbo.Users (User_Name, ClientSno)
    INCLUDE (UserSno, PasswordHash, IsActive, Role, FailedAttempts, LockoutUntil, MustChangePwd, Email)
    WHERE IsActive = 1;
GO

CREATE NONCLUSTERED INDEX IX_Users_ClientSno
    ON dbo.Users (ClientSno);
GO

-- ── RefreshTokens ─────────────────────────────────────────────
-- Token validation (active tokens only)
CREATE UNIQUE NONCLUSTERED INDEX IX_RefreshTokens_Token
    ON dbo.RefreshTokens (Token)
    INCLUDE (UserSno, ClientSno, ExpiresAt, IsRevoked)
    WHERE IsRevoked = 0;
GO

CREATE NONCLUSTERED INDEX IX_RefreshTokens_UserSno
    ON dbo.RefreshTokens (UserSno)
    INCLUDE (IsRevoked, ExpiresAt);
GO

-- ── Login History ─────────────────────────────────────────────
CREATE NONCLUSTERED INDEX IX_LoginHistory_UserSno_Date
    ON dbo.Login_History (UserSno, LogDate DESC)
    INCLUDE (IsSuccess, FailReason);
GO

CREATE NONCLUSTERED INDEX IX_LoginHistory_ClientSno
    ON dbo.Login_History (ClientSno, LogDate DESC);
GO

-- ── Ledger Groups ─────────────────────────────────────────────
CREATE NONCLUSTERED INDEX IX_LedgerGroups_Client_Acc
    ON dbo.Ledger_Groups (ClientSno, AccSno)
    INCLUDE (GrpSno, Grp_Code, Grp_Name, IsActive)
    WHERE IsActive = 1;
GO

CREATE NONCLUSTERED INDEX IX_LedgerGroups_AccSno
    ON dbo.Ledger_Groups (AccSno);
GO

-- ── Ledgers ───────────────────────────────────────────────────
CREATE NONCLUSTERED INDEX IX_Ledgers_Client_Acc
    ON dbo.Ledgers (ClientSno, AccSno)
    INCLUDE (LedSno, Led_Code, Led_Name, GrpSno, IsActive)
    WHERE IsActive = 1;
GO

CREATE NONCLUSTERED INDEX IX_Ledgers_GrpSno
    ON dbo.Ledgers (GrpSno)
    INCLUDE (LedSno, Led_Code, Led_Name);
GO

CREATE NONCLUSTERED INDEX IX_Ledgers_AccSno
    ON dbo.Ledgers (AccSno);
GO

-- ── Voucher Types ─────────────────────────────────────────────
CREATE NONCLUSTERED INDEX IX_VoucherTypes_Client_Acc
    ON dbo.Voucher_Types (ClientSno, AccSno)
    INCLUDE (VouTypeSno, VTyp_Code, VTyp_Name, Cash_Type, IsActive)
    WHERE IsActive = 1;
GO

-- ── Voucher Series ────────────────────────────────────────────
CREATE NONCLUSTERED INDEX IX_VoucherSeries_Client_Acc
    ON dbo.Voucher_Series (ClientSno, AccSno)
    INCLUDE (SeriesSno, Series_Name, VouTypeSno, Numbering_Method, Prefix, Width, Current_No, IsActive)
    WHERE IsActive = 1;
GO

CREATE NONCLUSTERED INDEX IX_VoucherSeries_VouTypeSno
    ON dbo.Voucher_Series (VouTypeSno);
GO

-- ── Vouchers ──────────────────────────────────────────────────
-- Day Book query (client + account + date descending)
CREATE NONCLUSTERED INDEX IX_Vouchers_Client_Acc_Date
    ON dbo.Vouchers (ClientSno, AccSno, Vou_Date DESC)
    INCLUDE (VouSno, SeriesSno, LedSno, Vou_No, Amount, Narration, IsActive);
GO

-- Ledger Statement (ledger + date range)
CREATE NONCLUSTERED INDEX IX_Vouchers_Ledger_Date
    ON dbo.Vouchers (ClientSno, AccSno, LedSno, Vou_Date)
    INCLUDE (VouSno, SeriesSno, Vou_No, Amount, Narration, IsActive);
GO

-- FK index on SeriesSno
CREATE NONCLUSTERED INDEX IX_Vouchers_SeriesSno
    ON dbo.Vouchers (SeriesSno, Vou_Date DESC);
GO

-- FK index on UserSno
CREATE NONCLUSTERED INDEX IX_Vouchers_UserSno
    ON dbo.Vouchers (UserSno);
GO

PRINT '02_create_indexes.sql  >>>  All indexes created successfully.';
GO
