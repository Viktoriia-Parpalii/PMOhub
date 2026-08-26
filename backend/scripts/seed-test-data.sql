/*
  PMO Hub — test portfolio seed for Microsoft SQL Server.

  Preconditions:
    1. Run `npm run db:migrate` and `npm run db:seed` first.
    2. Run this only against a disposable, empty test database.

  Result:
    - 5 departments, managers, priorities, statuses, weights, sizes and custom fields;
    - 10 PROJECT initiatives with 10 cards in every quarter of 2024 (40 archived cards);
    - the same 10 project chains with active Q3 2026 cards;
    - 5 active TASK cards for Q3 2026;
    - passports, departments, custom values, checklist items, assignees and audit events.

  The bootstrap SUPER_ADMIN created by backend/.env remains the login account.
*/

SET NOCOUNT ON;
SET XACT_ABORT ON;

IF EXISTS (SELECT 1 FROM [dbo].[initiatives])
    THROW 51000, N'Test seed expects an empty portfolio. Recreate the test database before running it.', 1;

BEGIN TRANSACTION;

DECLARE @Now DATETIME2 = SYSUTCDATETIME();
DECLARE @ArchiveDate DATETIME2 = '2024-12-20T12:00:00';
DECLARE @ActorId UNIQUEIDENTIFIER = (
    SELECT TOP (1) [id] FROM [dbo].[users] WHERE [role] = 'SUPER_ADMIN' AND [is_active] = 1 ORDER BY [created_at]
);
DECLARE @ActorName NVARCHAR(200) = COALESCE((SELECT [name] FROM [dbo].[users] WHERE [id] = @ActorId), N'Тестовий імпорт');

/* Stable IDs make the dataset easy to inspect and reference in SQL. */
DECLARE @DeptStrategy UNIQUEIDENTIFIER = '10000000-0000-4000-8000-000000000001';
DECLARE @DeptDigital UNIQUEIDENTIFIER  = '10000000-0000-4000-8000-000000000002';
DECLARE @DeptOps UNIQUEIDENTIFIER      = '10000000-0000-4000-8000-000000000003';
DECLARE @DeptFinance UNIQUEIDENTIFIER  = '10000000-0000-4000-8000-000000000004';
DECLARE @DeptPeople UNIQUEIDENTIFIER   = '10000000-0000-4000-8000-000000000005';
DECLARE @Manager1 UNIQUEIDENTIFIER     = '20000000-0000-4000-8000-000000000001';
DECLARE @Manager2 UNIQUEIDENTIFIER     = '20000000-0000-4000-8000-000000000002';
DECLARE @Manager3 UNIQUEIDENTIFIER     = '20000000-0000-4000-8000-000000000003';
DECLARE @PriorityHigh UNIQUEIDENTIFIER = '30000000-0000-4000-8000-000000000001';
DECLARE @PriorityMedium UNIQUEIDENTIFIER = '30000000-0000-4000-8000-000000000002';
DECLARE @PriorityLow UNIQUEIDENTIFIER  = '30000000-0000-4000-8000-000000000003';
DECLARE @StatusGreen UNIQUEIDENTIFIER  = '40000000-0000-4000-8000-000000000001';
DECLARE @StatusYellow UNIQUEIDENTIFIER = '40000000-0000-4000-8000-000000000002';
DECLARE @StatusRed UNIQUEIDENTIFIER    = '40000000-0000-4000-8000-000000000003';
DECLARE @StatusDefault UNIQUEIDENTIFIER = '40000000-0000-4000-8000-000000000004';
DECLARE @WeightS UNIQUEIDENTIFIER      = '50000000-0000-4000-8000-000000000001';
DECLARE @WeightM UNIQUEIDENTIFIER      = '50000000-0000-4000-8000-000000000002';
DECLARE @WeightL UNIQUEIDENTIFIER      = '50000000-0000-4000-8000-000000000003';
DECLARE @SizeMedium UNIQUEIDENTIFIER   = '60000000-0000-4000-8000-000000000002';
DECLARE @ProjectField UNIQUEIDENTIFIER = '70000000-0000-4000-8000-000000000001';
DECLARE @TaskField UNIQUEIDENTIFIER    = '70000000-0000-4000-8000-000000000002';

