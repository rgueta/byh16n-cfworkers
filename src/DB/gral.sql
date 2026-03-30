---------------   config    ---------------

----------------  nuevo      ---------------------
-- SELECT

--   IFNULL(json_group_array(ai.device_uuid), '[]') as admin_device,
--   IFNULL(json_group_array(
--     json_object(
--       'name', ai.name,
--       'sim', ai.sim
--     )
--   ), '[]') as admin_sim,
--   IFNULL(json_group_array(
--     json_object(
--       'id', ai.id,
--       'name', ai.name,
--       'email', ai.email
--     )
--   ), '[]') as admin_email
-- FROM configApp c
-- LEFT JOIN configApp_adminInfo ca ON c.id = ca.configAppId
-- LEFT JOIN admin_info ai ON ai.id = ca.adminInfoId
-- GROUP BY c.id;


----------- Original --------------------------

-- SELECT c.debug,c.send_sms, c.backendUrl, c.localUrl,c.serverUrl,
--   json_group_array(ai.device_uuid) as admin_device,
--   json_group_array(
--          json_object(
--              'name', ai.name,
--              'sim', ai.sim
--           )
--      ) as admin_sim,
--      json_group_array(
--             json_object(
--                 'id', ai.id,
--                 'name', ai.name,
--                 'email', ai.email
--              )
--         ) as admin_email
-- FROM configApp c
-- LEFT JOIN configApp_adminInfo ca ON c.id = ca.configAppId
-- LEFT JOIN admin_info ai ON ai.id = ca.adminInfoId
-- GROUP BY c.id




--------------  ALTER TABLES  ---------------------
-- LOGS  ------------------------------
--
-- CREATE TABLE app_logs (
--     id INTEGER PRIMARY KEY AUTOINCREMENT,
--     log_type TEXT NOT NULL,           -- 'error', 'request', 'security', 'audit'
--     event_type TEXT,                  -- 'password_recovery', 'api_error', 'auth_failure'
--     severity TEXT,                    -- 'debug', 'info', 'warning', 'error', 'critical'

--     -- Datos de la petición
--     endpoint TEXT,
--     method TEXT,                      -- 'GET', 'POST', 'PUT', 'DELETE'
--     status_code INTEGER,
--     response_time_ms INTEGER,

--     -- Datos del usuario
--     user_id TEXT,
--     user_email TEXT,
--     client_ip TEXT,
--     user_agent TEXT,

--     -- Contenido
--     request_body TEXT,                -- JSON string
--     error_message TEXT,
--     error_trace TEXT,                 -- Stack trace
--     additional_data TEXT,             -- JSON string para datos adicionales

--     -- Metadatos
--     created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
--     created_date DATE DEFAULT CURRENT_DATE,
--     created_time TIME DEFAULT CURRENT_TIME
-- );

-- -- Índices para búsquedas eficientes
-- CREATE INDEX idx_log_type ON app_logs(log_type);
-- CREATE INDEX idx_event_type ON app_logs(event_type);
-- CREATE INDEX idx_created_at ON app_logs(created_at);
-- CREATE INDEX idx_user_id ON app_logs(user_id);
-- CREATE INDEX idx_endpoint ON app_logs(endpoint);
-- CREATE INDEX idx_severity ON app_logs(severity);



-- CREATE TABLE app_logs (
--     id INTEGER PRIMARY KEY AUTOINCREMENT,
--     log_type TEXT NOT NULL,
--     event_type TEXT,
--     severity TEXT,
--     endpoint TEXT,
--     method TEXT,
--     status_code INTEGER,
--     response_time_ms INTEGER,

--     user_id TEXT,
--     user_email TEXT,
--     client_ip TEXT,
--     user_agent TEXT,

--     request_body TEXT,
--     error_message TEXT,
--     error_trace TEXT,
--     additional_data TEXT,

--     created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
--     created_date DATE DEFAULT CURRENT_DATE,
--     created_time TIME DEFAULT CURRENT_TIME
-- );

-- -- Índices para búsquedas eficientes
-- CREATE INDEX idx_log_type ON app_logs(log_type);
-- CREATE INDEX idx_event_type ON app_logs(event_type);
-- CREATE INDEX idx_created_at ON app_logs(created_at);
-- CREATE INDEX idx_user_id ON app_logs(user_id);
-- CREATE INDEX idx_endpoint ON app_logs(endpoint);
-- CREATE INDEX idx_severity ON app_logs(severity);



