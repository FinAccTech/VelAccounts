-- ============================================================
-- VelAccounts  |  01_create_tables.sql
-- Run this file FIRST on a fresh database.
-- No ALTER TABLE used anywhere — all columns are defined here.
-- ============================================================

USE VelAccounts;   -- change to your target database name
GO

-- ============================================================
-- CLIENTS  (top of the tenant hierarchy)
-- Client_Code is what users type at login — keeps internal IDs hidden.
-- ============================================================
CREATE TABLE dbo.Clients (
    ClientSno    INT           IDENTITY(1,1) NOT NULL,
    Client_Code  VARCHAR(20)                NOT NULL,
    Client_Name  VARCHAR(50)   COLLATE Latin1_General_100_CI_AS_SC_UTF8 NOT NULL,
    Remarks      VARCHAR(100)  COLLATE Latin1_General_100_CI_AS_SC_UTF8 NOT NULL CONSTRAINT DF_Clients_Remarks  DEFAULT (''),
    CreateDate   DATETIME2(0)               NULL,
    IsActive     BIT                        NOT NULL CONSTRAINT DF_Clients_IsActive DEFAULT (1),
    Row_Ver      ROWVERSION,
    SysStart     DATETIME2     GENERATED ALWAYS AS ROW START HIDDEN NOT NULL,
    SysEnd       DATETIME2     GENERATED ALWAYS AS ROW END   HIDDEN NOT NULL,
    PERIOD FOR SYSTEM_TIME (SysStart, SysEnd),
    CONSTRAINT PK_Clients      PRIMARY KEY CLUSTERED (ClientSno),
    CONSTRAINT UQ_Clients_Code UNIQUE (Client_Code)
)
WITH (SYSTEM_VERSIONING = ON (HISTORY_TABLE = dbo.Clients_Audit), DATA_COMPRESSION = PAGE);
GO

-- ============================================================
-- ACCOUNTS  (book of accounts — child of Client)
-- One client can have multiple books (e.g. different fiscal years).
-- ============================================================
CREATE TABLE dbo.Accounts (
    AccSno      INT           IDENTITY(1,1) NOT NULL,
    ClientSno   INT                         NOT NULL,
    Acc_Code    VARCHAR(20)                 NOT NULL,
    Acc_Name    VARCHAR(100)  COLLATE Latin1_General_100_CI_AS_SC_UTF8 NOT NULL,
    Remarks     VARCHAR(100)  COLLATE Latin1_General_100_CI_AS_SC_UTF8 NOT NULL CONSTRAINT DF_Accounts_Remarks DEFAULT (''),
    CreateDate  DATETIME2(0)               NULL,
    IsActive    BIT                        NOT NULL CONSTRAINT DF_Accounts_IsActive DEFAULT (1),
    Row_Ver     ROWVERSION,
    SysStart    DATETIME2     GENERATED ALWAYS AS ROW START HIDDEN NOT NULL,
    SysEnd      DATETIME2     GENERATED ALWAYS AS ROW END   HIDDEN NOT NULL,
    PERIOD FOR SYSTEM_TIME (SysStart, SysEnd),
    CONSTRAINT PK_Accounts        PRIMARY KEY CLUSTERED (AccSno),
    CONSTRAINT UQ_Accounts_Code   UNIQUE (ClientSno, Acc_Code),
    CONSTRAINT FK_Accounts_Client FOREIGN KEY (ClientSno) REFERENCES dbo.Clients (ClientSno)
)
WITH (SYSTEM_VERSIONING = ON (HISTORY_TABLE = dbo.Accounts_Audit), DATA_COMPRESSION = PAGE);
GO

