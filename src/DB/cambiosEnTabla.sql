-- fix_table.sql
-- NOTA: D1 ejecutará cada comando en orden automáticamente
-- No uses BEGIN/COMMIT

-- CREATE TABLE cores_temp (
--     id	INTEGER PRIMARY KEY AUTOINCREMENT,
--     name TEXT,
--     shortName TEXT,
--     address TEXT,
--     houses INTEGER,
--     sim TEXT,
--     email TEXT,
--     enable INTEGER,
--     remote INTEGER,
--     code_expire INTEGER,
--     webService INTEGER,
--     contact_name TEXT,
--     contact_email TEXT,
--     contact_cell TEXT,
--     description TEXT,
--     cpuId INTEGER,
--     geoId INTEGER,
--     FOREIGN KEY(cpuId) REFERENCES cpus(id) ON DELETE CASCADE,
--     FOREIGN KEY(geoId) REFERENCES geolocations(id) ON DELETE CASCADE
--  );

-- -- Copiar datos
-- INSERT INTO cores_temp (name,shortName,address,houses,sim,email,enable,remote,code_expire,webService,contact_name,contact_email,contact_cell,description,cpuId,geoId)
--                      SELECT name,shortName,address,houses,sim,email,enable,remote,code_expire,webService,contact_name,contact_email,contact_cell,description,cpuId,geoId
--                      FROM cores;

-- -- Eliminar tabla vieja
-- DROP TABLE cores;

-- -- Renombrar
-- ALTER TABLE cores_temp RENAME TO cores;


-- INSERT INTO configApp (debug,send_sms,backendUrl,localUrl,serverUrl)
-- VALUES(0,0,'https://byh16worker.ricardogueta.workers.dev','http://192.168.1.170','https://byh16worker.ricardogueta.workers.dev')
