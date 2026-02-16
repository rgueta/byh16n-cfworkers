--Para aplicar codifo SQL en servicor debes hacerlo
-- aplicando cada instruccion ya que el server no acepta
--wrangler d1 execute byh16 --local --command="

-- 1. Crear tabla temporal con nuevo tipo
-- CREATE TABLE cpus_temp
-- (id INTEGER PRIMARY KEY AUTOINCREMENT,
-- 	name TEXT,
-- 	shortName TEXT,
-- 	sim TEXT,
-- 	entries INTEGER,
-- 	cores INTEGER,
-- 	description TEXT,
-- 	houses INTEGER,
-- 	school INTEGER,
-- 	geoId INTEGER,
-- 	divisionId INTEGER,
-- 	FOREIGN KEY("divisionId") REFERENCES "divisions"("id") ON DELETE CASCADE,
-- 	FOREIGN KEY("geoId") REFERENCES "geolocations"("id") ON DELETE CASCADE);


-- -- 3. Eliminar original y renombrar
-- DROP TABLE cpus;

-- ALTER TABLE cpus_temp RENAME TO cpus;
