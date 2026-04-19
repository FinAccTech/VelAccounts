-- ============================================================
-- VelAccounts  |  04_sp_master.sql
-- Run this file FOURTH.
-- Master data SPs: Accounts, Ledger Groups, Ledgers
-- All follow the same pattern:
--   Sp_XXX       Action 0=Insert 1=Update 2=Delete
--   Sp_GetXXX    @PrimaryKey=0 → all rows; > 0 → single row
-- ============================================================

USE VelAccounts;
GO

-- ============================================================
-- Sp_Accounts  /  Sp_GetAccounts
-- Note: No @AccSno guard here — Accounts IS the parent entity.
-- ============================================================
CREATE OR ALTER PROCEDURE dbo.Sp_Accounts
    @Action        TINYINT,
    @AccSno        INT           = NULL,
    @CurrentRowVer NVARCHAR(50)  = NULL,
    @Acc_Code      VARCHAR(20)   = NULL,
    @Acc_Name      VARCHAR(100)  = NULL,
    @Remarks       VARCHAR(100)  = NULL,
    @ClientSno     INT,
    @UserSno       INT
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        IF @Action = 2
        BEGIN
            DELETE FROM dbo.Accounts
            WHERE AccSno    = @AccSno
              AND ClientSno = @ClientSno
              AND Row_Ver   = CONVERT(VARBINARY(8), @CurrentRowVer, 1);
            IF @@ROWCOUNT = 0 RAISERROR('Concurrency Error or Record Not Found', 16, 1);
            SELECT @AccSno AS ID, 'Deleted' AS Message;
        END
        ELSE IF @Action IN (0, 1)
        BEGIN
            IF @Action = 0
            BEGIN
                IF @Acc_Code IS NULL OR @Acc_Name IS NULL
                    RAISERROR('Acc_Code and Acc_Name are required.', 16, 1);
                INSERT INTO dbo.Accounts (ClientSno, Acc_Code, Acc_Name, Remarks, CreateDate)
                VALUES (@ClientSno, @Acc_Code, @Acc_Name, ISNULL(@Remarks,''), SYSDATETIME());
                SET @AccSno = SCOPE_IDENTITY();
            END
            ELSE
            BEGIN
                UPDATE dbo.Accounts SET
                    Acc_Code = ISNULL(@Acc_Code, Acc_Code),
                    Acc_Name = ISNULL(@Acc_Name, Acc_Name),
                    Remarks  = ISNULL(@Remarks,  Remarks)
                WHERE AccSno    = @AccSno
                  AND ClientSno = @ClientSno
                  AND Row_Ver   = CONVERT(VARBINARY(8), @CurrentRowVer, 1);
                IF @@ROWCOUNT = 0 RAISERROR('Concurrency Error or Record Not Found', 16, 1);
            END

            SELECT
                @AccSno   AS RetSno,
                'Success' AS Status,
                'Saved'   AS Message,
                (SELECT CONVERT(NVARCHAR(MAX), CONVERT(VARBINARY(8), Row_Ver), 1)
                 FROM dbo.Accounts WHERE AccSno = @AccSno) AS CurrentRowVer;
        END

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.Sp_GetAccounts
    @ClientSno INT,
    @AccSno    INT = 0
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        AccSno, Acc_Code, Acc_Name, Remarks, IsActive, CreateDate,
        CONVERT(NVARCHAR(MAX), CONVERT(VARBINARY(8), Row_Ver), 1) AS CurrentRowVer
    FROM dbo.Accounts
    WHERE ClientSno = @ClientSno
      AND IsActive  = 1
      AND (@AccSno  = 0 OR AccSno = @AccSno)
    ORDER BY Acc_Code;
END;
GO

-- ============================================================
-- Sp_Ledger_Groups  /  Sp_GetLedger_Groups
-- ============================================================
CREATE OR ALTER PROCEDURE dbo.Sp_Ledger_Groups
    @Action        TINYINT,
    @GrpSno        INT           = NULL,
    @CurrentRowVer NVARCHAR(50)  = NULL,
    @Grp_Code      VARCHAR(20)   = NULL,
    @Grp_Name      VARCHAR(100)  = NULL,
    @Remarks       VARCHAR(100)  = NULL,
    @ClientSno     INT,
    @UserSno       INT,
    @AccSno        INT
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        IF @Action = 2
        BEGIN
            DELETE FROM dbo.Ledger_Groups
            WHERE GrpSno    = @GrpSno
              AND ClientSno = @ClientSno
              AND AccSno    = @AccSno
              AND Row_Ver   = CONVERT(VARBINARY(8), @CurrentRowVer, 1);
            IF @@ROWCOUNT = 0 RAISERROR('Concurrency Error or Record Not Found', 16, 1);
            SELECT @GrpSno AS ID, 'Deleted' AS Message;
        END
        ELSE IF @Action IN (0, 1)
        BEGIN
            IF @Action = 0
            BEGIN
                IF @Grp_Code IS NULL OR @Grp_Name IS NULL
                    RAISERROR('Grp_Code and Grp_Name are required.', 16, 1);
                INSERT INTO dbo.Ledger_Groups (ClientSno, AccSno, Grp_Code, Grp_Name, Remarks, CreateDate)
                VALUES (@ClientSno, @AccSno, @Grp_Code, @Grp_Name, ISNULL(@Remarks,''), SYSDATETIME());
                SET @GrpSno = SCOPE_IDENTITY();
            END
            ELSE
            BEGIN
                UPDATE dbo.Ledger_Groups SET
                    Grp_Code = ISNULL(@Grp_Code, Grp_Code),
                    Grp_Name = ISNULL(@Grp_Name, Grp_Name),
                    Remarks  = ISNULL(@Remarks,  Remarks)
                WHERE GrpSno    = @GrpSno
                  AND ClientSno = @ClientSno
                  AND AccSno    = @AccSno
                  AND Row_Ver   = CONVERT(VARBINARY(8), @CurrentRowVer, 1);
                IF @@ROWCOUNT = 0 RAISERROR('Concurrency Error or Record Not Found', 16, 1);
            END

            SELECT
                @GrpSno   AS RetSno,
                'Success' AS Status,
                'Saved'   AS Message,
                (SELECT CONVERT(NVARCHAR(MAX), CONVERT(VARBINARY(8), Row_Ver), 1)
                 FROM dbo.Ledger_Groups WHERE GrpSno = @GrpSno) AS CurrentRowVer;
        END

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.Sp_GetLedger_Groups
    @ClientSno INT,
    @GrpSno    INT = 0,
    @AccSno    INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        GrpSno, Grp_Code, Grp_Name, Remarks, IsActive, CreateDate,
        CONVERT(NVARCHAR(MAX), CONVERT(VARBINARY(8), Row_Ver), 1) AS CurrentRowVer
    FROM dbo.Ledger_Groups
    WHERE ClientSno = @ClientSno
      AND AccSno    = @AccSno
      AND IsActive  = 1
      AND (@GrpSno  = 0 OR GrpSno = @GrpSno)
    ORDER BY Grp_Name;