--
--
--
--
--
-- USERS

-- CREATE TABLE users_tmp (
--   id INTEGER PRIMARY KEY AUTOINCREMENT,
--   email TEXT UNIQUE NOT NULL,
--   username TEXT,
--   pwd TEXT,
--   name TEXT,
--   house TEXT,
--   sim TEXT,
--   gender TEXT,
--   avatar TEXT,
--   coreId INTEGER,
--   location TEXT,
--   uuid TEXT,
--   locked INTEGER,
--   blocked INTEGER NOT NULL DEFAULT 0 CHECK (blocked IN (0,1)),
--   notes TEXT,
--   setup_token TEXT,
--   setup_expires TIMESTAMP,
--   createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
--   updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
--   FOREIGN KEY (coreId) REFERENCES cores(id) ON DELETE CASCADE
--   );


-- INSERT INTO users_tmp (email, username, pwd, name, house, sim, gender, avatar, coreId, location, uuid, locked, blocked, createdAt, updatedAt)
--                 SELECT email, username, pwd, name, house, sim, gender, avatar, coreId, location, uuid, locked, blocked, createdAt, updatedAt FROM users;

-- DROP TABLE users;

-- ALTER TABLE users_tmp RENAME TO users;





-- insert into codes_tmp (code, userId, device_plaform, initial, expiry, enable, createdAt, updatedAt )
-- select code, userId, device_plaform, initial, expiry, enable, createdAt, updatedAt  from codes;

-- DROP TABLE codes;

-- ALTER TABLE codes_tmp RENAME TO codes;

-- CREATE TABLE code_events_tmp (
-- id INTEGER PRIMARY KEY AUTOINCREMENT,
-- codeId INTEGER,
-- coreSim TEXT,
-- doorName TEXT,
-- picId TEXT,
-- createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
-- updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
-- FOREIGN KEY (codeId) REFERENCES codes(id) ON DELETE CASCADE
-- );

-- DROP TABLE code_events;

-- ALTER TABLE code_events_tmp RENAME TO code_events;

-- insert into codes (code, userId, device_plaform, initial, expiry, enable)
--            values ('A688A9', 1, 'Android', '2026-02-09 09:32:43','2026-03-09 19:32:43',1),
--                   ('3D1087', 1, 'Android', '2026-02-09 09:32:43','2026-03-10 19:32:43',1),
--                   ('38B52A', 1, 'Android', '2026-02-09 09:32:43','2026-03-11 19:32:43',1);

-------------------
-- insert into code_events (codeId, coreSim, doorName, picId)
-- values (1, '+526641752182','Entrada Norte','N/A' ),
-- (2, '+526641752182','Entrada Norte','N/A' ),
-- (3, '+526641752182','Entrada Norte','N/A' );

----------------------CPUS  -------------------
--
-- CREATE TABLE cpus_tmp
--  (id INTEGER PRIMARY KEY AUTOINCREMENT,
--  	name TEXT,
--  	shortName TEXT,
--  	sim TEXT,
--  	entries INTEGER,
--  	cores INTEGER,
--  	description TEXT,
--  	houses INTEGER,
--  	school INTEGER,
--  	geoId INTEGER,
--  	divisionId INTEGER,
--  	FOREIGN KEY("divisionId") REFERENCES "divisions"("id") ON DELETE CASCADE,
--  	FOREIGN KEY("geoId") REFERENCES "geolocations"("id") ON DELETE CASCADE);


--  insert into cpus_tmp(name, shortName, sim, entries, cores, description, houses, school, geoId, divisionId)
--  select name, shortName, sim, entries, cores, description, houses, school, geoId, divisionId from cpus;
--  -- values ('Case grande 3 rec. 1','CG3.1','+526641942241',1,2,'',100,0,3,1 ),
--  --        ('Case grande','CG','+526641942241',2,20,'',1800,1,2,1 ),
--  --        ('Case grande 3 rec. 2','CG3.2','+526641942241',1,3,'',230,0,1,1 );


-- DROP TABLE cpus;

-- ALTER TABLE cpus_tmp RENAME TO cpus;
---------------------------------
--
-- update codes set expiry = '2026-02-09 19:32:43' where id = 3;
-- update cores set sim = '+526632032532' where id = 1;


