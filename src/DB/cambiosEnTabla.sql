-- fix_table.sql
-- NOTA: D1 ejecutará cada comando en orden automáticamente
-- No uses BEGIN/COMMIT

-- Crear nueva tabla sin cpuId
CREATE TABLE users_temp (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 email TEXT,
 username TEXT,
 pwd TEXT,
 name TEXT,
 house TEXT,
 sim TEXT,
 gender TEXT,
 avatar TEXT,
 coreId INTEGER,
 location TEXT,
 locked INTEGER,
 uuid TEXT,
 createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 blocked INTEGER NOT NULL DEFAULT 0 CHECK (blocked IN (0,1)),
 FOREIGN KEY (coreId) REFERENCES cores(id) ON DELETE CASCADE
 );

-- Copiar datos
INSERT INTO users_temp (id, email, username, pwd, name, house, sim, gender,
  avatar, coreId, location, locked, uuid, createdAt, updatedAt,
  blocked)
SELECT id, email, username, pwd, name, house, sim, gender,
  avatar, coreId, location, locked, uuid, createdAt, updatedAt,
  blocked FROM users;

-- Eliminar tabla vieja
DROP TABLE users;

-- Renombrar
ALTER TABLE users_temp RENAME TO users;