INSERT INTO [dbo].[departments] ([id], [name], [normalized_name], [capacity_limit_points], [is_active], [created_at], [updated_at]) VALUES
(@DeptStrategy, N'Стратегія та PMO', N'стратегія та pmo', 80, 1, @Now, @Now),
(@DeptDigital, N'Цифрові продукти', N'цифрові продукти', 120, 1, @Now, @Now),
(@DeptOps, N'Операційна ефективність', N'операційна ефективність', 100, 1, @Now, @Now),
(@DeptFinance, N'Фінанси', N'фінанси', 70, 1, @Now, @Now),
(@DeptPeople, N'Люди та культура', N'люди та культура', 60, 1, @Now, @Now);

INSERT INTO [dbo].[managers] ([id], [name], [normalized_name], [department_id], [is_active], [created_at], [updated_at]) VALUES
(@Manager1, N'Олена Коваль', N'олена коваль', @DeptStrategy, 1, @Now, @Now),
(@Manager2, N'Андрій Мельник', N'андрій мельник', @DeptDigital, 1, @Now, @Now),
(@Manager3, N'Ірина Бондар', N'ірина бондар', @DeptOps, 1, @Now, @Now);

INSERT INTO [dbo].[priorities] ([id], [name], [normalized_name], [color], [is_active], [created_at], [updated_at]) VALUES
(@PriorityHigh, N'Високий', N'високий', '#e11d48', 1, @Now, @Now),
(@PriorityMedium, N'Середній', N'середній', '#f59e0b', 1, @Now, @Now),
(@PriorityLow, N'Низький', N'низький', '#2563eb', 1, @Now, @Now);

INSERT INTO [dbo].[initiative_statuses] ([id], [code], [name], [normalized_name], [color], [is_active], [created_at], [updated_at]) VALUES
(@StatusGreen, 'GREEN', N'У нормі', N'у нормі', '#16a34a', 1, @Now, @Now),
(@StatusYellow, 'YELLOW', N'Потребує уваги', N'потребує уваги', '#f59e0b', 1, @Now, @Now),
(@StatusRed, 'RED', N'Критичний', N'критичний', '#dc2626', 1, @Now, @Now),
(@StatusDefault, 'DEFAULT', N'Не визначено', N'не визначено', '#64748b', 1, @Now, @Now);

INSERT INTO [dbo].[task_weights] ([id], [name], [normalized_name], [weight], [is_active], [created_at], [updated_at]) VALUES
(@WeightS, N'S', N's', 1, 1, @Now, @Now),
(@WeightM, N'M', N'm', 2, 1, @Now, @Now),
(@WeightL, N'L', N'l', 3, 1, @Now, @Now);

INSERT INTO [dbo].[initiative_sizes] ([id], [name], [normalized_name], [min_score], [max_score], [is_active], [created_at], [updated_at]) VALUES
('60000000-0000-4000-8000-000000000001', N'Малий', N'малий', 0, 3, 1, @Now, @Now),
(@SizeMedium, N'Середній', N'середній', 3.01, 8, 1, @Now, @Now),
('60000000-0000-4000-8000-000000000003', N'Великий', N'великий', 8.01, 20, 1, @Now, @Now);

INSERT INTO [dbo].[custom_field_definitions] ([id], [entity_type], [name], [normalized_name], [field_type], [is_required], [show_in_table], [show_in_cards], [is_active], [created_at], [updated_at]) VALUES
(@ProjectField, 'project', N'Програма', N'програма', 'SELECT', 0, 1, 1, 1, @Now, @Now),
(@TaskField, 'task', N'Система-джерело', N'система-джерело', 'TEXT', 0, 1, 0, 1, @Now, @Now);