-----------------  cores  -------------------------
-- SELECT
--     c.id,
--     c.name,
--     c.shortName,
--     c.address,
--     c.houses,
--     c.sim,
--     c.email,
--     c.enable,
--     c.remote,
--     c.code_expire,
--     c.webService,
--     c.contact_name,
--     c.contact_email,
--     c.contact_cell,
--     c.description,
--     co.shortName || '.' || s.shortName || '.' || ci.shortName ||
--     '.' || d.shortName || '.' || cp.shortName || '.' || c.shortName AS location,
--     g.latitud,
--     g.longitud
-- FROM cores c
-- JOIN cpus cp ON cp.id = c.cpuId
-- JOIN geolocations g ON g.id = c.geoId
-- JOIN divisions d ON d.id = cp.divisionId
-- JOIN cities ci ON ci.id = d.cityId
-- JOIN states s ON s.id = ci.stateId
-- JOIN countries co ON co.id = ci.countryId
-- ORDER BY c.id

-- cores:
--┌────┬───────────────────┬───────────┬────────────────────────┬────────┬───────────────┬────────────────────────┬────────┬────────┬─────────────┬────────────┬──────────────┬────────────────────────┬───────────────┬─────────────┬───────┬───────┐
--│ id │ name              │ shortName │ address                │ houses │ sim           │ email                  │ enable │ remote │ code_expire │ webService │ contact_name │ contact_email          │ contact_cell  │ description │ cpuId │ geoId │
--├────┼───────────────────┼───────────┼────────────────────────┼────────┼───────────────┼────────────────────────┼────────┼────────┼─────────────┼────────────┼──────────────┼────────────────────────┼───────────────┼─────────────┼───────┼───────┤
--│ 1  │ San Juan          │ SJ        │ Hda. San Juan 10125    │ 20     │ +526632032532 │ ricardogueta@gmail.com │ 1      │ 1      │ 1           │ 1          │              │                        │               │ null        │ 2     │ 4     │
--├────┼───────────────────┼───────────┼────────────────────────┼────────┼───────────────┼────────────────────────┼────────┼────────┼─────────────┼────────────┼──────────────┼────────────────────────┼───────────────┼─────────────┼───────┼───────┤
--│ 2  │ Casa Grande comun │ CGC       │ Hda. Casa grande       │ 20     │ +526632032532 │ ricardogueta@gmail.com │ 1      │ 1      │ 1           │ 1          │              │ ricardogueta@gmail.com │ +526641752182 │ null        │ 2     │ 2     │
--├────┼───────────────────┼───────────┼────────────────────────┼────────┼───────────────┼────────────────────────┼────────┼────────┼─────────────┼────────────┼──────────────┼────────────────────────┼───────────────┼─────────────┼───────┼───────┤
--│ 3  │ San Gabriel       │ SG        │ Hda. San Gabriel 10126 │ 20     │ +526632032532 │ ricardogueta@gmail.com │ 1      │ 1      │ 1           │ 1          │              │ ricardogueta@gmail.com │ +526641752182 │ null        │ 2     │ 5     │
--└────┴───────────────────┴───────────┴────────────────────────┴────────┴───────────────┴────────────────────────┴────────┴────────┴─────────────┴────────────┴──────────────┴────────────────────────┴───────────────┴─────────────┴───────┴───────┘


-----------------  CPUS  -------------------------
-- SELECT
--     cp.id,
--     cp.name,
--     co.shortName || '.' || s.shortName || '.' || ci.shortName ||
--     '.' || d.shortName || '.' || cp.shortName ||
--     CASE WHEN COUNT(c.shortName) > 0
--          THEN '.' || GROUP_CONCAT(c.shortName, '.')
--          ELSE ''
--     END AS location
-- FROM cpus cp
-- LEFT JOIN divisions d ON d.id = cp.divisionId
-- LEFT JOIN cities ci ON ci.id = d.cityId
-- LEFT JOIN states s ON s.id = ci.stateId
-- LEFT JOIN countries co ON co.id = ci.countryId
-- LEFT JOIN cores c ON cp.id = c.cpuId
-- LEFT JOIN geolocations g ON g.id = c.geoId
-- GROUP BY cp.id, cp.name, co.shortName, s.shortName, ci.shortName, d.shortName, cp.shortName
-- ORDER BY cp.id;


--------- insert into cores  ----------------------
-- insert into cores(name,shortName,address,houses,sim,email,enable,remote,code_expire,webService,contact_name,contact_email,contact_cell,description,cpuId,geoId)
--       values("San Gabriel","SG","Hda. San Gabriel",20,"+526632032532","ricardogueta@gmail.com",1,1,1,1,"","ricardogueta@gmail.com","+526641752182","",2,5);

