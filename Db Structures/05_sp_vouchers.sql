-- ============================================================
-- VelAccounts  |  05_sp_vouchers.sql
-- Run this file FIFTH (last).
-- Voucher SPs: Types, Series, Vouchers, Ledger Statement
-- ============================================================

USE VelAccounts;
GO

-- ============================================================
-- Sp_Voucher_Types  /  Sp_GetVoucher_Types
-- Cash_Type  'IN'  = money received → CREDIT in ledger statement
--            'OUT' = money paid     → DEBIT  in ledger statement
-- ============================================================
CREATE OR ALTER PROCEDURE dbo.Sp_Voucher_Types
    @Action        TINYINT,
    @VouTypeSno    INT           = NULL,
    @CurrentRowVer NVARCHAR(50)  = NULL,
    @VTyp_Code     VARCHAR(20)   = NULL,
    @VTyp_Name     VARCHAR(50)   = NULL,
    @Cash_Type     CHAR(3)       = NULL,
    @ClientSno     INT,
    @UserSno       INT,
    @AccSno        INT
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        IF @Cash_Type IS NOT NULL AND @Cash_Type NOT IN ('IN','OUT')
            RAISERROR('Cash_Type must be ''IN'' or ''OUT''.', 16, 1);

        IF @Action = 2
        BEGIN
            DELETE FROM dbo.Voucher_Types
            WHERE VouTypeSno = @VouTypeSno
              AND ClientSno  = @ClientSno
              AND AccSno     = @AccSno
              AND Row_Ver    = CONVERT(VARBINARY(8), @CurrentRowVer, 1);
            IF @@ROWCOUNT = 0 RAISERROR('Concurrency Error or Record Not Found', 16, 1);
            SELECT @VouTypeSno AS ID, 'Deleted' AS Message;
        END
        ELSE IF @Action IN (0, 1)
        BEGIN
            IF @Action = 0
            BEGIN
                IF @VTyp_Code IS NULL OR @VTyp_Name IS NULL OR @Cash_Type IS NULL
                    RAISERROR('VTyp_Code, VTyp_Name, and Cash_Type are required.', 16, 1);
                INSERT INTO dbo.Voucher_Types (ClientSno, AccSno, VTyp_Code, VTyp_Name, Cash_Type, CreateDate)
                VALUES (@ClientSno, @AccSno, @VTyp_Code, @VTyp_Name, @Cash_Type, SYSDATETIME());
                SET @VouTypeSno = SCOPE_IDENTITY();
            END
            ELSE
            BEGIN
                UPDATE dbo.Voucher_Types SET
                    VTyp_Code = ISNULL(@VTyp_Code, VTyp_Code),
                    VTyp_Name = ISNULL(@VTyp_Name, VTyp_Name),
                    Cash_Type = ISNULL(@Cash_Type, Cash_Type)
                WHERE VouTypeSno = @VouTypeSno
                  AND ClientSno  = @ClientSno
                  AND AccSno     = @AccSno
                  AND Row_Ver    = CONVERT(VARBINARY(8), @CurrentRowVer, 1);
                IF @@ROWCOUNT = 0 RAISERROR('Concurrency Error or Record Not Found', 16, 1);
            END

            SELECT
                @VouTypeSno AS RetSno,
                'Success'   AS Status,
                'Saved'     AS Message,
                (SELECT CONVERT(NVARCHAR(MAX), CONVERT(VARBINARY(8), Row_Ver), 1)
                 FROM dbo.Voucher_Types WHERE VouTypeSno = @VouTypeSno) AS CurrentRowVer;
        END

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.Sp_GetVoucher_Types
    @ClientSno  INT,
    @VouTypeSno INT = 0,
    @AccSno     INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        VouTypeSno, VTyp_Code, VTyp_Name, Cash_Type, IsActive, CreateDate,
        CONVERT(NVARCHAR(MAX), CONVERT(VARBINARY(8), Row_Ver), 1) AS CurrentRowVer
    FROM dbo.Voucher_Types
    WHERE ClientSno    = @ClientSno
      AND AccSno       = @AccSno
      AND IsActive     = 1
      AND (@VouTypeSno = 0 OR VouTypeSno = @VouTypeSno)
    ORDER BY VTyp_Name;