INSERT INTO [dbo].[custom_field_options] ([id], [definition_id], [value], [sort_order]) VALUES
('71000000-0000-4000-8000-000000000001', @ProjectField, N'Цифрова трансформація', 1),
('71000000-0000-4000-8000-000000000002', @ProjectField, N'Операційна досконалість', 2),
('71000000-0000-4000-8000-000000000003', @ProjectField, N'Люди та культура', 3);

/* Ten project chains. Each one has Q1–Q4 2024 cards: exactly 10 projects in every archived quarter. */
DECLARE @Number INT = 1;
WHILE @Number <= 10
BEGIN
    DECLARE @InitiativeId UNIQUEIDENTIFIER = NEWID();
    DECLARE @Year2024Id UNIQUEIDENTIFIER = NEWID();
    DECLARE @Year2026Id UNIQUEIDENTIFIER = NEWID();
    DECLARE @Annual2024 UNIQUEIDENTIFIER = NEWID();
    DECLARE @Preparation2024 UNIQUEIDENTIFIER = NEWID();
    DECLARE @Annual2026 UNIQUEIDENTIFIER = NEWID();
    DECLARE @Preparation2026 UNIQUEIDENTIFIER = NEWID();
    DECLARE @ProjectName NVARCHAR(300) = CONCAT(N'Тестовий проєкт ', FORMAT(@Number, '00'), N' — модернізація сервісу');
    DECLARE @ManagerId UNIQUEIDENTIFIER = CASE WHEN @Number % 3 = 1 THEN @Manager1 WHEN @Number % 3 = 2 THEN @Manager2 ELSE @Manager3 END;
    DECLARE @PriorityId UNIQUEIDENTIFIER = CASE WHEN @Number % 3 = 1 THEN @PriorityHigh WHEN @Number % 3 = 2 THEN @PriorityMedium ELSE @PriorityLow END;

    INSERT INTO [dbo].[initiatives] ([id], [kind], [created_at], [updated_at]) VALUES (@InitiativeId, 'PROJECT', @ArchiveDate, @Now);
    INSERT INTO [dbo].[passports] ([id], [name], [strategic_goal], [manager_id], [priority_id], [notes], [created_at], [updated_at]) VALUES
    (@Annual2024, @ProjectName, N'Покращити клієнтський досвід та операційну ефективність', @ManagerId, @PriorityId, N'Річний паспорт для архівного тестування.', @ArchiveDate, @ArchiveDate),
    (@Preparation2024, @ProjectName, N'Підготовчий етап 2024', @ManagerId, @PriorityId, N'Архівний підготовчий етап.', @ArchiveDate, @ArchiveDate),
    (@Annual2026, @ProjectName, N'Покращити клієнтський досвід та операційну ефективність', @ManagerId, @PriorityId, N'Річний паспорт поточного року.', @Now, @Now),
    (@Preparation2026, @ProjectName, N'Підготовчий етап 2026', @ManagerId, @PriorityId, N'Поточний підготовчий етап.', @Now, @Now);

    INSERT INTO [dbo].[initiative_years] ([id], [initiative_id], [year], [annual_passport_id], [preparation_passport_id], [revision], [created_at], [updated_at]) VALUES
    (@Year2024Id, @InitiativeId, 2024, @Annual2024, @Preparation2024, 2, @ArchiveDate, @ArchiveDate),
    (@Year2026Id, @InitiativeId, 2026, @Annual2026, @Preparation2026, 1, @Now, @Now);

    INSERT INTO [dbo].[passport_departments] ([passport_id], [department_id], [involvement]) VALUES
    (@Annual2024, @DeptDigital, 'IMPLEMENTER'), (@Annual2024, @DeptStrategy, 'CROSS_FUNCTIONAL'),
    (@Annual2026, @DeptDigital, 'IMPLEMENTER'), (@Annual2026, @DeptStrategy, 'CROSS_FUNCTIONAL');
    INSERT INTO [dbo].[custom_field_values] ([id], [definition_id], [passport_id], [text_value], [number_value], [boolean_value]) VALUES
    (NEWID(), @ProjectField, @Annual2024, CASE WHEN @Number % 2 = 0 THEN N'Цифрова трансформація' ELSE N'Операційна досконалість' END, NULL, NULL),
    (NEWID(), @ProjectField, @Annual2026, N'Цифрова трансформація', NULL, NULL);

    DECLARE @QuarterNo INT = 1;
    WHILE @QuarterNo <= 4
    BEGIN
        DECLARE @Quarter CHAR(2) = CONCAT('Q', @QuarterNo);
        DECLARE @CardPassport UNIQUEIDENTIFIER = NEWID();
        DECLARE @CardId UNIQUEIDENTIFIER = NEWID();
        DECLARE @CardStatus UNIQUEIDENTIFIER = CASE WHEN @QuarterNo = 1 THEN @StatusGreen WHEN @QuarterNo = 2 THEN @StatusGreen WHEN @QuarterNo = 3 THEN @StatusYellow ELSE @StatusRed END;
        INSERT INTO [dbo].[passports] ([id], [name], [strategic_goal], [manager_id], [priority_id], [notes], [created_at], [updated_at]) VALUES
        (@CardPassport, @ProjectName, N'Покращити клієнтський досвід та операційну ефективність', @ManagerId, @PriorityId, CONCAT(N'Архівна картка 2024 ', @Quarter), @ArchiveDate, @ArchiveDate);
        INSERT INTO [dbo].[passport_departments] ([passport_id], [department_id], [involvement]) VALUES (@CardPassport, @DeptDigital, 'IMPLEMENTER'), (@CardPassport, @DeptStrategy, 'CROSS_FUNCTIONAL');
        INSERT INTO [dbo].[quarter_cards] ([id], [initiative_year_id], [passport_id], [quarter], [status_id], [size_definition_id], [size_snapshot_name], [size_snapshot_weight], [revision], [created_at], [updated_at]) VALUES
        (@CardId, @Year2024Id, @CardPassport, @Quarter, @CardStatus, @SizeMedium, N'Середній', 6, 2, @ArchiveDate, @ArchiveDate);

        INSERT INTO [dbo].[checklist_items] ([id], [card_id], [text], [is_completed], [status_id], [weight_definition_id], [weight_snapshot_name], [weight_snapshot_value], [revision], [created_at], [updated_at]) VALUES
        (NEWID(), @CardId, N'Проаналізувати потреби та затвердити рішення', 1, @StatusGreen, @WeightM, N'M', 2, 1, @ArchiveDate, @ArchiveDate),
        (NEWID(), @CardId, N'Впровадити зміни в цільовий сервіс', CASE WHEN @QuarterNo < 4 THEN 1 ELSE 0 END, @CardStatus, @WeightL, N'L', 3, 1, @ArchiveDate, @ArchiveDate),
        (NEWID(), @CardId, N'Провести контроль якості та підготувати звіт', CASE WHEN @QuarterNo < 3 THEN 1 ELSE 0 END, @CardStatus, @WeightS, N'S', 1, 1, @ArchiveDate, @ArchiveDate);
        SET @QuarterNo += 1;
    END;

    /* Open Q3 2026 card makes move, continue, edit and capacity tests possible. */
    DECLARE @CurrentPassport UNIQUEIDENTIFIER = NEWID();
    DECLARE @CurrentCard UNIQUEIDENTIFIER = NEWID();
    INSERT INTO [dbo].[passports] ([id], [name], [strategic_goal], [manager_id], [priority_id], [notes], [created_at], [updated_at]) VALUES
    (@CurrentPassport, @ProjectName, N'Покращити клієнтський досвід та операційну ефективність', @ManagerId, @PriorityId, N'Активна картка для сценаріїв перенесення та продовження.', @Now, @Now);
    INSERT INTO [dbo].[passport_departments] ([passport_id], [department_id], [involvement]) VALUES (@CurrentPassport, @DeptDigital, 'IMPLEMENTER'), (@CurrentPassport, @DeptOps, 'CROSS_FUNCTIONAL');
    INSERT INTO [dbo].[quarter_cards] ([id], [initiative_year_id], [passport_id], [quarter], [status_id], [size_definition_id], [size_snapshot_name], [size_snapshot_weight], [revision], [created_at], [updated_at]) VALUES
    (@CurrentCard, @Year2026Id, @CurrentPassport, 'Q3', CASE WHEN @Number % 3 = 0 THEN @StatusYellow ELSE @StatusGreen END, @SizeMedium, N'Середній', 6, 1, @Now, @Now);
    DECLARE @CurrentItem UNIQUEIDENTIFIER = NEWID();
    INSERT INTO [dbo].[checklist_items] ([id], [card_id], [text], [is_completed], [status_id], [weight_definition_id], [weight_snapshot_name], [weight_snapshot_value], [revision], [created_at], [updated_at]) VALUES
    (@CurrentItem, @CurrentCard, N'Налаштувати процес та виконати контрольну перевірку', 0, @StatusDefault, @WeightL, N'L', 3, 1, @Now, @Now),
    (NEWID(), @CurrentCard, N'Підготувати комунікацію для стейкхолдерів', 0, @StatusDefault, @WeightM, N'M', 2, 1, @Now, @Now),
    (NEWID(), @CurrentCard, N'Підтвердити результат у звіті', 0, @StatusDefault, @WeightS, N'S', 1, 1, @Now, @Now);
    INSERT INTO [dbo].[checklist_item_departments] ([checklist_item_id], [department_id]) VALUES (@CurrentItem, @DeptDigital);
    IF @ActorId IS NOT NULL INSERT INTO [dbo].[checklist_item_assignees] ([checklist_item_id], [user_id]) VALUES (@CurrentItem, @ActorId);
    INSERT INTO [dbo].[audit_events] ([id], [aggregate_type], [aggregate_id], [action_code], [message], [actor_user_id], [actor_name], [target_year], [target_quarter], [occurred_at]) VALUES
    (NEWID(), 'QUARTER_CARD', @CurrentCard, 'TEST_DATA_CREATED', N'Створено активну тестову картку', @ActorId, @ActorName, 2026, 'Q3', @Now);
    SET @Number += 1;