END;
GO

-- ============================================================
-- Sp_Ledgers  /  Sp_GetLedgers
-- ============================================================
CREATE OR ALTER PROCEDURE dbo.Sp_Ledgers
    @Action        TINYINT,
    @LedSno        INT           = NULL,
    @CurrentRowVer NVARCHAR(50)  = NULL,
    @Led_Code      VARCHAR(20)   = NULL,
    @Led_Name      VARCHAR(100)  = NULL,
    @GrpSno        INT           = NULL,
    @Remarks       VARCHAR(100)  = NULL,
    @ClientSno     INT,
    @UserSno       INT,
    @AccSno        INT
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        IF @Action = 2
        BEGIN
            DELETE FROM dbo.Ledgers
            WHERE LedSno    = @LedSno
              AND ClientSno = @ClientSno
              AND AccSno    = @AccSno
              AND Row_Ver   = CONVERT(VARBINARY(8), @CurrentRowVer, 1);
            IF @@ROWCOUNT = 0 RAISERROR('Concurrency Error or Record Not Found', 16, 1);
            SELECT @LedSno AS ID, 'Deleted' AS Message;
        END
        ELSE IF @Action IN (0, 1)
        BEGIN
            IF @Action = 0
            BEGIN
                IF @Led_Code IS NULL OR @Led_Name IS NULL OR @GrpSno IS NULL
                    RAISERROR('Led_Code, Led_Name, and GrpSno are required.', 16, 1);
                INSERT INTO dbo.Ledgers (ClientSno, AccSno, GrpSno, Led_Code, Led_Name, Remarks, CreateDate)
                VALUES (@ClientSno, @AccSno, @GrpSno, @Led_Code, @Led_Name, ISNULL(@Remarks,''), SYSDATETIME());
                SET @LedSno = SCOPE_IDENTITY();
            END
            ELSE
            BEGIN
                UPDATE dbo.Ledgers SET
                    Led_Code = ISNULL(@Led_Code, Led_Code),
                    Led_Name = ISNULL(@Led_Name, Led_Name),
                    GrpSno   = ISNULL(@GrpSno,   GrpSno),
                    Remarks  = ISNULL(@Remarks,   Remarks)
                WHERE LedSno    = @LedSno
                  AND ClientSno = @ClientSno
                  AND AccSno    = @AccSno
                  AND Row_Ver   = CONVERT(VARBINARY(8), @CurrentRowVer, 1);
                IF @@ROWCOUNT = 0 RAISERROR('Concurrency Error or Record Not Found', 16, 1);
            END

            SELECT
                @LedSno   AS RetSno,
                'Success' AS Status,
                'Saved'   AS Message,
                (SELECT CONVERT(NVARCHAR(MAX), CONVERT(VARBINARY(8), Row_Ver), 1)
                 FROM dbo.Ledgers WHERE LedSno = @LedSno) AS CurrentRowVer;
        END

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.Sp_GetLedgers
    @ClientSno INT,
    @LedSno    INT = 0,
    @AccSno    INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        l.LedSno, l.Led_Code, l.Led_Name, l.GrpSno,
        g.Grp_Name, l.Remarks, l.IsActive, l.CreateDate,
        CONVERT(NVARCHAR(MAX), CONVERT(VARBINARY(8), l.Row_Ver), 1) AS CurrentRowVer
    FROM dbo.Ledgers l
    INNER JOIN dbo.Ledger_Groups g
        ON g.GrpSno    = l.GrpSno
       AND g.ClientSno = l.ClientSno
       AND g.AccSno    = l.AccSno
    WHERE l.ClientSno = @ClientSno
      AND l.AccSno    = @AccSno
      AND l.IsActive  = 1
      AND (@LedSno    = 0 OR l.LedSno = @LedSno)
    ORDER BY l.Led_Name;
END;
GO

PRINT '04_sp_master.sql  >>>  Master data stored procedures created successfully.';
GO