END;
GO

-- ============================================================
-- Sp_Voucher_Series  /  Sp_GetVoucher_Series
-- Numbering_Method:
--   AUTO   = SP generates Vou_No from counter (no user input)
--   SEMI   = System suggests; user may edit before saving
--   MANUAL = User always provides Vou_No; counter not touched
-- ============================================================
CREATE OR ALTER PROCEDURE dbo.Sp_Voucher_Series
    @Action           TINYINT,
    @SeriesSno        INT           = NULL,
    @CurrentRowVer    NVARCHAR(50)  = NULL,
    @Series_Name      VARCHAR(20)   = NULL,
    @VouTypeSno       INT           = NULL,
    @Prefix           CHAR(5)       = NULL,
    @Width            TINYINT       = NULL,
    @Current_No       INT           = NULL,
    @Numbering_Method VARCHAR(6)    = NULL,
    @ClientSno        INT,
    @UserSno          INT,
    @AccSno           INT
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        IF @Numbering_Method IS NOT NULL AND @Numbering_Method NOT IN ('AUTO','SEMI','MANUAL')
            RAISERROR('Numbering_Method must be AUTO, SEMI, or MANUAL.', 16, 1);

        IF @Action = 2
        BEGIN
            DELETE FROM dbo.Voucher_Series
            WHERE SeriesSno = @SeriesSno
              AND ClientSno = @ClientSno
              AND AccSno    = @AccSno
              AND Row_Ver   = CONVERT(VARBINARY(8), @CurrentRowVer, 1);
            IF @@ROWCOUNT = 0 RAISERROR('Concurrency Error or Record Not Found', 16, 1);
            SELECT @SeriesSno AS ID, 'Deleted' AS Message;
        END
        ELSE IF @Action IN (0, 1)
        BEGIN
            IF @Action = 0
            BEGIN
                IF @Series_Name IS NULL OR @VouTypeSno IS NULL OR @Prefix IS NULL
                   OR @Width IS NULL OR @Numbering_Method IS NULL
                    RAISERROR('Series_Name, VouTypeSno, Prefix, Width, and Numbering_Method are required.', 16, 1);

                INSERT INTO dbo.Voucher_Series
                    (ClientSno, AccSno, VouTypeSno, Series_Name, Prefix, Width, Current_No, Numbering_Method, CreateDate)
                VALUES
                    (@ClientSno, @AccSno, @VouTypeSno, @Series_Name, @Prefix, @Width,
                     ISNULL(@Current_No, 0), @Numbering_Method, SYSDATETIME());
                SET @SeriesSno = SCOPE_IDENTITY();
            END
            ELSE
            BEGIN
                UPDATE dbo.Voucher_Series SET
                    Series_Name      = ISNULL(@Series_Name,      Series_Name),
                    VouTypeSno       = ISNULL(@VouTypeSno,       VouTypeSno),
                    Prefix           = ISNULL(@Prefix,           Prefix),
                    Width            = ISNULL(@Width,            Width),
                    Current_No       = ISNULL(@Current_No,       Current_No),
                    Numbering_Method = ISNULL(@Numbering_Method, Numbering_Method)
                WHERE SeriesSno = @SeriesSno
                  AND ClientSno = @ClientSno
                  AND AccSno    = @AccSno
                  AND Row_Ver   = CONVERT(VARBINARY(8), @CurrentRowVer, 1);
                IF @@ROWCOUNT = 0 RAISERROR('Concurrency Error or Record Not Found', 16, 1);
            END

            SELECT
                @SeriesSno AS RetSno,
                'Success'  AS Status,
                'Saved'    AS Message,
                (SELECT CONVERT(NVARCHAR(MAX), CONVERT(VARBINARY(8), Row_Ver), 1)
                 FROM dbo.Voucher_Series WHERE SeriesSno = @SeriesSno) AS CurrentRowVer;
        END

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-- Sp_GetVoucher_Series joins to Voucher_Types to return Cash_Type alongside
CREATE OR ALTER PROCEDURE dbo.Sp_GetVoucher_Series
    @ClientSno INT,
    @SeriesSno INT = 0,
    @AccSno    INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        vs.SeriesSno,
        vs.Series_Name,
        vs.VouTypeSno,
        vt.VTyp_Code,
        vt.VTyp_Name,
        vt.Cash_Type,
        vs.Prefix,
        vs.Width,
        vs.Current_No,
        vs.Numbering_Method,
        vs.IsActive,
        vs.CreateDate,
        CONVERT(NVARCHAR(MAX), CONVERT(VARBINARY(8), vs.Row_Ver), 1) AS CurrentRowVer
    FROM dbo.Voucher_Series vs
    INNER JOIN dbo.Voucher_Types vt
        ON  vt.VouTypeSno = vs.VouTypeSno
        AND vt.ClientSno  = vs.ClientSno
        AND vt.AccSno     = vs.AccSno
    WHERE vs.ClientSno  = @ClientSno
      AND vs.AccSno     = @AccSno
      AND vs.IsActive   = 1
      AND (@SeriesSno   = 0 OR vs.SeriesSno = @SeriesSno)
    ORDER BY vs.Series_Name;