END;

/* Five active operational TASK records for testing a separate portfolio type. */
SET @Number = 1;
WHILE @Number <= 5
BEGIN
    DECLARE @TaskInitiative UNIQUEIDENTIFIER = NEWID();
    DECLARE @TaskYear UNIQUEIDENTIFIER = NEWID();
    DECLARE @TaskAnnual UNIQUEIDENTIFIER = NEWID();
    DECLARE @TaskPreparation UNIQUEIDENTIFIER = NEWID();
    DECLARE @TaskCardPassport UNIQUEIDENTIFIER = NEWID();
    DECLARE @TaskCard UNIQUEIDENTIFIER = NEWID();
    DECLARE @TaskName NVARCHAR(300) = CONCAT(N'Операційна задача ', FORMAT(@Number, '00'), N' — контроль сервісу');
    INSERT INTO [dbo].[initiatives] ([id], [kind], [created_at], [updated_at]) VALUES (@TaskInitiative, 'TASK', @Now, @Now);
    INSERT INTO [dbo].[passports] ([id], [name], [strategic_goal], [manager_id], [priority_id], [notes], [created_at], [updated_at]) VALUES
    (@TaskAnnual, @TaskName, N'Підтримувати якість операційних сервісів', @Manager3, @PriorityMedium, N'Річний паспорт задачі.', @Now, @Now),
    (@TaskPreparation, @TaskName, N'Підготовчий етап задачі', @Manager3, @PriorityMedium, N'Підготовчі роботи.', @Now, @Now),
    (@TaskCardPassport, @TaskName, N'Підтримувати якість операційних сервісів', @Manager3, @PriorityMedium, N'Активна операційна картка.', @Now, @Now);
    INSERT INTO [dbo].[initiative_years] ([id], [initiative_id], [year], [annual_passport_id], [preparation_passport_id], [revision], [created_at], [updated_at]) VALUES (@TaskYear, @TaskInitiative, 2026, @TaskAnnual, @TaskPreparation, 1, @Now, @Now);
    INSERT INTO [dbo].[passport_departments] ([passport_id], [department_id], [involvement]) VALUES (@TaskCardPassport, @DeptOps, 'IMPLEMENTER');
    INSERT INTO [dbo].[custom_field_values] ([id], [definition_id], [passport_id], [text_value], [number_value], [boolean_value]) VALUES (NEWID(), @TaskField, @TaskCardPassport, N'PMO Test Service', NULL, NULL);
    INSERT INTO [dbo].[quarter_cards] ([id], [initiative_year_id], [passport_id], [quarter], [status_id], [size_definition_id], [size_snapshot_name], [size_snapshot_weight], [revision], [created_at], [updated_at]) VALUES (@TaskCard, @TaskYear, @TaskCardPassport, 'Q3', @StatusYellow, @SizeMedium, N'Середній', 3, 1, @Now, @Now);
    INSERT INTO [dbo].[checklist_items] ([id], [card_id], [text], [is_completed], [status_id], [weight_definition_id], [weight_snapshot_name], [weight_snapshot_value], [revision], [created_at], [updated_at]) VALUES
    (NEWID(), @TaskCard, N'Перевірити SLA та критичні інциденти', 0, @StatusYellow, @WeightM, N'M', 2, 1, @Now, @Now),
    (NEWID(), @TaskCard, N'Оновити операційний журнал', 1, @StatusGreen, @WeightS, N'S', 1, 1, @Now, @Now);
    SET @Number += 1;
