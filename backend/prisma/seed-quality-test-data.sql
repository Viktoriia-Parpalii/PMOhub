/*
  PMO Hub — якісний набір тестових даних для SQL Server.

  Передумови:
  1. Виконана initial migration 20260824190000_initial.
  2. Бізнес-таблиці й користувацькі довідники порожні.
  3. Системні DEFAULT status/weight можуть уже існувати.

  Тестовий пароль усіх створених користувачів: PmoHub.Test.2026!
  Скрипт не видаляє дані й навмисно відмовляється від повторного запуску.
*/

SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRY
  BEGIN TRANSACTION;

  IF EXISTS (SELECT 1 FROM [dbo].[initiatives])
    THROW 51000, N'Тестові дані не завантажено: таблиця initiatives не порожня.', 1;
  IF EXISTS (SELECT 1 FROM [dbo].[departments])
    THROW 51001, N'Тестові дані не завантажено: довідники вже містять дані.', 1;
  IF EXISTS (SELECT 1 FROM [dbo].[card_status_definitions] WHERE [code] <> 'DEFAULT')
    THROW 51002, N'Тестові дані не завантажено: статуси вже містять користувацькі записи.', 1;
  IF EXISTS (SELECT 1 FROM [dbo].[task_weight_definitions] WHERE [is_system] = 0)
    THROW 51003, N'Тестові дані не завантажено: ваги вже містять користувацькі записи.', 1;

  DECLARE @Now DATETIME2 = SYSUTCDATETIME();
  DECLARE @TestPasswordHash NVARCHAR(500) = N'$argon2id$v=19$m=65536,p=4,t=3$QiclrUveY/OnXr8c44zzzw$6O7SQMhM/TviAZyKibR3UMSqqOYXA5HBjgM88PnAd+k';

  /* Системні ролі вже створює initial migration; MERGE робить quality seed самодостатнім. */
  MERGE [dbo].[roles] AS target
  USING (VALUES
    ('SUPER_ADMIN',N'Супер адміністратор',1,0,1),
    ('ADMIN',N'Адміністратор',1,0,1),
    ('USER',N'Користувач',1,1,1)
  ) AS source([code],[name],[is_system],[is_default],[is_active])
  ON target.[code] = source.[code]
  WHEN MATCHED THEN UPDATE SET
    [name] = source.[name],
    [is_system] = source.[is_system],
    [is_default] = source.[is_default],
    [is_active] = source.[is_active],
    [updated_at] = @Now
  WHEN NOT MATCHED THEN INSERT
    ([code],[name],[is_system],[is_default],[is_active],[created_at],[updated_at])
  VALUES
    (source.[code],source.[name],source.[is_system],source.[is_default],source.[is_active],@Now,@Now);

  /* RBAC */
  MERGE [dbo].[role_permissions] AS target
  USING (VALUES
    ('SUPER_ADMIN',1,1,1,0,1),
    ('ADMIN',1,1,1,0,0),
    ('USER',0,0,0,1,0)
  ) AS source([role],[can_edit],[can_delete],[can_admin],[read_only],[can_archive])
  ON target.[role] = source.[role]
  WHEN MATCHED THEN UPDATE SET
    [can_create_edit_initiatives] = source.[can_edit],
    [can_delete_initiatives] = source.[can_delete],
    [can_access_admin] = source.[can_admin],
    [is_read_only] = source.[read_only],
    [can_edit_archive] = source.[can_archive]
  WHEN NOT MATCHED THEN INSERT
    ([role],[can_create_edit_initiatives],[can_delete_initiatives],[can_access_admin],[is_read_only],[can_edit_archive])
  VALUES
    (source.[role],source.[can_edit],source.[can_delete],source.[can_admin],source.[read_only],source.[can_archive]);

  /* 15 підрозділів */
  CREATE TABLE #Departments ([rn] INT PRIMARY KEY, [id] UNIQUEIDENTIFIER NOT NULL, [name] NVARCHAR(200), [capacity] DECIMAL(12,2));
  INSERT INTO #Departments ([rn],[id],[name],[capacity]) VALUES
    (1,'10000000-0000-4000-8000-000000000001',N'ІТ та розробка',120),
    (2,'10000000-0000-4000-8000-000000000002',N'Дані та аналітика',85),
    (3,'10000000-0000-4000-8000-000000000003',N'Фінанси',70),
    (4,'10000000-0000-4000-8000-000000000004',N'Юридичний департамент',45),
    (5,'10000000-0000-4000-8000-000000000005',N'Маркетинг і комунікації',65),
    (6,'10000000-0000-4000-8000-000000000006',N'Продажі B2B',90),
    (7,'10000000-0000-4000-8000-000000000007',N'Клієнтська підтримка',80),
    (8,'10000000-0000-4000-8000-000000000008',N'HR та рекрутинг',55),
    (9,'10000000-0000-4000-8000-000000000009',N'Операційна ефективність',75),
    (10,'10000000-0000-4000-8000-000000000010',N'Закупівлі',50),
    (11,'10000000-0000-4000-8000-000000000011',N'Інформаційна безпека',60),
    (12,'10000000-0000-4000-8000-000000000012',N'Продуктовий офіс',95),
    (13,'10000000-0000-4000-8000-000000000013',N'Стратегія та трансформація',70),
    (14,'10000000-0000-4000-8000-000000000014',N'Внутрішній аудит',40),
    (15,'10000000-0000-4000-8000-000000000015',N'Адміністративна підтримка',45);

  INSERT INTO [dbo].[departments]
    ([id],[name],[normalized_name],[capacity_limit_points],[is_active],[created_at],[updated_at])
  SELECT [id],[name],LOWER([name]),[capacity],1,@Now,@Now FROM #Departments;

  /* 30 менеджерів, останні 5 неактивні */
  CREATE TABLE #ManagerNames ([rn] INT IDENTITY(1,1) PRIMARY KEY, [name] NVARCHAR(200));
  INSERT INTO #ManagerNames ([name]) VALUES
    (N'Олексій Шевченко'),(N'Марія Бондаренко'),(N'Дмитро Ткаченко'),(N'Ірина Коваль'),(N'Андрій Мельник'),
    (N'Наталія Бойко'),(N'Сергій Кравченко'),(N'Олена Романюк'),(N'Віктор Савчук'),(N'Юлія Мороз'),
    (N'Максим Поліщук'),(N'Катерина Левченко'),(N'Роман Іваненко'),(N'Тетяна Марченко'),(N'Богдан Лисенко'),
    (N'Анна Гриценко'),(N'Владислав Олійник'),(N'Софія Петренко'),(N'Михайло Козак'),(N'Дарина Павленко'),
    (N'Євген Сидоренко'),(N'Валерія Тимошенко'),(N'Артур Кучеренко'),(N'Лілія Федоренко'),(N'Павло Дорошенко'),
    (N'Оксана Яремчук'),(N'Ігор Назаренко'),(N'Аліна Семенюк'),(N'Василь Руденко'),(N'Ніна Черненко');

  INSERT INTO [dbo].[managers]
    ([id],[name],[normalized_name],[department_id],[is_active],[created_at],[updated_at])
  SELECT
    CONVERT(UNIQUEIDENTIFIER,'20000000-0000-4000-8000-' + RIGHT('000000000000' + CONVERT(VARCHAR(12),m.[rn]),12)),
    m.[name],LOWER(m.[name]),d.[id],CASE WHEN m.[rn] > 25 THEN 0 ELSE 1 END,@Now,@Now
  FROM #ManagerNames m
  JOIN #Departments d ON d.[rn] = 1 + ((m.[rn] - 1) % 15);

  /* 4 пріоритети */
  INSERT INTO [dbo].[priorities]
    ([id],[name],[normalized_name],[color],[is_active],[created_at],[updated_at]) VALUES
    ('30000000-0000-4000-8000-000000000001',N'Критичний',N'критичний','#E11D48',1,@Now,@Now),
    ('30000000-0000-4000-8000-000000000002',N'Високий',N'високий','#F97316',1,@Now,@Now),
    ('30000000-0000-4000-8000-000000000003',N'Середній',N'середній','#EAB308',1,@Now,@Now),
    ('30000000-0000-4000-8000-000000000004',N'Низький',N'низький','#6366F1',1,@Now,@Now);

  /* 5 статусів загалом, включно із системним DEFAULT */
  UPDATE [dbo].[card_status_definitions]
  SET [name]=N'Без статусу',[normalized_name]=N'без статусу',[color]='#94A3B8',[is_active]=1,[is_system]=1,[updated_at]=@Now
  WHERE [code]='DEFAULT';
  INSERT INTO [dbo].[card_status_definitions]
    ([id],[code],[name],[normalized_name],[color],[is_active],[is_system],[created_at],[updated_at]) VALUES
    ('40000000-0000-4000-8000-000000000002','GREEN',N'Виконано',N'виконано','#10B981',1,0,@Now,@Now),
    ('40000000-0000-4000-8000-000000000003','YELLOW',N'В процесі',N'в процесі','#F59E0B',1,0,@Now,@Now),
    ('40000000-0000-4000-8000-000000000004','RED',N'На паузі / блоковано',N'на паузі / блоковано','#F43F5E',1,0,@Now,@Now),
    ('40000000-0000-4000-8000-000000000005','BLUE',N'Заплановано',N'заплановано','#3B82F6',1,0,@Now,@Now);

  /* 6 значень ваги загалом: системні 0 та п'ять бізнес-ваг */
  UPDATE [dbo].[task_weight_definitions]
  SET [name]=N'Не визначено',[normalized_name]=N'не визначено',[weight]=0,[is_default]=1,[is_system]=1,[is_active]=1,[updated_at]=@Now
  WHERE [id]='00000000-0000-4000-8000-000000000002';
  INSERT INTO [dbo].[task_weight_definitions]
    ([id],[name],[normalized_name],[weight],[is_default],[is_system],[is_active],[created_at],[updated_at]) VALUES
    ('50000000-0000-4000-8000-000000000002',N'Дуже мала',N'дуже мала',1,0,0,1,@Now,@Now),
    ('50000000-0000-4000-8000-000000000003',N'Мала',N'мала',2,0,0,1,@Now,@Now),
    ('50000000-0000-4000-8000-000000000004',N'Середня',N'середня',3,0,0,1,@Now,@Now),
    ('50000000-0000-4000-8000-000000000005',N'Велика',N'велика',5,0,0,1,@Now,@Now),
    ('50000000-0000-4000-8000-000000000006',N'Дуже велика',N'дуже велика',8,0,0,1,@Now,@Now);

  /* 6 непересічних діапазонів розміру */
  INSERT INTO [dbo].[initiative_size_definitions]
    ([id],[name],[normalized_name],[min_score],[max_score],[is_active],[created_at],[updated_at]) VALUES
    ('60000000-0000-4000-8000-000000000001',N'Без розміру',N'без розміру',0,0,1,@Now,@Now),
    ('60000000-0000-4000-8000-000000000002',N'XS',N'xs',0.01,10,1,@Now,@Now),
    ('60000000-0000-4000-8000-000000000003',N'S',N's',10.01,25,1,@Now,@Now),
    ('60000000-0000-4000-8000-000000000004',N'M',N'm',25.01,50,1,@Now,@Now),
    ('60000000-0000-4000-8000-000000000005',N'L',N'l',50.01,100,1,@Now,@Now),
    ('60000000-0000-4000-8000-000000000006',N'XL',N'xl',100.01,9999,1,@Now,@Now);

  /* 12 custom fields для проєктів і 12 для операційних задач */
  CREATE TABLE #FieldSeed (
    [rn] INT,[id] UNIQUEIDENTIFIER,[entity_type] VARCHAR(16),[name] NVARCHAR(200),[field_type] VARCHAR(16),
    [is_required] BIT,[is_active] BIT,[show_table] BIT,[show_cards] BIT
  );
  INSERT INTO #FieldSeed VALUES
    (1,'70000000-0000-4000-8000-000000000001','project',N'Бюджет, тис. грн','NUMBER',0,1,1,0),
    (2,'70000000-0000-4000-8000-000000000002','project',N'Спонсор ініціативи','TEXT',0,1,1,1),
    (3,'70000000-0000-4000-8000-000000000003','project',N'Рівень ризику','SELECT',0,1,1,1),
    (4,'70000000-0000-4000-8000-000000000004','project',N'Регуляторна вимога','CHECKBOX',0,1,0,1),
    (5,'70000000-0000-4000-8000-000000000005','project',N'Очікуваний бізнес-ефект','RICHTEXT',0,1,0,1),
    (6,'70000000-0000-4000-8000-000000000006','project',N'Модель реалізації','SELECT',0,1,1,0),
    (7,'70000000-0000-4000-8000-000000000007','project',N'Цільові користувачі','NUMBER',0,1,1,0),
    (8,'70000000-0000-4000-8000-000000000008','project',N'Класифікація даних','SELECT',0,1,0,1),
    (9,'70000000-0000-4000-8000-000000000009','project',N'Зовнішній постачальник','CHECKBOX',0,1,1,1),
    (10,'70000000-0000-4000-8000-000000000010','project',N'Власник бізнес-процесу','TEXT',0,1,0,0),
    (11,'70000000-0000-4000-8000-000000000011','project',N'Ключові залежності','RICHTEXT',0,1,0,1),
    (12,'70000000-0000-4000-8000-000000000012','project',N'Тип вигоди','SELECT',1,0,1,0),
    (1,'70000000-0000-4000-8000-000000000013','task',N'SLA, годин','NUMBER',0,1,1,1),
    (2,'70000000-0000-4000-8000-000000000014','task',N'Інформаційна система','TEXT',0,1,1,1),
    (3,'70000000-0000-4000-8000-000000000015','task',N'Критичність сервісу','SELECT',0,1,1,1),
    (4,'70000000-0000-4000-8000-000000000016','task',N'Можлива автоматизація','CHECKBOX',0,1,0,1),
    (5,'70000000-0000-4000-8000-000000000017','task',N'Очікуваний результат','RICHTEXT',0,1,0,1),
    (6,'70000000-0000-4000-8000-000000000018','task',N'Періодичність','SELECT',0,1,1,0),
    (7,'70000000-0000-4000-8000-000000000019','task',N'Місячний обсяг','NUMBER',0,1,1,0),
    (8,'70000000-0000-4000-8000-000000000020','task',N'Власник процесу','TEXT',0,1,0,0),
    (9,'70000000-0000-4000-8000-000000000021','task',N'Потребує контролю','CHECKBOX',0,1,1,1),
    (10,'70000000-0000-4000-8000-000000000022','task',N'Канал обслуговування','SELECT',0,1,0,1),
    (11,'70000000-0000-4000-8000-000000000023','task',N'Інструкції підтримки','RICHTEXT',0,1,0,1),
    (12,'70000000-0000-4000-8000-000000000024','task',N'Категорія сервісу','SELECT',1,0,1,0);

  INSERT INTO [dbo].[custom_field_definitions]
    ([id],[name],[normalized_name],[entity_type],[field_type],[is_required],[is_active],[show_in_table],[show_in_cards],[created_at],[updated_at])
  SELECT [id],[name],LOWER([name]),[entity_type],[field_type],[is_required],[is_active],[show_table],[show_cards],@Now,@Now FROM #FieldSeed;

  CREATE TABLE #OptionSeed ([definition_id] UNIQUEIDENTIFIER,[sort_order] INT,[value] NVARCHAR(200));
  INSERT INTO #OptionSeed VALUES
    ('70000000-0000-4000-8000-000000000003',1,N'Низький'),('70000000-0000-4000-8000-000000000003',2,N'Середній'),('70000000-0000-4000-8000-000000000003',3,N'Високий'),('70000000-0000-4000-8000-000000000003',4,N'Критичний'),
    ('70000000-0000-4000-8000-000000000006',1,N'Власними силами'),('70000000-0000-4000-8000-000000000006',2,N'Аутсорсинг'),('70000000-0000-4000-8000-000000000006',3,N'Змішана'),
    ('70000000-0000-4000-8000-000000000008',1,N'Публічні'),('70000000-0000-4000-8000-000000000008',2,N'Внутрішні'),('70000000-0000-4000-8000-000000000008',3,N'Конфіденційні'),
    ('70000000-0000-4000-8000-000000000012',1,N'Фінансова'),('70000000-0000-4000-8000-000000000012',2,N'Клієнтська'),('70000000-0000-4000-8000-000000000012',3,N'Операційна'),
    ('70000000-0000-4000-8000-000000000015',1,N'Низька'),('70000000-0000-4000-8000-000000000015',2,N'Середня'),('70000000-0000-4000-8000-000000000015',3,N'Висока'),
    ('70000000-0000-4000-8000-000000000018',1,N'Щоденно'),('70000000-0000-4000-8000-000000000018',2,N'Щотижня'),('70000000-0000-4000-8000-000000000018',3,N'Щомісяця'),('70000000-0000-4000-8000-000000000018',4,N'За потреби'),
    ('70000000-0000-4000-8000-000000000022',1,N'Email'),('70000000-0000-4000-8000-000000000022',2,N'Портал'),('70000000-0000-4000-8000-000000000022',3,N'Телефон'),
    ('70000000-0000-4000-8000-000000000024',1,N'Бізнес-сервіс'),('70000000-0000-4000-8000-000000000024',2,N'Технічний сервіс'),('70000000-0000-4000-8000-000000000024',3,N'Адміністративний сервіс');

  INSERT INTO [dbo].[custom_field_options] ([id],[definition_id],[value],[sort_order],[is_active])
  SELECT NEWID(),[definition_id],[value],[sort_order],1 FROM #OptionSeed;

  /* 55 користувачів. Наявний bootstrap admin, якщо є, зберігається. */
  CREATE TABLE #FirstNames ([rn] INT PRIMARY KEY,[name] NVARCHAR(50));
  INSERT INTO #FirstNames VALUES (1,N'Анастасія'),(2,N'Богдан'),(3,N'Вікторія'),(4,N'Ганна'),(5,N'Денис'),(6,N'Єлизавета'),(7,N'Іван'),(8,N'Карина'),(9,N'Леонід'),(10,N'Марина'),(11,N'Олег');
  CREATE TABLE #LastNames ([rn] INT PRIMARY KEY,[name] NVARCHAR(70));
  INSERT INTO #LastNames VALUES (1,N'Клименко'),(2,N'Рибак'),(3,N'Захаренко'),(4,N'Вовк'),(5,N'Пономаренко');

  ;WITH UserNames AS (
    SELECT ROW_NUMBER() OVER (ORDER BY f.[rn],l.[rn]) [rn],f.[name] + N' ' + l.[name] [name]
    FROM #FirstNames f CROSS JOIN #LastNames l
  )
  INSERT INTO [dbo].[users]
    ([id],[name],[email],[normalized_email],[password_hash],[role],[department_id],[is_active],[must_change_password],[created_at],[updated_at])
  SELECT
    CONVERT(UNIQUEIDENTIFIER,'80000000-0000-4000-8000-' + RIGHT('000000000000' + CONVERT(VARCHAR(12),u.[rn]),12)),
    u.[name],
    CONCAT('qa.user',RIGHT('000' + CONVERT(VARCHAR(3),u.[rn]),3),'@pmohub.test'),
    CONCAT('qa.user',RIGHT('000' + CONVERT(VARCHAR(3),u.[rn]),3),'@pmohub.test'),
    @TestPasswordHash,
    CASE WHEN u.[rn]=1 THEN 'SUPER_ADMIN' WHEN u.[rn] BETWEEN 2 AND 5 THEN 'ADMIN' ELSE 'USER' END,
    d.[id],CASE WHEN u.[rn] > 50 THEN 0 ELSE 1 END,0,@Now,@Now
  FROM UserNames u JOIN #Departments d ON d.[rn] = 1 + ((u.[rn]-1) % 15);

  /* 80 глобальних ініціатив: 55 проєктів + 25 операційних задач. */
  CREATE TABLE #Roots (
    [initiative_id] UNIQUEIDENTIFIER PRIMARY KEY,[global_no] INT,[local_no] INT,[kind] VARCHAR(32),[name] NVARCHAR(500)
  );
  CREATE TABLE #ProjectActions ([rn] INT,[name] NVARCHAR(80));
  INSERT INTO #ProjectActions VALUES (1,N'Модернізація'),(2,N'Впровадження'),(3,N'Автоматизація'),(4,N'Розвиток'),(5,N'Оптимізація');
  CREATE TABLE #ProjectThemes ([rn] INT,[name] NVARCHAR(200));
  INSERT INTO #ProjectThemes VALUES
    (1,N'клієнтського порталу'),(2,N'платформи даних'),(3,N'фінансового планування'),(4,N'омніканальних продажів'),(5,N'управління персоналом'),
    (6,N'контролю інформаційної безпеки'),(7,N'ланцюга закупівель'),(8,N'системи управлінської звітності'),(9,N'процесу підтримки клієнтів'),(10,N'продуктового каталогу'),(11,N'корпоративної інтеграційної платформи');
  INSERT INTO #Roots
  SELECT NEWID(),ROW_NUMBER() OVER (ORDER BY a.[rn],t.[rn]),ROW_NUMBER() OVER (ORDER BY a.[rn],t.[rn]),'PROJECT',a.[name] + N' ' + t.[name]
  FROM #ProjectActions a CROSS JOIN #ProjectThemes t;

  CREATE TABLE #TaskNames ([rn] INT IDENTITY(1,1),[name] NVARCHAR(500));
  INSERT INTO #TaskNames ([name]) VALUES
    (N'Щомісячне закриття фінансового періоду'),(N'Підтримка корпоративного порталу'),(N'Обробка звернень ключових клієнтів'),(N'Моніторинг інформаційної безпеки'),(N'Актуалізація каталогу послуг'),
    (N'Контроль виконання договорів'),(N'Підготовка управлінської звітності'),(N'Адміністрування доступів користувачів'),(N'Планування закупівель'),(N'Підтримка процесу адаптації персоналу'),
    (N'Ведення реєстру ризиків'),(N'Контроль якості даних'),(N'Опрацювання юридичних запитів'),(N'Проведення внутрішніх аудитів'),(N'Координація маркетингових кампаній'),
    (N'Супровід інтеграційних сервісів'),(N'Моніторинг SLA постачальників'),(N'Аналіз клієнтського досвіду'),(N'Підготовка квартального прогнозу'),(N'Управління інцидентами'),
    (N'Контроль резервного копіювання'),(N'Підтримка довідників продуктів'),(N'Розрахунок мотиваційних показників'),(N'Перевірка регуляторної звітності'),(N'Координація операційного комітету');
  INSERT INTO #Roots SELECT NEWID(),55+[rn],[rn],'OPERATIONAL_TASK',[name] FROM #TaskNames;

  INSERT INTO [dbo].[initiatives] ([id],[kind],[name],[revision],[created_at],[updated_at])
  SELECT [initiative_id],[kind],[name],1,DATEFROMPARTS(2016,1,1),@Now FROM #Roots;

  /* По 55 проєктів і 25 задач у кожному році 2016–2027. */
  CREATE TABLE #YearPlan (
    [year_id] UNIQUEIDENTIFIER PRIMARY KEY,[initiative_id] UNIQUEIDENTIFIER,[global_no] INT,[local_no] INT,[kind] VARCHAR(32),[year] INT,
    [manager_id] UNIQUEIDENTIFIER NULL,[priority_id] UNIQUEIDENTIFIER NULL,[card_count] INT
  );
  DECLARE @Year INT = 2016;
  WHILE @Year <= 2027
  BEGIN
    INSERT INTO #YearPlan
    SELECT
      NEWID(),r.[initiative_id],r.[global_no],r.[local_no],r.[kind],@Year,
      CASE
        WHEN r.[global_no]=1 THEN NULL
        WHEN r.[global_no] IN (2,3) THEN CONVERT(UNIQUEIDENTIFIER,'20000000-0000-4000-8000-' + RIGHT('000000000000' + CONVERT(VARCHAR(12),24+r.[global_no]),12))
        ELSE CONVERT(UNIQUEIDENTIFIER,'20000000-0000-4000-8000-' + RIGHT('000000000000' + CONVERT(VARCHAR(12),1+((r.[global_no]+@Year)%25)),12))
      END,
      CASE WHEN r.[global_no] IN (1,2) THEN NULL ELSE CONVERT(UNIQUEIDENTIFIER,'30000000-0000-4000-8000-00000000000' + CONVERT(VARCHAR(1),1+((r.[global_no]+@Year)%4))) END,
      CASE
        WHEN (r.[kind]='PROJECT' AND r.[local_no] <= 11) OR (r.[kind]='OPERATIONAL_TASK' AND r.[local_no] <= 5) THEN 4
        ELSE (r.[global_no]+@Year)%4
      END
    FROM #Roots r;
    SET @Year += 1;
  END;

  INSERT INTO [dbo].[initiative_years]
    ([id],[initiative_id],[year],[strategic_goal],[revision],[created_at],[updated_at])
  SELECT
    y.[year_id],y.[initiative_id],y.[year],
    CASE WHEN y.[global_no]%10 < 7 THEN
      CASE y.[global_no]%7
        WHEN 0 THEN N'Підвищити якість клієнтського досвіду та скоротити час обслуговування'
        WHEN 1 THEN N'Зменшити операційні витрати шляхом автоматизації процесів'
        WHEN 2 THEN N'Підвищити надійність, безпеку та доступність корпоративних сервісів'
        WHEN 3 THEN N'Забезпечити кероване зростання доходу та ефективність продажів'
        WHEN 4 THEN N'Покращити якість управлінських даних і швидкість прийняття рішень'
        WHEN 5 THEN N'Посилити відповідність регуляторним вимогам і внутрішнім політикам'
        ELSE N'Розвинути цифрові можливості працівників і партнерів'
      END ELSE NULL END,
    1,DATEFROMPARTS(y.[year],1,5),DATEFROMPARTS(y.[year],1,5)
  FROM #YearPlan y;

  INSERT INTO [dbo].[preparation_stages]
    ([initiative_year_id],[manager_id],[priority_id],[revision],[created_at],[updated_at])
  SELECT [year_id],[manager_id],[priority_id],1,DATEFROMPARTS([year],1,6),DATEFROMPARTS([year],1,6) FROM #YearPlan;

  CREATE TABLE #Numbers ([n] INT PRIMARY KEY);
  INSERT INTO #Numbers VALUES (1),(2),(3),(4),(5),(6),(7),(8),(9),(10),(11),(12),(13),(14),(15);

  INSERT INTO [dbo].[preparation_stage_departments] ([initiative_year_id],[department_id])
  SELECT y.[year_id],d.[id]
  FROM #YearPlan y
  JOIN #Numbers n ON n.[n] <= 1 + ((y.[global_no]+y.[year])%3)
  JOIN #Departments d ON d.[rn] = 1 + ((y.[global_no]+y.[year]+n.[n])%15);

  /* Квартальні картки: 0–4 на InitiativeYear, 20% мають усі чотири. */
  CREATE TABLE #CardPlan (
    [card_no] INT IDENTITY(1,1) PRIMARY KEY,[card_id] UNIQUEIDENTIFIER,[year_id] UNIQUEIDENTIFIER,[initiative_id] UNIQUEIDENTIFIER,
    [global_no] INT,[local_no] INT,[kind] VARCHAR(32),[year] INT,[quarter] INT,[manager_id] UNIQUEIDENTIFIER NULL,
    [priority_id] UNIQUEIDENTIFIER NULL,[status_id] UNIQUEIDENTIFIER NULL,[moved_from_year] INT NULL,[moved_from_quarter] INT NULL
  );
  ;WITH Candidates AS (
    SELECT y.*,q.[n] [quarter],ROW_NUMBER() OVER (
      PARTITION BY y.[year_id] ORDER BY (CHECKSUM(y.[year],y.[global_no],q.[n]) & 2147483647)
    ) [pick]
    FROM #YearPlan y JOIN #Numbers q ON q.[n] <= 4
  )
  INSERT INTO #CardPlan
    ([card_id],[year_id],[initiative_id],[global_no],[local_no],[kind],[year],[quarter],[manager_id],[priority_id])
  SELECT NEWID(),[year_id],[initiative_id],[global_no],[local_no],[kind],[year],[quarter],[manager_id],[priority_id]
  FROM Candidates WHERE [pick] <= [card_count]
  ORDER BY [year],[kind],[local_no],[quarter];

  UPDATE #CardPlan SET [status_id] =
    CASE
      WHEN [card_no]%20 BETWEEN 0 AND 7 THEN '40000000-0000-4000-8000-000000000002'
      WHEN [card_no]%20 BETWEEN 8 AND 14 THEN '40000000-0000-4000-8000-000000000003'
      WHEN [card_no]%20 BETWEEN 15 AND 16 THEN '40000000-0000-4000-8000-000000000004'
      WHEN [card_no]%20 BETWEEN 17 AND 18 THEN '40000000-0000-4000-8000-000000000005'
      ELSE '00000000-0000-4000-8000-000000000001'
    END;

  UPDATE target
  SET [moved_from_year]=previousPeriod.[year],[moved_from_quarter]=previousPeriod.[quarter]
  FROM #CardPlan target
  CROSS APPLY (
    SELECT
      CASE WHEN target.[quarter]=1 THEN target.[year]-1 ELSE target.[year] END [year],
      CASE WHEN target.[quarter]=1 THEN 4 ELSE target.[quarter]-1 END [quarter]
  ) previousPeriod
  WHERE target.[card_no]%11=0
    AND previousPeriod.[year]>=2016
    /* Після move вихідна картка вже не існує у старому періоді. */
    AND NOT EXISTS (
      SELECT 1
      FROM #CardPlan occupiedSource
      WHERE occupiedSource.[initiative_id]=target.[initiative_id]
        AND occupiedSource.[year]=previousPeriod.[year]
        AND occupiedSource.[quarter]=previousPeriod.[quarter]
    );

  INSERT INTO [dbo].[quarter_cards]
    ([id],[initiative_year_id],[quarter],[manager_id],[priority_id],[notes],[status_id],[total_weight],
     [size_definition_id],[size_snapshot_name],[size_snapshot_min],[size_snapshot_max],[moved_from_year],[moved_from_quarter],
     [revision],[created_at],[updated_at])
  SELECT
    c.[card_id],c.[year_id],c.[quarter],c.[manager_id],c.[priority_id],
    CASE WHEN c.[card_no]%7=0 THEN NULL ELSE
      CASE c.[card_no]%4
        WHEN 0 THEN N'<p><strong>Ключовий фокус:</strong> завершити погодження та перейти до впровадження.</p><ul><li>Ризики контрольовані</li><li>Команда сформована</li></ul>'
        WHEN 1 THEN N'<p>Роботи виконуються <em>відповідно до плану</em>.</p><ol><li>Підготовлено рішення</li><li>Триває тестування</li></ol>'
        WHEN 2 THEN N'<p><span style="color:#e11d48"><strong>Потрібне рішення керівного комітету.</strong></span></p><p>Є залежність від зовнішнього постачальника.</p>'
        ELSE N'<p>Проміжні результати прийнято. Наступний крок — масштабування.</p>'
      END END,
    c.[status_id],0,NULL,NULL,NULL,NULL,c.[moved_from_year],c.[moved_from_quarter],1,
    DATEFROMPARTS(c.[year],1+(c.[quarter]-1)*3,10),DATEFROMPARTS(c.[year],1+(c.[quarter]-1)*3,10)
  FROM #CardPlan c;

  /* Scope: 0–15 завдань на картку, п'ять позитивних ваг, різні статуси. */
  CREATE TABLE #ScopePlan (
    [scope_id] UNIQUEIDENTIFIER PRIMARY KEY,[card_no] INT,[card_id] UNIQUEIDENTIFIER,[item_no] INT,[lineage_id] UNIQUEIDENTIFIER,
    [copied_from_item_id] UNIQUEIDENTIFIER NULL,[moved_from_card_id] UNIQUEIDENTIFIER NULL,[status_code] VARCHAR(16),
    [weight_id] UNIQUEIDENTIFIER,[weight_name] NVARCHAR(100),[weight_value] DECIMAL(12,2),[text] NVARCHAR(2000)
  );
  ;WITH Counts AS (
    SELECT c.*,(CHECKSUM(c.[card_id],N'scope') & 2147483647)%16 [scope_count] FROM #CardPlan c
  )
  INSERT INTO #ScopePlan
  SELECT
    NEWID(),c.[card_no],c.[card_id],n.[n],NEWID(),NULL,NULL,
    CASE (c.[card_no]+n.[n])%10 WHEN 0 THEN 'RED' WHEN 1 THEN 'DEFAULT' WHEN 2 THEN 'YELLOW' WHEN 3 THEN 'YELLOW' WHEN 4 THEN 'GREEN' WHEN 5 THEN 'GREEN' WHEN 6 THEN 'GREEN' ELSE 'DEFAULT' END,
    w.[id],w.[name],w.[weight],
    CASE n.[n]
      WHEN 1 THEN N'Уточнити бізнес-вимоги та критерії приймання'
      WHEN 2 THEN N'Підготувати архітектурне рішення'
      WHEN 3 THEN N'Погодити план реалізації із залученими підрозділами'
      WHEN 4 THEN N'Розробити та налаштувати функціональність'
      WHEN 5 THEN N'Підготувати тестові сценарії та дані'
      WHEN 6 THEN N'Провести інтеграційне тестування'
      WHEN 7 THEN N'Усунути критичні зауваження тестування'
      WHEN 8 THEN N'Підготувати користувацьку документацію'
      WHEN 9 THEN N'Навчити ключових користувачів'
      WHEN 10 THEN N'Провести перевірку інформаційної безпеки'
      WHEN 11 THEN N'Погодити план переходу в промислову експлуатацію'
      WHEN 12 THEN N'Виконати міграцію та контроль якості даних'
      WHEN 13 THEN N'Запустити рішення у промислову експлуатацію'
      WHEN 14 THEN N'Провести стабілізацію після запуску'
      ELSE N'Підготувати підсумковий звіт і передати результат власнику процесу'
    END
  FROM Counts c
  JOIN #Numbers n ON n.[n] <= c.[scope_count]
  JOIN (
    SELECT 1 [rn],'50000000-0000-4000-8000-000000000002' [id],N'Дуже мала' [name],CONVERT(DECIMAL(12,2),1) [weight] UNION ALL
    SELECT 2,'50000000-0000-4000-8000-000000000003',N'Мала',2 UNION ALL
    SELECT 3,'50000000-0000-4000-8000-000000000004',N'Середня',3 UNION ALL
    SELECT 4,'50000000-0000-4000-8000-000000000005',N'Велика',5 UNION ALL
    SELECT 5,'50000000-0000-4000-8000-000000000006',N'Дуже велика',8
  ) w ON w.[rn] = 1 + ((c.[card_no]+n.[n])%5);

  /* Частина завдань копіюється з найближчої попередньої картки зі збереженням lineage. */
  UPDATE target
  SET [copied_from_item_id]=source.[scope_id],[lineage_id]=source.[lineage_id]
  FROM #ScopePlan target
  JOIN #CardPlan targetCard ON targetCard.[card_no]=target.[card_no]
  CROSS APPLY (
    SELECT TOP (1) sourceScope.[scope_id],sourceScope.[lineage_id]
    FROM #CardPlan sourceCard
    JOIN #ScopePlan sourceScope ON sourceScope.[card_no]=sourceCard.[card_no] AND sourceScope.[item_no]=target.[item_no]
    WHERE sourceCard.[initiative_id]=targetCard.[initiative_id]
      AND sourceCard.[year]*10+sourceCard.[quarter] < targetCard.[year]*10+targetCard.[quarter]
      AND sourceCard.[card_no]%7<>0
    ORDER BY sourceCard.[year] DESC,sourceCard.[quarter] DESC
  ) source
  WHERE target.[item_no]=1 AND target.[card_no]%7=0;

  /* Інша частина моделює перенесення окремого scope item. */
  UPDATE target
  SET [moved_from_card_id]=source.[card_id]
  FROM #ScopePlan target
  JOIN #CardPlan targetCard ON targetCard.[card_no]=target.[card_no]
  CROSS APPLY (
    SELECT TOP (1) sourceCard.[card_id]
    FROM #CardPlan sourceCard
    WHERE sourceCard.[initiative_id]=targetCard.[initiative_id]
      AND sourceCard.[year]*10+sourceCard.[quarter] < targetCard.[year]*10+targetCard.[quarter]
    ORDER BY sourceCard.[year] DESC,sourceCard.[quarter] DESC
  ) source
  WHERE target.[item_no]=2 AND target.[card_no]%9=0 AND target.[status_code]<>'GREEN';

  INSERT INTO [dbo].[scope_items]
    ([id],[quarter_card_id],[lineage_id],[copied_from_item_id],[text],[status_code],[weight_definition_id],
     [weight_snapshot_name],[weight_snapshot_value],[moved_from_card_id],[revision],[created_at],[updated_at])
  SELECT s.[scope_id],s.[card_id],s.[lineage_id],NULL,s.[text],s.[status_code],s.[weight_id],s.[weight_name],s.[weight_value],s.[moved_from_card_id],1,@Now,@Now
  FROM #ScopePlan s WHERE s.[copied_from_item_id] IS NULL;

  INSERT INTO [dbo].[scope_items]
    ([id],[quarter_card_id],[lineage_id],[copied_from_item_id],[text],[status_code],[weight_definition_id],
     [weight_snapshot_name],[weight_snapshot_value],[moved_from_card_id],[revision],[created_at],[updated_at])
  SELECT s.[scope_id],s.[card_id],s.[lineage_id],s.[copied_from_item_id],s.[text],s.[status_code],s.[weight_id],s.[weight_name],s.[weight_value],s.[moved_from_card_id],1,@Now,@Now
  FROM #ScopePlan s WHERE s.[copied_from_item_id] IS NOT NULL;

  /* 40% завдань мають одного виконавця, інші — 2–5. */
  INSERT INTO [dbo].[scope_item_executors] ([scope_item_id],[department_id])
  SELECT s.[scope_id],d.[id]
  FROM #ScopePlan s
  JOIN #Numbers e ON e.[n] <= CASE WHEN (s.[card_no]+s.[item_no])%10 < 4 THEN 1 ELSE 2+((s.[card_no]+s.[item_no])%4) END
  /*
    Виконавці розподіляються між першими 12 підрозділами. Підрозділи
    13–15 залишаються резервом для ролі involved, тому навіть картка з
    великою кількістю scope items не може зайняти виконавцями весь довідник.
  */
  JOIN #Departments d ON d.[rn] = 1 + ((s.[card_no]+s.[item_no]+e.[n])%12);

  /* Card department pool = executors + 1–3 окремих involved; для пустого scope — 0–2. */
  INSERT INTO [dbo].[quarter_card_departments] ([quarter_card_id],[department_id])
  SELECT DISTINCT s.[card_id],e.[department_id]
  FROM #ScopePlan s JOIN [dbo].[scope_item_executors] e ON e.[scope_item_id]=s.[scope_id];

  ;WITH CardScopeCounts AS (
    SELECT c.[card_no],c.[card_id],COUNT(s.[scope_id]) [scope_count]
    FROM #CardPlan c LEFT JOIN #ScopePlan s ON s.[card_no]=c.[card_no]
    GROUP BY c.[card_no],c.[card_id]
  ), InvolvedCandidates AS (
    SELECT c.[card_id],d.[id] [department_id]
    FROM CardScopeCounts c
    JOIN #Numbers n ON n.[n] <= CASE WHEN c.[scope_count]=0 THEN c.[card_no]%3 ELSE 1+(c.[card_no]%3) END
    JOIN #Departments d ON d.[rn] = 1 + ((c.[card_no]+8+n.[n])%15)
  )
  INSERT INTO [dbo].[quarter_card_departments] ([quarter_card_id],[department_id])
  SELECT i.[card_id],i.[department_id]
  FROM InvolvedCandidates i
  WHERE NOT EXISTS (
    SELECT 1 FROM [dbo].[quarter_card_departments] existing
    WHERE existing.[quarter_card_id]=i.[card_id] AND existing.[department_id]=i.[department_id]
  );

  /*
    Гарантія бізнес-інваріанта: картка зі scope має щонайменше один
    залучений підрозділ, який не є виконавцем жодного її завдання.
  */
  INSERT INTO [dbo].[quarter_card_departments] ([quarter_card_id],[department_id])
  SELECT c.[card_id],fallbackDepartment.[id]
  FROM #CardPlan c
  CROSS APPLY (
    SELECT TOP (1) d.[id]
    FROM #Departments d
    WHERE NOT EXISTS (
      SELECT 1
      FROM #ScopePlan s
      JOIN [dbo].[scope_item_executors] e ON e.[scope_item_id]=s.[scope_id]
      WHERE s.[card_id]=c.[card_id] AND e.[department_id]=d.[id]
    )
      AND NOT EXISTS (
        SELECT 1 FROM [dbo].[quarter_card_departments] existing
        WHERE existing.[quarter_card_id]=c.[card_id] AND existing.[department_id]=d.[id]
      )
    ORDER BY d.[rn]
  ) fallbackDepartment
  WHERE EXISTS (SELECT 1 FROM #ScopePlan s WHERE s.[card_id]=c.[card_id])
    AND NOT EXISTS (
      SELECT 1
      FROM [dbo].[quarter_card_departments] pool
      WHERE pool.[quarter_card_id]=c.[card_id]
        AND NOT EXISTS (
          SELECT 1
          FROM #ScopePlan s
          JOIN [dbo].[scope_item_executors] e ON e.[scope_item_id]=s.[scope_id]
          WHERE s.[card_id]=c.[card_id] AND e.[department_id]=pool.[department_id]
        )
    );

  /* Custom values: 0–12 на картку; перша картка кожного kind/year використовує всі 12. */
  ;WITH CardRanks AS (
    SELECT c.*,ROW_NUMBER() OVER (PARTITION BY c.[year],c.[kind] ORDER BY c.[quarter],c.[local_no]) [kind_year_rank]
    FROM #CardPlan c
  ), CardFields AS (
    SELECT c.[card_id],c.[card_no],c.[year],f.*
    FROM CardRanks c
    JOIN #FieldSeed f ON f.[entity_type]=CASE WHEN c.[kind]='PROJECT' THEN 'project' ELSE 'task' END
    WHERE f.[rn] <= CASE WHEN c.[kind_year_rank]=1 THEN 12 ELSE (CHECKSUM(c.[card_id],N'fields') & 2147483647)%13 END
  )
  INSERT INTO [dbo].[quarter_card_custom_field_values]
    ([quarter_card_id],[definition_id],[text_value],[number_value],[boolean_value],[date_value],[option_value])
  SELECT
    cf.[card_id],cf.[id],
    CASE
      WHEN cf.[field_type]='TEXT' THEN CONCAT(N'Тестове значення «',cf.[name],N'» за ',cf.[year],N' рік')
      WHEN cf.[field_type]='RICHTEXT' THEN CONCAT(N'<p><strong>',cf.[name],N':</strong> очікуваний результат підтверджено.</p><ul><li>Показник вимірюється</li><li>Власника визначено</li></ul>')
      ELSE NULL
    END,
    CASE WHEN cf.[field_type]='NUMBER' THEN CONVERT(DECIMAL(18,4),50+((cf.[card_no]*cf.[rn])%950)) ELSE NULL END,
    CASE WHEN cf.[field_type]='CHECKBOX' THEN CONVERT(BIT,(cf.[card_no]+cf.[rn])%2) ELSE NULL END,
    NULL,
    CASE WHEN cf.[field_type]='SELECT' THEN selectedOption.[value] ELSE NULL END
  FROM CardFields cf
  OUTER APPLY (
    SELECT TOP (1) o.[value]
    FROM [dbo].[custom_field_options] o
    WHERE o.[definition_id]=cf.[id]
    ORDER BY (CHECKSUM(cf.[card_id],o.[id]) & 2147483647)
  ) selectedOption;

  /* Canonical totals та frozen size snapshots. */
  UPDATE card
  SET [total_weight]=totals.[total_weight]
  FROM [dbo].[quarter_cards] card
  CROSS APPLY (
    SELECT COALESCE(SUM(item.[weight_snapshot_value]),0) [total_weight]
    FROM [dbo].[scope_items] item WHERE item.[quarter_card_id]=card.[id]
  ) totals;

  UPDATE card
  SET [size_definition_id]=size.[id],[size_snapshot_name]=size.[name],
      [size_snapshot_min]=size.[min_score],[size_snapshot_max]=size.[max_score]
  FROM [dbo].[quarter_cards] card
  CROSS APPLY (
    SELECT TOP (1) s.[id],s.[name],s.[min_score],s.[max_score]
    FROM [dbo].[initiative_size_definitions] s
    WHERE card.[total_weight] BETWEEN s.[min_score] AND s.[max_score]
    ORDER BY s.[min_score]
  ) size;

  /* Audit показує створення з беклогу, continue та move. */
  INSERT INTO [dbo].[audit_events]
    ([id],[aggregate_type],[aggregate_id],[action_code],[message],[actor_user_id],[actor_name],
     [source_year],[source_quarter],[target_year],[target_quarter],[occurred_at])
  SELECT
    NEWID(),'QUARTER_CARD',CONVERT(NVARCHAR(100),c.[card_id]),
    CASE WHEN c.[moved_from_year] IS NOT NULL THEN 'CARD_MOVED' WHEN c.[card_no]%7=0 AND previousCard.[exists_flag]=1 THEN 'CARD_CONTINUED' ELSE 'CARD_CREATED_FROM_BACKLOG' END,
    CASE WHEN c.[moved_from_year] IS NOT NULL THEN N'Картку перенесено в інший період' WHEN c.[card_no]%7=0 AND previousCard.[exists_flag]=1 THEN N'Ініціативу продовжено' ELSE N'Картку створено з беклогу' END,
    '80000000-0000-4000-8000-000000000001',N'Анастасія Клименко',
    c.[moved_from_year],CASE WHEN c.[moved_from_quarter] IS NULL THEN NULL ELSE CONCAT('Q',c.[moved_from_quarter]) END,
    c.[year],CONCAT('Q',c.[quarter]),DATEFROMPARTS(c.[year],1+(c.[quarter]-1)*3,10)
  FROM #CardPlan c
  OUTER APPLY (
    SELECT TOP (1) 1 [exists_flag]
    FROM #CardPlan source
    WHERE source.[initiative_id]=c.[initiative_id]
      AND source.[year]*10+source.[quarter] < c.[year]*10+c.[quarter]
  ) previousCard;

  INSERT INTO [dbo].[audit_events]
    ([id],[aggregate_type],[aggregate_id],[action_code],[message],[actor_user_id],[actor_name],[target_year],[target_quarter],[occurred_at])
  SELECT NEWID(),'SCOPE_ITEM',CONVERT(NVARCHAR(100),s.[scope_id]),'SCOPE_COPIED',N'Завдання скоупу скопійовано з попередньої картки',
    '80000000-0000-4000-8000-000000000001',N'Анастасія Клименко',c.[year],CONCAT('Q',c.[quarter]),@Now
  FROM #ScopePlan s JOIN #CardPlan c ON c.[card_no]=s.[card_no]
  WHERE s.[copied_from_item_id] IS NOT NULL;

  /* Автоматичні acceptance checks. Будь-яке порушення відкочує всю транзакцію. */
  IF EXISTS (
    SELECT y.[year]
    FROM [dbo].[initiative_years] y JOIN [dbo].[initiatives] i ON i.[id]=y.[initiative_id]
    GROUP BY y.[year]
    HAVING SUM(CASE WHEN i.[kind]='PROJECT' THEN 1 ELSE 0 END)<>55
        OR SUM(CASE WHEN i.[kind]='OPERATIONAL_TASK' THEN 1 ELSE 0 END)<>25
  ) THROW 51100, N'Порушено річну кількість проєктів або операційних задач.', 1;

  IF EXISTS (
    SELECT [year]
    FROM #YearPlan
    GROUP BY [year]
    HAVING SUM(CASE WHEN [manager_id] IS NULL THEN 1 ELSE 0 END)<>1
        OR SUM(CASE WHEN [priority_id] IS NULL THEN 1 ELSE 0 END)<>2
  ) THROW 51101, N'Порушено річний розподіл порожніх менеджерів/пріоритетів.', 1;

  IF EXISTS (
    SELECT 1 FROM [dbo].[scope_items] s
    WHERE (SELECT COUNT(*) FROM [dbo].[scope_item_executors] e WHERE e.[scope_item_id]=s.[id]) NOT BETWEEN 1 AND 5
  ) THROW 51102, N'Знайдено scope item без 1–5 виконавців.', 1;

  IF EXISTS (
    SELECT y.[year],f.[id]
    FROM (SELECT DISTINCT [year] FROM #YearPlan) y
    CROSS JOIN #FieldSeed f
    WHERE NOT EXISTS (
      SELECT 1
      FROM [dbo].[quarter_card_custom_field_values] v
      JOIN [dbo].[quarter_cards] c ON c.[id]=v.[quarter_card_id]
      JOIN [dbo].[initiative_years] iy ON iy.[id]=c.[initiative_year_id]
      WHERE iy.[year]=y.[year] AND v.[definition_id]=f.[id]
    )
  ) THROW 51103, N'Не кожне custom field використано хоча б раз у кожному році.', 1;

  IF EXISTS (
    SELECT c.[id]
    FROM [dbo].[quarter_cards] c
    WHERE c.[total_weight]<>(SELECT COALESCE(SUM(s.[weight_snapshot_value]),0) FROM [dbo].[scope_items] s WHERE s.[quarter_card_id]=c.[id])
       OR c.[size_definition_id] IS NULL
  ) THROW 51104, N'Некоректний total_weight або size snapshot.', 1;

  IF EXISTS (
    SELECT y.[year],y.[kind]
    FROM #YearPlan y
    GROUP BY y.[year],y.[kind]
    HAVING SUM(CASE WHEN y.[card_count]=4 THEN 1 ELSE 0 END)
      <> CASE WHEN y.[kind]='PROJECT' THEN 11 ELSE 5 END
  ) THROW 51105, N'Порушено вимогу: щонайменше 20% ініціатив мають бути присутні у чотирьох кварталах.', 1;

  IF EXISTS (
    SELECT y.[year]
    FROM #YearPlan y
    LEFT JOIN [dbo].[managers] m ON m.[id]=y.[manager_id]
    GROUP BY y.[year]
    HAVING SUM(CASE WHEN m.[is_active]=0 THEN 1 ELSE 0 END) NOT BETWEEN 1 AND 2
  ) THROW 51106, N'Порушено річну кількість ініціатив із неактивними менеджерами.', 1;

  IF EXISTS (
    SELECT iy.[year]
    FROM [dbo].[initiative_years] iy
    GROUP BY iy.[year]
    HAVING SUM(CASE WHEN iy.[strategic_goal] IS NOT NULL THEN 1 ELSE 0 END)<>56
  ) THROW 51107, N'Стратегічна ціль має бути заповнена рівно у 70% річних записів.', 1;

  IF EXISTS (
    SELECT iy.[year]
    FROM [dbo].[quarter_cards] c
    JOIN [dbo].[initiative_years] iy ON iy.[id]=c.[initiative_year_id]
    GROUP BY iy.[year]
    HAVING COUNT(DISTINCT c.[status_id])<>5
  ) THROW 51108, N'У кожному році квартальні картки мають покривати всі п’ять статусів.', 1;

  IF EXISTS (
    SELECT c.[id]
    FROM [dbo].[quarter_cards] c
    CROSS APPLY (SELECT COUNT(*) [scope_count] FROM [dbo].[scope_items] s WHERE s.[quarter_card_id]=c.[id]) scopeStats
    WHERE scopeStats.[scope_count] NOT BETWEEN 0 AND 15
  ) THROW 51109, N'Кількість завдань у картці вийшла за діапазон 0–15.', 1;

  IF EXISTS (
    SELECT c.[id]
    FROM [dbo].[quarter_cards] c
    WHERE EXISTS (SELECT 1 FROM [dbo].[scope_items] s WHERE s.[quarter_card_id]=c.[id])
      AND NOT EXISTS (
        SELECT 1
        FROM [dbo].[quarter_card_departments] pool
        WHERE pool.[quarter_card_id]=c.[id]
          AND NOT EXISTS (
            SELECT 1
            FROM [dbo].[scope_items] s
            JOIN [dbo].[scope_item_executors] e ON e.[scope_item_id]=s.[id]
            WHERE s.[quarter_card_id]=c.[id] AND e.[department_id]=pool.[department_id]
          )
      )
  ) THROW 51110, N'Картка зі scope не має окремого залученого підрозділу.', 1;

  DECLARE @ScopeTotal DECIMAL(18,4) = (SELECT COUNT(*) FROM [dbo].[scope_items]);
  DECLARE @SingleExecutorTotal DECIMAL(18,4) = (
    SELECT COUNT(*)
    FROM [dbo].[scope_items] s
    WHERE (SELECT COUNT(*) FROM [dbo].[scope_item_executors] e WHERE e.[scope_item_id]=s.[id])=1
  );
  IF @ScopeTotal=0 OR 100.0*@SingleExecutorTotal/@ScopeTotal NOT BETWEEN 39.0 AND 41.0
    THROW 51111, N'Частка завдань з одним виконавцем відхиляється від цільових 40%.', 1;

  IF NOT EXISTS (SELECT 1 FROM [dbo].[scope_items] WHERE [copied_from_item_id] IS NOT NULL)
    OR NOT EXISTS (SELECT 1 FROM [dbo].[scope_items] WHERE [moved_from_card_id] IS NOT NULL)
    THROW 51112, N'Не сформовано приклади copied/moved scope items.', 1;

  IF NOT EXISTS (SELECT 1 FROM [dbo].[quarter_cards] WHERE [moved_from_year] IS NOT NULL)
    OR NOT EXISTS (SELECT 1 FROM [dbo].[audit_events] WHERE [action_code]='CARD_CONTINUED')
    OR NOT EXISTS (SELECT 1 FROM [dbo].[audit_events] WHERE [action_code]='CARD_CREATED_FROM_BACKLOG')
    THROW 51113, N'Не сформовано повний набір card flows: backlog/continue/move.', 1;

  COMMIT TRANSACTION;

  /* Підсумковий звіт після успішного COMMIT. */
  SELECT N'Підрозділи' [dataset],COUNT(*) [count] FROM [dbo].[departments]
  UNION ALL SELECT N'Користувачі',COUNT(*) FROM [dbo].[users]
  UNION ALL SELECT N'Менеджери',COUNT(*) FROM [dbo].[managers]
  UNION ALL SELECT N'Ініціативи',COUNT(*) FROM [dbo].[initiatives]
  UNION ALL SELECT N'Річні записи',COUNT(*) FROM [dbo].[initiative_years]
  UNION ALL SELECT N'Квартальні картки',COUNT(*) FROM [dbo].[quarter_cards]
  UNION ALL SELECT N'Завдання скоупу',COUNT(*) FROM [dbo].[scope_items]
  UNION ALL SELECT N'Скопійовані завдання',COUNT(*) FROM [dbo].[scope_items] WHERE [copied_from_item_id] IS NOT NULL;

  SELECT iy.[year],i.[kind],COUNT(*) [initiative_years],
    SUM(CASE WHEN cards.[card_count]=4 THEN 1 ELSE 0 END) [in_all_four_quarters]
  FROM [dbo].[initiative_years] iy
  JOIN [dbo].[initiatives] i ON i.[id]=iy.[initiative_id]
  CROSS APPLY (SELECT COUNT(*) [card_count] FROM [dbo].[quarter_cards] c WHERE c.[initiative_year_id]=iy.[id]) cards
  GROUP BY iy.[year],i.[kind]
  ORDER BY iy.[year],i.[kind];

  SELECT s.[name] [status],COUNT(*) [cards],
    CONVERT(DECIMAL(6,2),100.0*COUNT(*)/SUM(COUNT(*)) OVER()) [percent_of_cards]
  FROM [dbo].[quarter_cards] c JOIN [dbo].[card_status_definitions] s ON s.[id]=c.[status_id]
  GROUP BY s.[name] ORDER BY [cards] DESC;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
