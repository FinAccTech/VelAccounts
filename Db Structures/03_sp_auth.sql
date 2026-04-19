-- ============================================================
-- VelAccounts  |  03_sp_auth.sql
-- Run this file THIRD.
-- Auth SPs: Login, Users CRUD, Refresh Tokens, Login History
-- ============================================================

USE VelAccounts;
GO

-- ============================================================
-- Sp_Login
-- Accepts Client_Code (human-readable) and resolves to ClientSno.
-- Returns PasswordHash for Node.js bcrypt.compare — never returns
-- the hash to the API client.
-- Returns ErrorCode='INVALID_CLIENT' when Client_Code not found.
-- SuperAdmins (ClientSno IS NULL) can log in under any valid Client_Code.
-- ============================================================
CREATE OR ALTER PROCEDURE dbo.Sp_Login
    @Client_Code  VARCHAR(20),
    @User_Name    VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @ClientSno INT;
    SELECT @ClientSno = ClientSno
    FROM   dbo.Clients
    WHERE  Client_Code = @Client_Code AND IsActive = 1;

    IF @ClientSno IS NULL
    BEGIN
        SELECT
            CAST(NULL AS INT)          AS UserSno,
            CAST(NULL AS VARCHAR(50))  AS User_Name,
            CAST(NULL AS VARCHAR(256)) AS PasswordHash,
            CAST(NULL AS TINYINT)      AS FailedAttempts,
            CAST(NULL AS DATETIME2)    AS LockoutUntil,
            CAST(NULL AS BIT)          AS IsActive,
            CAST(NULL AS BIT)          AS MustChangePwd,
            CAST(NULL AS INT)          AS ClientSno,
            CAST(NULL AS VARCHAR(20))  AS Role,
            CAST(NULL AS VARCHAR(100)) AS Email,
            CAST('INVALID_CLIENT' AS VARCHAR(30)) AS ErrorCode;
        RETURN;
    END

    SELECT TOP 1
        u.UserSno,
        u.User_Name,
        u.PasswordHash,
        u.FailedAttempts,
        u.LockoutUntil,
        u.IsActive,
        u.MustChangePwd,
        @ClientSno         AS ClientSno,
        u.Role,
        u.Email,
        CAST(NULL AS VARCHAR(30)) AS ErrorCode
    FROM dbo.Users u
    WHERE u.User_Name  = @User_Name
      AND (u.ClientSno = @ClientSno OR u.ClientSno IS NULL)
      AND u.IsActive   = 1;
END;
GO

-- ============================================================
-- Sp_GetUserHash  (internal use only — NOT an API endpoint)
-- Used by change-password to verify current password without
-- requiring the user to re-supply Client_Code.
-- ============================================================
CREATE OR ALTER PROCEDURE dbo.Sp_GetUserHash
    @UserSno   INT,
    @ClientSno INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT PasswordHash
    FROM   dbo.Users
    WHERE  UserSno    = @UserSno
      AND  (ClientSno = @ClientSno OR ClientSno IS NULL)
      AND  IsActive   = 1;
END;
GO

-- ============================================================
-- Sp_LoginSuccess
-- Called AFTER bcrypt confirms the password is correct.
-- Resets the failed-attempt counter and records login history.
-- ============================================================
CREATE OR ALTER PROCEDURE dbo.Sp_LoginSuccess
    @UserSno   INT,
    @User_Name VARCHAR(50),
    @IPAddress VARCHAR(45)  = NULL,
    @UserAgent VARCHAR(500) = NULL,
    @ClientSno INT          = NULL,
    @AccSno    INT          = NULL
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.Users SET
        FailedAttempts = 0,
        LockoutUntil   = NULL,
        LastLoginDate  = SYSDATETIME()
    WHERE UserSno = @UserSno;

    INSERT INTO dbo.Login_History (UserSno, User_Name, IPAddress, UserAgent, IsSuccess, ClientSno, AccSno)
    VALUES (@UserSno, @User_Name, @IPAddress, @UserAgent, 1, @ClientSno, @AccSno);
END;
GO