END;

IF (SELECT COUNT(*) FROM [dbo].[quarter_cards] qc JOIN [dbo].[initiative_years] iy ON iy.[id] = qc.[initiative_year_id] JOIN [dbo].[initiatives] i ON i.[id] = iy.[initiative_id] WHERE i.[kind] = 'PROJECT' AND iy.[year] = 2024 AND qc.[quarter] = 'Q1') <> 10
    THROW 51001, N'Validation failed: Q1 2024 must contain exactly 10 projects.', 1;
IF (SELECT COUNT(*) FROM [dbo].[quarter_cards] qc JOIN [dbo].[initiative_years] iy ON iy.[id] = qc.[initiative_year_id] JOIN [dbo].[initiatives] i ON i.[id] = iy.[initiative_id] WHERE i.[kind] = 'PROJECT' AND iy.[year] = 2024 AND qc.[quarter] = 'Q2') <> 10
    THROW 51002, N'Validation failed: Q2 2024 must contain exactly 10 projects.', 1;
IF (SELECT COUNT(*) FROM [dbo].[quarter_cards] qc JOIN [dbo].[initiative_years] iy ON iy.[id] = qc.[initiative_year_id] JOIN [dbo].[initiatives] i ON i.[id] = iy.[initiative_id] WHERE i.[kind] = 'PROJECT' AND iy.[year] = 2024 AND qc.[quarter] = 'Q3') <> 10
    THROW 51003, N'Validation failed: Q3 2024 must contain exactly 10 projects.', 1;
IF (SELECT COUNT(*) FROM [dbo].[quarter_cards] qc JOIN [dbo].[initiative_years] iy ON iy.[id] = qc.[initiative_year_id] JOIN [dbo].[initiatives] i ON i.[id] = iy.[initiative_id] WHERE i.[kind] = 'PROJECT' AND iy.[year] = 2024 AND qc.[quarter] = 'Q4') <> 10
    THROW 51004, N'Validation failed: Q4 2024 must contain exactly 10 projects.', 1;

COMMIT TRANSACTION;

SELECT iy.[year], qc.[quarter], i.[kind], COUNT(*) AS [cards]
FROM [dbo].[quarter_cards] qc
JOIN [dbo].[initiative_years] iy ON iy.[id] = qc.[initiative_year_id]
JOIN [dbo].[initiatives] i ON i.[id] = iy.[initiative_id]
GROUP BY iy.[year], qc.[quarter], i.[kind]
ORDER BY iy.[year], qc.[quarter], i.[kind];