END;
GO

-- ============================================================
-- Sp_GetNextVoucherNo
-- Non-destructive preview of the NEXT voucher number.
-- Used by the UI for SEMI mode (show suggestion, user can edit).
-- Does NOT increment Current_No — that happens in Sp_Vouchers.
-- ============================================================
CREATE OR ALTER PROCEDURE dbo.Sp_GetNextVoucherNo
    @SeriesSno INT,
    @ClientSno INT,
    @AccSno    INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Prefix    CHAR(5);
    DECLARE @Width     TINYINT;
    DECLARE @CurrentNo INT;
    DECLARE @PreviewNo VARCHAR(20);

    SELECT
        @Prefix    = Prefix,
        @Width     = Width,
        @CurrentNo = Current_No
    FROM dbo.Voucher_Series
    WHERE SeriesSno = @SeriesSno
      AND ClientSno = @ClientSno
      AND AccSno    = @AccSno
      AND IsActive  = 1;

    IF @Prefix IS NULL
    BEGIN
        RAISERROR('Voucher Series not found or inactive.', 16, 1);
        RETURN;
    END

    SET @PreviewNo = RTRIM(@Prefix)
                   + RIGHT(REPLICATE('0', @Width) + CAST(@CurrentNo + 1 AS VARCHAR(10)), @Width);

    SELECT
        @PreviewNo  AS PreviewVouNo,
        @CurrentNo  AS Current_No,
        @Prefix     AS Prefix,
        @Width      AS Width;
END;
GO