-- ============================================================
-- Sp_LoginFailed
-- Increments failed-attempt counter; locks account after 5 attempts.
-- Returns AttemptsRemaining so Node.js can warn the user.
-- ============================================================
CREATE OR ALTER PROCEDURE dbo.Sp_LoginFailed
    @UserSno    INT          = NULL,
    @User_Name  VARCHAR(50)  = NULL,
    @IPAddress  VARCHAR(45)  = NULL,
    @UserAgent  VARCHAR(500) = NULL,
    @ClientSno  INT          = NULL,
    @FailReason VARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @MaxAttempts TINYINT = 5;
    DECLARE @LockMinutes INT     = 30;
    DECLARE @NewAttempts TINYINT = 0;
    DECLARE @IsLocked   BIT     = 0;

    IF @UserSno IS NOT NULL
    BEGIN
        UPDATE dbo.Users SET
            FailedAttempts = FailedAttempts + 1,
            LockoutUntil   = CASE
                                 WHEN FailedAttempts + 1 >= @MaxAttempts
                                 THEN DATEADD(MINUTE, @LockMinutes, SYSDATETIME())
                                 ELSE NULL
                             END
        WHERE UserSno = @UserSno;

        SELECT @NewAttempts = FailedAttempts FROM dbo.Users WHERE UserSno = @UserSno;
        SET @IsLocked = CASE WHEN @NewAttempts >= @MaxAttempts THEN 1 ELSE 0 END;
    END

    INSERT INTO dbo.Login_History (UserSno, User_Name, IPAddress, UserAgent, IsSuccess, FailReason, ClientSno)
    VALUES (@UserSno, @User_Name, @IPAddress, @UserAgent, 0, @FailReason, @ClientSno);

    SELECT
        @NewAttempts                     AS FailedAttempts,
        @IsLocked                        AS IsLocked,
        @MaxAttempts - @NewAttempts      AS AttemptsRemaining;
END;
GO

-- ============================================================
-- Sp_SaveRefreshToken
-- ============================================================
CREATE OR ALTER PROCEDURE dbo.Sp_SaveRefreshToken
    @UserSno   INT,
    @Token     VARCHAR(512),
    @ExpiresAt DATETIME2(0),
    @IPAddress VARCHAR(45)  = NULL,
    @UserAgent VARCHAR(500) = NULL,
    @ClientSno INT          = NULL
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO dbo.RefreshTokens (UserSno, ClientSno, Token, ExpiresAt, IPAddress, UserAgent)
    VALUES (@UserSno, @ClientSno, @Token, @ExpiresAt, @IPAddress, @UserAgent);
END;
GO

-- ============================================================
-- Sp_ValidateRefreshToken
-- Returns user details if the token is valid and not expired.
-- ============================================================
CREATE OR ALTER PROCEDURE dbo.Sp_ValidateRefreshToken
    @Token VARCHAR(512)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        rt.UserSno,
        rt.ClientSno,
        u.User_Name,
        u.Role,
        u.Email
    FROM dbo.RefreshTokens rt
    INNER JOIN dbo.Users u ON u.UserSno = rt.UserSno
    WHERE rt.Token     = @Token
      AND rt.IsRevoked = 0
      AND rt.ExpiresAt > SYSDATETIME()
      AND u.IsActive   = 1;
END;
GO

-- ============================================================
-- Sp_RevokeRefreshToken  (single session logout)
-- ============================================================
CREATE OR ALTER PROCEDURE dbo.Sp_RevokeRefreshToken
    @Token VARCHAR(512)
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.RefreshTokens SET IsRevoked = 1
    WHERE  Token = @Token;
END;
GO

-- ============================================================
-- Sp_RevokeAllUserTokens  (logout-all / password change)
-- ============================================================
CREATE OR ALTER PROCEDURE dbo.Sp_RevokeAllUserTokens
    @UserSno INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.RefreshTokens SET IsRevoked = 1
    WHERE  UserSno   = @UserSno
      AND  IsRevoked = 0;
    SELECT @@ROWCOUNT AS Revoked;
END;
GO

-- ============================================================
-- Sp_GetLoginHistory  (paginated)
-- Returns 2 recordsets: rows + total count
-- ============================================================
CREATE OR ALTER PROCEDURE dbo.Sp_GetLoginHistory
    @UserSno   INT,
    @ClientSno INT,
    @PageNo    INT = 1,
    @PageSize  INT = 20
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Offset INT = (@PageNo - 1) * @PageSize;

    SELECT
        LogSno, User_Name, IPAddress, UserAgent,
        IsSuccess, FailReason, LogDate, AccSno
    FROM dbo.Login_History
    WHERE UserSno   = @UserSno
      AND ClientSno = @ClientSno
    ORDER BY LogDate DESC
    OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;

    SELECT COUNT(*) AS TotalRows
    FROM   dbo.Login_History
    WHERE  UserSno   = @UserSno
      AND  ClientSno = @ClientSno;
END;
GO