-- ============================================================
-- USERS
-- ClientSno = NULL  →  SuperAdmin (crosses all clients).
-- Role:  SUPERADMIN | ADMIN | USER
-- Passwords are NEVER stored plain-text.
-- Node.js bcrypt-hashes before every SP call.
-- ============================================================
CREATE TABLE dbo.Users (
    UserSno        INT           IDENTITY(1,1) NOT NULL,
    ClientSno      INT                         NULL,          -- NULL = SuperAdmin
    User_Name      VARCHAR(50)                 NOT NULL,
    Email          VARCHAR(100)                NULL,
    PasswordHash   VARCHAR(256)                NOT NULL,
    FailedAttempts TINYINT                     NOT NULL CONSTRAINT DF_Users_FailedAttempts DEFAULT (0),
    LockoutUntil   DATETIME2(0)                NULL,
    LastLoginDate  DATETIME2(0)                NULL,
    MustChangePwd  BIT                         NOT NULL CONSTRAINT DF_Users_MustChangePwd  DEFAULT (0),
    Role           VARCHAR(20)                 NOT NULL CONSTRAINT DF_Users_Role            DEFAULT ('USER'),
    CreateDate     DATETIME2(0)                NULL,
    IsActive       BIT                         NOT NULL CONSTRAINT DF_Users_IsActive        DEFAULT (1),
    Row_Ver        ROWVERSION,
    SysStart       DATETIME2     GENERATED ALWAYS AS ROW START HIDDEN NOT NULL,
    SysEnd         DATETIME2     GENERATED ALWAYS AS ROW END   HIDDEN NOT NULL,
    PERIOD FOR SYSTEM_TIME (SysStart, SysEnd),
    CONSTRAINT PK_Users              PRIMARY KEY CLUSTERED (UserSno),
    CONSTRAINT UQ_Users_Name_Client  UNIQUE (User_Name, ClientSno),
    CONSTRAINT CK_Users_Role         CHECK (Role IN ('SUPERADMIN','ADMIN','USER')),
    CONSTRAINT FK_Users_Client       FOREIGN KEY (ClientSno) REFERENCES dbo.Clients (ClientSno)
)
WITH (SYSTEM_VERSIONING = ON (HISTORY_TABLE = dbo.Users_Audit), DATA_COMPRESSION = PAGE);
GO

-- ============================================================
-- REFRESH TOKENS  (one row per active session)
-- ============================================================
CREATE TABLE dbo.RefreshTokens (
    TokenSno   BIGINT        IDENTITY(1,1) NOT NULL,
    UserSno    INT                         NOT NULL,
    ClientSno  INT                         NULL,
    Token      VARCHAR(512)                NOT NULL,
    ExpiresAt  DATETIME2(0)                NOT NULL,
    IsRevoked  BIT                         NOT NULL CONSTRAINT DF_RefreshTokens_IsRevoked DEFAULT (0),
    IPAddress  VARCHAR(45)                 NULL,
    UserAgent  VARCHAR(500)                NULL,
    CreatedAt  DATETIME2(0)                NOT NULL CONSTRAINT DF_RefreshTokens_CreatedAt DEFAULT (SYSDATETIME()),
    CONSTRAINT PK_RefreshTokens      PRIMARY KEY CLUSTERED (TokenSno),
    CONSTRAINT FK_RefreshTokens_User FOREIGN KEY (UserSno) REFERENCES dbo.Users (UserSno)
);
GO

-- ============================================================
-- LOGIN HISTORY  (immutable audit — never UPDATE or DELETE)
-- ============================================================
CREATE TABLE dbo.Login_History (
    LogSno     BIGINT        IDENTITY(1,1) NOT NULL,
    UserSno    INT                         NULL,          -- NULL when user not found
    User_Name  VARCHAR(50)                 NULL,
    ClientSno  INT                         NULL,
    AccSno     INT                         NULL,
    IPAddress  VARCHAR(45)                 NULL,
    UserAgent  VARCHAR(500)                NULL,
    IsSuccess  BIT                         NOT NULL,
    FailReason VARCHAR(200)                NULL,
    LogDate    DATETIME2(0)                NOT NULL CONSTRAINT DF_LoginHistory_LogDate DEFAULT (SYSDATETIME()),
    CONSTRAINT PK_Login_History PRIMARY KEY CLUSTERED (LogSno)
);
GO

-- ============================================================
-- LEDGER GROUPS  (chart-of-accounts grouping)
-- Scoped to ClientSno + AccSno for full multi-tenancy.
-- ============================================================
CREATE TABLE dbo.Ledger_Groups (
    GrpSno     INT           IDENTITY(1,1) NOT NULL,
    ClientSno  INT                         NOT NULL,
    AccSno     INT                         NOT NULL,
    Grp_Code   VARCHAR(20)                 NOT NULL,
    Grp_Name   VARCHAR(100)  COLLATE Latin1_General_100_CI_AS_SC_UTF8 NOT NULL,
    Remarks    VARCHAR(100)  COLLATE Latin1_General_100_CI_AS_SC_UTF8 NOT NULL CONSTRAINT DF_LedgerGroups_Remarks DEFAULT (''),
    CreateDate DATETIME2(0)               NULL,
    IsActive   BIT                        NOT NULL CONSTRAINT DF_LedgerGroups_IsActive DEFAULT (1),
    Row_Ver    ROWVERSION,
    SysStart   DATETIME2     GENERATED ALWAYS AS ROW START HIDDEN NOT NULL,
    SysEnd     DATETIME2     GENERATED ALWAYS AS ROW END   HIDDEN NOT NULL,
    PERIOD FOR SYSTEM_TIME (SysStart, SysEnd),
    CONSTRAINT PK_LedgerGroups       PRIMARY KEY CLUSTERED (GrpSno),
    CONSTRAINT UQ_LedgerGroups_Code  UNIQUE (ClientSno, AccSno, Grp_Code),
    CONSTRAINT FK_LedgerGroups_Acc   FOREIGN KEY (AccSno) REFERENCES dbo.Accounts (AccSno)
)
WITH (SYSTEM_VERSIONING = ON (HISTORY_TABLE = dbo.Ledger_Groups_Audit), DATA_COMPRESSION = PAGE);
GO