-- ============================================================
-- Sp_Vouchers  (CRUD)
-- Action 0 = Insert  |  1 = Update  |  2 = Delete
--
-- Numbering logic (Action = 0 only):
--   AUTO   → Ignores @Vou_No. Atomically increments Current_No under
--             UPDLOCK+ROWLOCK and builds Vou_No = RTRIM(Prefix) + zero-padded counter.
--             Response includes the generated Vou_No.
--   SEMI   → @Vou_No is required (user accepted/edited the suggestion).
--             Counter is NOT touched.
--   MANUAL → @Vou_No is required (user typed the number).
--             Counter is NOT touched.
--
-- Security: ClientSno + AccSno always checked on UPDATE and DELETE
--           to prevent cross-tenant operations.
-- Vou_No is immutable — UPDATE does not change it.
-- ============================================================
CREATE OR ALTER PROCEDURE dbo.Sp_Vouchers
    @Action        TINYINT,
    @VouSno        BIGINT        = NULL,
    @CurrentRowVer NVARCHAR(50)  = NULL,
    @SeriesSno     INT           = NULL,
    @Vou_No        VARCHAR(20)   = NULL,
    @Vou_Date      DATETIME2(0)  = NULL,
    @LedSno        INT           = NULL,
    @Amount        DECIMAL(18,2) = NULL,
    @Narration     NVARCHAR(500) = NULL,
    @ClientSno     INT           = NULL,
    @UserSno       INT,
    @AccSno        INT
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- ── DELETE ───────────────────────────────────────────────
        IF @Action = 2
        BEGIN
            DELETE FROM dbo.Vouchers
            WHERE VouSno    = @VouSno
              AND ClientSno = @ClientSno
              AND AccSno    = @AccSno
              AND Row_Ver   = CONVERT(VARBINARY(8), @CurrentRowVer, 1);
            IF @@ROWCOUNT = 0 RAISERROR('Concurrency Error or Record Not Found', 16, 1);
            SELECT @VouSno AS ID, 'Success' AS Status, 'Deleted' AS Message;
        END

        -- ── INSERT ───────────────────────────────────────────────
        ELSE IF @Action = 0
        BEGIN
            IF @SeriesSno IS NULL OR @Vou_Date IS NULL OR @LedSno IS NULL OR @Amount IS NULL
                RAISERROR('SeriesSno, Vou_Date, LedSno, and Amount are required.', 16, 1);
            IF @Amount = 0
                RAISERROR('Amount cannot be zero.', 16, 1);

            -- Lock the series row to read Numbering_Method and Prefix/Width
            DECLARE @Numbering_Method VARCHAR(6);
            DECLARE @Prefix           CHAR(5);
            DECLARE @Width            TINYINT;
            DECLARE @NextNo           INT;

            SELECT
                @Numbering_Method = Numbering_Method,
                @Prefix           = Prefix,
                @Width            = Width,
                @NextNo           = Current_No + 1
            FROM dbo.Voucher_Series WITH (UPDLOCK, ROWLOCK)
            WHERE SeriesSno = @SeriesSno
              AND ClientSno = @ClientSno
              AND AccSno    = @AccSno
              AND IsActive  = 1;

            IF @Numbering_Method IS NULL
                RAISERROR('Voucher Series not found, inactive, or belongs to another account.', 16, 1);

            -- Numbering_Method logic
            IF @Numbering_Method = 'AUTO'
            BEGIN
                -- Atomically claim the next counter value
                UPDATE dbo.Voucher_Series
                    SET Current_No = @NextNo
                WHERE SeriesSno = @SeriesSno;

                -- Build formatted number: e.g. Prefix='REC', Width=5, No=42 → 'REC00042'
                SET @Vou_No = RTRIM(@Prefix)
                            + RIGHT(REPLICATE('0', @Width) + CAST(@NextNo AS VARCHAR(10)), @Width);
            END
            ELSE  -- SEMI or MANUAL: caller must supply Vou_No
            BEGIN
                IF @Vou_No IS NULL OR LEN(LTRIM(RTRIM(@Vou_No))) = 0
                    RAISERROR('Vou_No is required for SEMI and MANUAL numbering series.', 16, 1);
            END

            INSERT INTO dbo.Vouchers
                (ClientSno, AccSno, SeriesSno, LedSno, UserSno,
                 Vou_No, Vou_Date, Amount, Narration, CreateDate)
            VALUES
                (@ClientSno, @AccSno, @SeriesSno, @LedSno, @UserSno,
                 @Vou_No, @Vou_Date, @Amount, ISNULL(@Narration,''), SYSDATETIME());

            SET @VouSno = SCOPE_IDENTITY();

            SELECT
                @VouSno    AS RetSno,
                @Vou_No    AS Vou_No,       -- essential for AUTO so caller knows the assigned number
                'Success'  AS Status,
                'Saved'    AS Message,
                (SELECT CONVERT(NVARCHAR(MAX), CONVERT(VARBINARY(8), Row_Ver), 1)
                 FROM dbo.Vouchers WHERE VouSno = @VouSno) AS CurrentRowVer;
        END

        -- ── UPDATE ───────────────────────────────────────────────
        ELSE IF @Action = 1
        BEGIN
            IF @Amount IS NOT NULL AND @Amount = 0
                RAISERROR('Amount cannot be zero.', 16, 1);

            -- Vou_No is intentionally excluded — assigned number is immutable
            UPDATE dbo.Vouchers SET
                Vou_Date  = ISNULL(@Vou_Date,  Vou_Date),
                LedSno    = ISNULL(@LedSno,    LedSno),
                Amount    = ISNULL(@Amount,    Amount),
                Narration = ISNULL(@Narration, Narration),
                UserSno   = @UserSno
            WHERE VouSno    = @VouSno
              AND ClientSno = @ClientSno
              AND AccSno    = @AccSno
              AND Row_Ver   = CONVERT(VARBINARY(8), @CurrentRowVer, 1);

            IF @@ROWCOUNT = 0 RAISERROR('Concurrency Error or Record Not Found', 16, 1);

            SELECT
                @VouSno   AS RetSno,
                'Success' AS Status,
                'Updated' AS Message,
                (SELECT CONVERT(NVARCHAR(MAX), CONVERT(VARBINARY(8), Row_Ver), 1)
                 FROM dbo.Vouchers WHERE VouSno = @VouSno) AS CurrentRowVer;
        END

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-- ============================================================
-- Sp_GetVouchers
-- @VouSno = 0 → return all active vouchers for the account
-- ============================================================
CREATE OR ALTER PROCEDURE dbo.Sp_GetVouchers
    @ClientSno INT,
    @VouSno    BIGINT = 0,
    @AccSno    INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        v.VouSno,
        v.SeriesSno,
        vs.Series_Name,
        vt.VTyp_Name   AS VoucherType,
        vt.Cash_Type,
        v.LedSno,
        l.Led_Name,
        v.Vou_No,
        CONVERT(DATE, v.Vou_Date) AS Vou_Date,
        v.Amount,
        v.Narration,
        v.CreateDate,
        CONVERT(NVARCHAR(MAX), CONVERT(VARBINARY(8), v.Row_Ver), 1) AS CurrentRowVer
    FROM dbo.Vouchers v
    INNER JOIN dbo.Voucher_Series vs
        ON  vs.SeriesSno = v.SeriesSno
    INNER JOIN dbo.Voucher_Types vt
        ON  vt.VouTypeSno = vs.VouTypeSno
    INNER JOIN dbo.Ledgers l
        ON  l.LedSno = v.LedSno
    WHERE v.ClientSno = @ClientSno
      AND v.AccSno    = @AccSno
      AND v.IsActive  = 1
      AND (@VouSno    = 0 OR v.VouSno = @VouSno)
    ORDER BY v.Vou_Date DESC, v.VouSno DESC;