---------- insert into cpus ----------------
-- insert into cpus(name, shortName, sim, entries, cores, description, houses, school, geoId, divisionId)
-- values('Case grande 3 rec. 2','CG3.2','+526641942241',1,3,'',230,0,1,1 );

---------  resquence  -------------
-- update sqlite_sequence set seq=0 where name = 'users';

--------  clean users  ---------------
-- delete from users;

----------- insert into users ------------
-- insert into users (email, username, pwd, name, house, sim,
-- gender, avatar, coreId, location, locked, uuid, blocked)
-- values('fernando@gmail.com','fersanjuan', '', 'Fernando','13',
-- '+526641752182','M', '',1, 'MX.BC.TJ.6.CG.SJ',0,'b8f7c9908aa28584',0)
--
--

----------- insert into userRoles ------------
-- insert into userRoles(userId, roleId, assignedBy, expiresAt)
-- values (2, 4, 1, '');
--
-------------  Query users,roles  ----------------
-- SELECT
-- u.id,
-- GROUP_CONCAT(r.name, ', ') as role,
-- COUNT(r.id) as qtyRoles
-- FROM users u
-- LEFT JOIN userRoles ur ON u.id = ur.userId
-- LEFT JOIN roles r ON ur.roleId = r.id
-- WHERE u.id = 1 AND locked = 0
-- GROUP BY u.id, u.username, u.email

                           ---- JSON format  --------------

-- SELECT json_group_array(json_object(
--         'id', u.id,
--         'email', u.email,
--         'username', u.username,
--         'pwd', u.pwd,
--         'name', u.name,
--         'house', u.house,
--         'sim', u.sim,
--         'gender', u.gender,
--         'avatar', u.avatar,
--         'coreId', u.coreId,
--         'location', u.location,
--         'locked', u.locked,
--         'uuid', u.uuid,
--         'createdAt', u.createdAt,
--         'updatedAt', u.updatedAt,
--         'blocked', u.blocked,
--         'roles', (
--           SELECT json_group_array(json_object(
--             'id', r.id,
--             'name', r.name,
--             'shortName', r.shortName,
--             'level', r.level
--           ))
--           FROM userRoles ur2
--           LEFT JOIN roles r ON ur2.roleId = r.id
--           WHERE ur2.userId = u.id
--         )
--       )) as users
--       FROM users u
--       WHERE u.coreId = 1
--       GROUP BY u.id, u.username, u.email;

-- SELECT
-- u.id, u.email,u.username, u.pwd,u.name,u.house,
-- u.sim,u.gender,u.avatar,u.coreId,u.location,
-- u.locked,u.uuid,u.createdAt,u.updatedAt,u.blocked,
-- json_group_array(r.name) as roles
-- FROM users u
-- LEFT JOIN userRoles ur ON u.id = ur.userId
-- LEFT JOIN roles r ON ur.roleId = r.id
-- WHERE u.coreId = 1
-- GROUP BY u.id, u.username, u.email;



--
--
--
--
---------------------------------------------------

-- SELECT ce.*,c.code,u.house FROM code_events ce
-- LEFT JOIN codes c ON c.id = ce.codeId
-- LEFT JOIN users u ON u.id = c.userId
-- WHERE ce.createdAt BETWEEN '2026-02-01 00:48:00' AND '2026-02-18 23:59:59'
-- ORDER BY createdAt DESC
--

-- Ext: Feb 14 15:03:53
--"authToken":
--eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzcxMTA5OTMzLCJleHAiOjE3NzExMTAyMzN9.tR2QCAnUY1b-2nzCAmjmC0HuD_PJx-NkIkWkvkN3QnQ

-- Ext: Mar 02 12:50:22
--"refreshToken":
--eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwicm9sZSI6ImFkbWluIiwidHlwZSI6InJlZnJlc2giLCJqdGkiOiJkOTI2ODZmYjdmNzQwNTI4NjY2NDY2OGVmNjdlZGE1ZCIsImlhdCI6MTc3MTE4NDY1MCwiZXhwIjoxNzcyNTY2NjUwfQ.qfguIM0o2wH1WFptvqzrmRFgzUiWt7irxs4lUGeECiE



SELECT u.id from users u
INNER JOIN userRoles ur ON ur.userId = u.id
INNER JOIN roles r ON r.id = ur.roleId
GROUP BY u.id
ORDER BY r.level DESC;