-- ============================================================
-- LEDGERS  (individual ledger accounts)
-- ============================================================
CREATE TABLE dbo.Ledgers (
    LedSno     INT           IDENTITY(1,1) NOT NULL,
    ClientSno  INT                         NOT NULL,
    AccSno     INT                         NOT NULL,
    GrpSno     INT                         NOT NULL,
    Led_Code   VARCHAR(20)                 NOT NULL,
    Led_Name   VARCHAR(100)  COLLATE Latin1_General_100_CI_AS_SC_UTF8 NOT NULL,
    Remarks    VARCHAR(100)  COLLATE Latin1_General_100_CI_AS_SC_UTF8 NOT NULL CONSTRAINT DF_Ledgers_Remarks DEFAULT (''),
    CreateDate DATETIME2(0)               NULL,
    IsActive   BIT                        NOT NULL CONSTRAINT DF_Ledgers_IsActive DEFAULT (1),
    Row_Ver    ROWVERSION,
    SysStart   DATETIME2     GENERATED ALWAYS AS ROW START HIDDEN NOT NULL,
    SysEnd     DATETIME2     GENERATED ALWAYS AS ROW END   HIDDEN NOT NULL,
    PERIOD FOR SYSTEM_TIME (SysStart, SysEnd),
    CONSTRAINT PK_Ledgers        PRIMARY KEY CLUSTERED (LedSno),
    CONSTRAINT UQ_Ledgers_Code   UNIQUE (ClientSno, AccSno, Led_Code),
    CONSTRAINT FK_Ledgers_Group  FOREIGN KEY (GrpSno) REFERENCES dbo.Ledger_Groups (GrpSno),
    CONSTRAINT FK_Ledgers_Acc    FOREIGN KEY (AccSno) REFERENCES dbo.Accounts (AccSno)
)
WITH (SYSTEM_VERSIONING = ON (HISTORY_TABLE = dbo.Ledgers_Audit), DATA_COMPRESSION = PAGE);
GO

-- ============================================================
-- VOUCHER TYPES
-- Cash_Type  'IN'  = money received  → appears in CREDIT column
--            'OUT' = money paid      → appears in DEBIT  column
-- ============================================================
CREATE TABLE dbo.Voucher_Types (
    VouTypeSno INT           IDENTITY(1,1) NOT NULL,
    ClientSno  INT                         NOT NULL,
    AccSno     INT                         NOT NULL,
    VTyp_Code  VARCHAR(20)                 NOT NULL,
    VTyp_Name  VARCHAR(50)   COLLATE Latin1_General_100_CI_AS_SC_UTF8 NOT NULL,
    Cash_Type  CHAR(3)                     NOT NULL CONSTRAINT DF_VoucherTypes_CashType DEFAULT ('OUT'),
    CreateDate DATETIME2(0)               NULL,
    IsActive   BIT                        NOT NULL CONSTRAINT DF_VoucherTypes_IsActive DEFAULT (1),
    Row_Ver    ROWVERSION,
    SysStart   DATETIME2     GENERATED ALWAYS AS ROW START HIDDEN NOT NULL,
    SysEnd     DATETIME2     GENERATED ALWAYS AS ROW END   HIDDEN NOT NULL,
    PERIOD FOR SYSTEM_TIME (SysStart, SysEnd),
    CONSTRAINT PK_VoucherTypes       PRIMARY KEY CLUSTERED (VouTypeSno),
    CONSTRAINT UQ_VoucherTypes_Code  UNIQUE (ClientSno, AccSno, VTyp_Code),
    CONSTRAINT CK_VoucherTypes_Cash  CHECK (Cash_Type IN ('IN','OUT')),
    CONSTRAINT FK_VoucherTypes_Acc   FOREIGN KEY (AccSno) REFERENCES dbo.Accounts (AccSno)
)
WITH (SYSTEM_VERSIONING = ON (HISTORY_TABLE = dbo.Voucher_Types_Audit), DATA_COMPRESSION = PAGE);
GO