END;
GO

-- ============================================================
-- Sp_LedgerStatement
-- Returns 2 recordsets:
--   [0]  Transaction lines with Debit / Credit / RunningBalance
--   [1]  Summary: OpeningBalance, ClosingBalance, FromDate, ToDate
--
-- Cash_Type = 'OUT' → Debit  column  (money going out)
-- Cash_Type = 'IN'  → Credit column  (money coming in)
--
-- Opening balance = net of all vouchers for this ledger BEFORE @FromDate
-- Running balance = Opening + cumulative net (IN adds, OUT subtracts)
-- Closing balance = Opening + net of all vouchers in the date range
-- ============================================================
CREATE OR ALTER PROCEDURE dbo.Sp_LedgerStatement
    @ClientSno INT,
    @AccSno    INT,
    @LedSno    INT,
    @FromDate  DATETIME2(0),
    @ToDate    DATETIME2(0)
AS
BEGIN
    SET NOCOUNT ON;

    -- Opening Balance: net of all transactions strictly BEFORE @FromDate
    DECLARE @OpeningBalance DECIMAL(18,2);

    SELECT @OpeningBalance = ISNULL(SUM(
        CASE WHEN vt.Cash_Type = 'IN' THEN v.Amount ELSE -v.Amount END
    ), 0)
    FROM dbo.Vouchers v
    INNER JOIN dbo.Voucher_Series vs
        ON  vs.SeriesSno = v.SeriesSno
        AND vs.ClientSno = v.ClientSno
        AND vs.AccSno    = v.AccSno
    INNER JOIN dbo.Voucher_Types vt
        ON  vt.VouTypeSno = vs.VouTypeSno
        AND vt.ClientSno  = vs.ClientSno
        AND vt.AccSno     = vs.AccSno
    WHERE v.ClientSno = @ClientSno
      AND v.AccSno    = @AccSno
      AND v.LedSno    = @LedSno
      AND v.IsActive  = 1
      AND v.Vou_Date  < @FromDate;

    -- Recordset 1: transaction lines
    SELECT
        v.VouSno,
        v.Vou_No,
        CONVERT(DATE, v.Vou_Date)  AS Vou_Date,
        vt.VTyp_Name               AS VoucherType,
        vs.Series_Name,
        vt.Cash_Type,
        v.Narration,
        CASE WHEN vt.Cash_Type = 'OUT' THEN v.Amount ELSE CAST(0 AS DECIMAL(18,2)) END  AS Debit,
        CASE WHEN vt.Cash_Type = 'IN'  THEN v.Amount ELSE CAST(0 AS DECIMAL(18,2)) END  AS Credit,
        @OpeningBalance + SUM(
            CASE WHEN vt.Cash_Type = 'IN' THEN v.Amount ELSE -v.Amount END
        ) OVER (
            ORDER BY v.Vou_Date, v.VouSno
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        )                          AS RunningBalance,
        @OpeningBalance            AS OpeningBalance
    FROM dbo.Vouchers v
    INNER JOIN dbo.Voucher_Series vs
        ON  vs.SeriesSno = v.SeriesSno
        AND vs.ClientSno = v.ClientSno
        AND vs.AccSno    = v.AccSno
    INNER JOIN dbo.Voucher_Types vt
        ON  vt.VouTypeSno = vs.VouTypeSno
        AND vt.ClientSno  = vs.ClientSno
        AND vt.AccSno     = vs.AccSno
    WHERE v.ClientSno = @ClientSno
      AND v.AccSno    = @AccSno
      AND v.LedSno    = @LedSno
      AND v.IsActive  = 1
      AND v.Vou_Date  BETWEEN @FromDate AND @ToDate
    ORDER BY v.Vou_Date, v.VouSno;

    -- Recordset 2: summary for report header/footer
    DECLARE @ClosingBalance DECIMAL(18,2);

    SELECT @ClosingBalance = @OpeningBalance + ISNULL(SUM(
        CASE WHEN vt.Cash_Type = 'IN' THEN v.Amount ELSE -v.Amount END
    ), 0)
    FROM dbo.Vouchers v
    INNER JOIN dbo.Voucher_Series vs
        ON  vs.SeriesSno = v.SeriesSno
        AND vs.ClientSno = v.ClientSno
        AND vs.AccSno    = v.AccSno
    INNER JOIN dbo.Voucher_Types vt
        ON  vt.VouTypeSno = vs.VouTypeSno
        AND vt.ClientSno  = vs.ClientSno
        AND vt.AccSno     = vs.AccSno
    WHERE v.ClientSno = @ClientSno
      AND v.AccSno    = @AccSno
      AND v.LedSno    = @LedSno
      AND v.IsActive  = 1
      AND v.Vou_Date  BETWEEN @FromDate AND @ToDate;

    SELECT
        @OpeningBalance AS OpeningBalance,
        @ClosingBalance AS ClosingBalance,
        @FromDate       AS FromDate,
        @ToDate         AS ToDate;
END;
GO

PRINT '05_sp_vouchers.sql  >>>  Voucher stored procedures created successfully.';
GO