-- ============================================================
-- Sp_Users  (CRUD)
-- Action 0 = Insert  |  1 = Update  |  2 = Soft-delete  |  3 = Change password
-- PasswordHash is ALWAYS hashed by Node.js before being passed here.
-- ============================================================
CREATE OR ALTER PROCEDURE dbo.Sp_Users
    @Action        TINYINT,
    @UserSno       INT           = NULL,
    @CurrentRowVer NVARCHAR(50)  = NULL,
    @ClientSno     INT           = NULL,
    @User_Name     VARCHAR(50)   = NULL,
    @Email         VARCHAR(100)  = NULL,
    @PasswordHash  VARCHAR(256)  = NULL,
    @Role          VARCHAR(20)   = NULL,
    @IsActive      BIT           = NULL,
    @MustChangePwd BIT           = NULL,
    @CallerUserSno INT
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        IF @Action = 0  -- Insert
        BEGIN
            IF @User_Name IS NULL OR @PasswordHash IS NULL
                RAISERROR('User_Name and PasswordHash are required.', 16, 1);

            INSERT INTO dbo.Users
                (ClientSno, User_Name, Email, PasswordHash, Role, CreateDate, MustChangePwd)
            VALUES
                (@ClientSno, @User_Name, @Email, @PasswordHash,
                 ISNULL(@Role, 'USER'), SYSDATETIME(), ISNULL(@MustChangePwd, 0));
            SET @UserSno = SCOPE_IDENTITY();
        END

        ELSE IF @Action = 1  -- Update profile
        BEGIN
            UPDATE dbo.Users SET
                Email         = ISNULL(@Email,         Email),
                Role          = ISNULL(@Role,          Role),
                IsActive      = ISNULL(@IsActive,      IsActive),
                MustChangePwd = ISNULL(@MustChangePwd, MustChangePwd)
            WHERE UserSno  = @UserSno
              AND (ClientSno = @ClientSno OR ClientSno IS NULL)
              AND Row_Ver   = CONVERT(VARBINARY(8), @CurrentRowVer, 1);
            IF @@ROWCOUNT = 0 RAISERROR('Concurrency Error or Record Not Found', 16, 1);
        END

        ELSE IF @Action = 2  -- Soft delete
        BEGIN
            UPDATE dbo.Users SET IsActive = 0
            WHERE UserSno  = @UserSno
              AND (ClientSno = @ClientSno OR ClientSno IS NULL)
              AND Row_Ver   = CONVERT(VARBINARY(8), @CurrentRowVer, 1);
            IF @@ROWCOUNT = 0 RAISERROR('Concurrency Error or Record Not Found', 16, 1);
        END

        ELSE IF @Action = 3  -- Change / reset password
        BEGIN
            IF @PasswordHash IS NULL
                RAISERROR('PasswordHash is required for password change.', 16, 1);

            UPDATE dbo.Users SET
                PasswordHash   = @PasswordHash,
                MustChangePwd  = ISNULL(@MustChangePwd, 0),
                FailedAttempts = 0,
                LockoutUntil   = NULL
            WHERE UserSno  = @UserSno
              AND Row_Ver   = CONVERT(VARBINARY(8), @CurrentRowVer, 1);
            IF @@ROWCOUNT = 0 RAISERROR('Concurrency Error or Record Not Found', 16, 1);
        END

        SELECT
            @UserSno  AS RetSno,
            'Success' AS Status,
            CASE @Action WHEN 2 THEN 'Deactivated' WHEN 3 THEN 'Password changed' ELSE 'Saved' END AS Message,
            (SELECT CONVERT(NVARCHAR(MAX), CONVERT(VARBINARY(8), Row_Ver), 1)
             FROM dbo.Users WHERE UserSno = @UserSno) AS CurrentRowVer;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-- ============================================================
-- Sp_GetUsers  (never returns PasswordHash)
-- @UserSno = 0  →  return all users for the client
-- ============================================================
CREATE OR ALTER PROCEDURE dbo.Sp_GetUsers
    @ClientSno INT,
    @UserSno   INT = 0
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        u.UserSno,
        u.User_Name,
        u.Email,
        u.Role,
        u.IsActive,
        u.MustChangePwd,
        u.FailedAttempts,
        u.LastLoginDate,
        u.CreateDate,
        CONVERT(NVARCHAR(MAX), CONVERT(VARBINARY(8), u.Row_Ver), 1) AS CurrentRowVer
    FROM dbo.Users u
    WHERE (u.ClientSno = @ClientSno OR u.ClientSno IS NULL)
      AND (@UserSno    = 0 OR u.UserSno = @UserSno)
    ORDER BY u.User_Name;
END;
GO

PRINT '03_sp_auth.sql  >>>  Auth stored procedures created successfully.';
GO