-- ============================================================
-- VOUCHER SERIES
-- Numbering_Method:
--   AUTO   = SP auto-generates Vou_No (Prefix + zero-padded Current_No)
--   SEMI   = System shows suggested number; user edits then saves
--   MANUAL = User always types Vou_No; counter ignored
-- ============================================================
CREATE TABLE dbo.Voucher_Series (
    SeriesSno        INT           IDENTITY(1,1) NOT NULL,
    ClientSno        INT                         NOT NULL,
    AccSno           INT                         NOT NULL,
    VouTypeSno       INT                         NOT NULL,
    Series_Name      VARCHAR(20)                 NOT NULL,
    Prefix           CHAR(5)                     NOT NULL,
    Width            TINYINT                     NOT NULL CONSTRAINT DF_VoucherSeries_Width      DEFAULT (5),
    Current_No       INT                         NOT NULL CONSTRAINT DF_VoucherSeries_CurrentNo  DEFAULT (0),
    Numbering_Method VARCHAR(6)                  NOT NULL CONSTRAINT DF_VoucherSeries_Numbering  DEFAULT ('AUTO'),
    CreateDate       DATETIME2(0)               NULL,
    IsActive         BIT                        NOT NULL CONSTRAINT DF_VoucherSeries_IsActive    DEFAULT (1),
    Row_Ver          ROWVERSION,
    SysStart         DATETIME2     GENERATED ALWAYS AS ROW START HIDDEN NOT NULL,
    SysEnd           DATETIME2     GENERATED ALWAYS AS ROW END   HIDDEN NOT NULL,
    PERIOD FOR SYSTEM_TIME (SysStart, SysEnd),
    CONSTRAINT PK_VoucherSeries           PRIMARY KEY CLUSTERED (SeriesSno),
    CONSTRAINT UQ_VoucherSeries_Name      UNIQUE (ClientSno, AccSno, Series_Name),
    CONSTRAINT CK_VoucherSeries_Numbering CHECK (Numbering_Method IN ('AUTO','SEMI','MANUAL')),
    CONSTRAINT CK_VoucherSeries_Width     CHECK (Width BETWEEN 1 AND 10),
    CONSTRAINT FK_VoucherSeries_Type      FOREIGN KEY (VouTypeSno) REFERENCES dbo.Voucher_Types (VouTypeSno),
    CONSTRAINT FK_VoucherSeries_Acc       FOREIGN KEY (AccSno)     REFERENCES dbo.Accounts (AccSno)
)
WITH (SYSTEM_VERSIONING = ON (HISTORY_TABLE = dbo.Voucher_Series_Audit), DATA_COMPRESSION = PAGE);
GO

-- ============================================================
-- VOUCHERS  (transaction table)
-- Amount <> 0 enforced by CHECK.
-- Vou_No is assigned at insert and is immutable — never updated.
-- ClientSno + AccSno stored on every row for cross-tenant safety.
-- ============================================================
CREATE TABLE dbo.Vouchers (
    VouSno     BIGINT        IDENTITY(1,1) NOT NULL,
    ClientSno  INT                         NOT NULL,
    AccSno     INT                         NOT NULL,
    SeriesSno  INT                         NOT NULL,
    LedSno     INT                         NOT NULL,
    UserSno    INT                         NOT NULL,
    Vou_No     VARCHAR(20)                 NOT NULL,
    Vou_Date   DATETIME2(0)                NOT NULL,
    Amount     DECIMAL(18,2)               NOT NULL,
    Narration  NVARCHAR(500)               NOT NULL CONSTRAINT DF_Vouchers_Narration DEFAULT (''),
    CreateDate DATETIME2(0)               NULL,
    IsActive   BIT                        NOT NULL CONSTRAINT DF_Vouchers_IsActive DEFAULT (1),
    Row_Ver    ROWVERSION,
    CONSTRAINT PK_Vouchers            PRIMARY KEY CLUSTERED (VouSno),
    CONSTRAINT UQ_Vouchers_No_Series  UNIQUE (SeriesSno, Vou_No),
    CONSTRAINT CK_Vouchers_Amount     CHECK (Amount <> 0),
    CONSTRAINT FK_Vouchers_Series     FOREIGN KEY (SeriesSno) REFERENCES dbo.Voucher_Series (SeriesSno),
    CONSTRAINT FK_Vouchers_Ledger     FOREIGN KEY (LedSno)    REFERENCES dbo.Ledgers (LedSno),
    CONSTRAINT FK_Vouchers_Acc        FOREIGN KEY (AccSno)    REFERENCES dbo.Accounts (AccSno),
    CONSTRAINT FK_Vouchers_User       FOREIGN KEY (UserSno)   REFERENCES dbo.Users (UserSno)
);
GO

PRINT '01_create_tables.sql  >>>  All tables created successfully.';
GO
