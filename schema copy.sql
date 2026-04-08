PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE IF NOT EXISTS "countries" (
	"id"	INTEGER,
	"name"	TEXT,
	"shortName"	TEXT,
	PRIMARY KEY("id" AUTOINCREMENT)
);
INSERT INTO "countries" VALUES(1,'Mexico','MX');
CREATE TABLE IF NOT EXISTS "states" (
	"id"	INTEGER,
	"name"	TEXT,
	"shortName"	TEXT,
	"countryId"	INTEGER NOT NULL,
	PRIMARY KEY("id" AUTOINCREMENT)
);
INSERT INTO "states" VALUES(1,'Baja California','BC',1);
CREATE TABLE IF NOT EXISTS "cities" (
	"id"	INTEGER,
	"name"	TEXT,
	"shortName"	TEXT,
	"stateId"	INTEGER NOT NULL,
	"countryId"	INTEGER NOT NULL,
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("countryId") REFERENCES "countries"("id"),
	FOREIGN KEY("stateId") REFERENCES "states"("id")
);
INSERT INTO "cities" VALUES(1,'Tijuana','TJ',1,1);
CREATE TABLE geolocations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    latitud REAL NOT NULL,
    longitud REAL NOT NULL,
    altitud REAL,
    precision REAL,
    datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT,
    UNIQUE(latitud, longitud, datetime) ON CONFLICT REPLACE
);
INSERT INTO "geolocations" VALUES(1,32.459,-116.87,0,0,'2026-02-03 20:39:58','Case grande 3 rec. 2');
INSERT INTO "geolocations" VALUES(2,32.459447,-116.876013,0,0,'2026-02-03 21:25:07','Casa Grande');
INSERT INTO "geolocations" VALUES(3,32.459447,-116.876013,0,0,'2026-02-03 21:28:37','Casa grande 3 rec. 1');
INSERT INTO "geolocations" VALUES(4,32.459893401199245,-116.8762577238092,0,0,'2026-02-13 01:40:22','Hda. San juan');
INSERT INTO "geolocations" VALUES(5,32.459545,-116.876659,0,0,'2026-02-13 02:49:40','Hda. San Gabriel');
CREATE TABLE IF NOT EXISTS "equipment" (
	"id"	INTEGER,
	"name"	TEXT,
	"model"	TEXT,
	"desciption"	TEXT,
	PRIMARY KEY("id" AUTOINCREMENT)
);
CREATE TABLE IF NOT EXISTS "roles" (
	"id"	INTEGER,
	"name"	TEXT,
	"shortName"	TEXT, "level" INTEGER DEFAULT (0),
	PRIMARY KEY("id" AUTOINCREMENT)
);
INSERT INTO "roles" VALUES(1,'admin','admin',100);
INSERT INTO "roles" VALUES(2,'supervisor','sup',90);
INSERT INTO "roles" VALUES(3,'neighborAdmin','Vecino admin',70);
INSERT INTO "roles" VALUES(4,'neighbor','Vecino',60);
INSERT INTO "roles" VALUES(5,'relative','pariente',50);
INSERT INTO "roles" VALUES(6,'guardAdmin','guardia Admin',40);
INSERT INTO "roles" VALUES(7,'guard','guardia',30);
INSERT INTO "roles" VALUES(8,'visitor','visitante',20);
INSERT INTO "roles" VALUES(9,'provider','proveedor',10);
CREATE TABLE IF NOT EXISTS "alerts" (
	"id"	INTEGER,
	"coreId"	INTEGER,
	"item"	TEXT,
	"message"	TEXT,
	"createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("coreId") REFERENCES "cores"("id")
);
CREATE TABLE IF NOT EXISTS "admin_info" (
	"id" INTEGER,
	"name" TEXT,
	"device_uuid" TEXT,
	"sim" TEXT,
	"email" TEXT,
	"createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("id" AUTOINCREMENT)
);
INSERT INTO "admin_info" VALUES(1,'rgueta','d006607d903ca175','+526641752182','ricardogueta@gmail.com','2026-02-07 20:41:43');
INSERT INTO "admin_info" VALUES(2,'rgueta','cb980807-173c-4bed-ac03-486606ec1fff','+526641752182','ricardogueta@gmail.com','2026-02-07 20:43:54');
CREATE TABLE IF NOT EXISTS "configApp" (
	"id"	INTEGER,
	"debug"	INTEGER DEFAULT 0,
	"send_sms"	INTEGER DEFAULT 0,
	"backendUrl"	TEXT,
	"localUrl"	TEXT,
	"serverUrl"	TEXT,
	PRIMARY KEY("id" AUTOINCREMENT)
);
INSERT INTO "configApp" VALUES(1,0,0,'https://byh16worker.ricardogueta.workers.dev','http://192.168.1.170','https://byh16worker.ricardogueta.workers.dev');
CREATE TABLE IF NOT EXISTS "information" (
	"id"	INTEGER,
	"title"	TEXT,
	"url"	TEXT,
	"image"	TEXT,
	"path"	TEXT,
	"description" TEXT,
	"location" TEXT,
	"size"	TEXT,
	"like"	INTEGER DEFAULT 0,
	"disable"	INTEGER DEFAULT 0,
	"createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("id" AUTOINCREMENT)
);
CREATE TABLE IF NOT EXISTS "nfcStatus" (
	"id"	INTEGER,
	"name"	TEXT,
	"coreId"	INTEGER,
	"dataId"	INTEGER,
	"createdAt"	TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	"updatedAt"	TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("id" AUTOINCREMENT)
);
CREATE TABLE IF NOT EXISTS "houseCodes" (
	"id"	INTEGER,
	"house"	INTEGER,
	"code"	TEXT,
	PRIMARY KEY("id" AUTOINCREMENT)
);
CREATE TABLE IF NOT EXISTS "nfcStatus_houseCodes" (
	"id"	INTEGER,
	"nfcStatusId"	INTEGER,
	"houseCodesId"	INTEGER,
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("houseCodesId") REFERENCES "houseCodes"("id"),
	FOREIGN KEY("nfcStatusId") REFERENCES "nfcStatus"("id")
);
CREATE TABLE IF NOT EXISTS "configApp_adminInfo" (
	"id"	INTEGER,
	"configAppId"	INTEGER,
	"adminInfoId"	INTEGER,
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("adminInfoId") REFERENCES "admin_info"("id"),
	FOREIGN KEY("configAppId") REFERENCES "configApp"("id")
);
INSERT INTO "configApp_adminInfo" VALUES(1,1,1);
INSERT INTO "configApp_adminInfo" VALUES(2,1,2);
CREATE TABLE IF NOT EXISTS "stores" (
	"id"	INTEGER,
	"name"	TEXT,
	"m2"	INTEGER,
	"att"	INTEGER,
	"products"	TEXT,
	"cpuId"	INTEGER,
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("cpuId") REFERENCES "cpus"("id") ON DELETE CASCADE
);
CREATE TABLE userRoles (
    userId INTEGER NOT NULL,
    roleId INTEGER NOT NULL,
    assignedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assignedBy INTEGER, -- Quién asignó el rol
    expiresAt TIMESTAMP, -- Para roles temporales
    PRIMARY KEY (userId, roleId),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (roleId) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (assignedBy) REFERENCES users(id)
);
INSERT INTO "userRoles" VALUES(1,1,'2026-03-20 05:18:05',1,NULL);
INSERT INTO "userRoles" VALUES(1,3,'2026-03-20 05:19:13',1,NULL);
INSERT INTO "userRoles" VALUES(2,4,'2026-03-30 14:40:49',1,NULL);
INSERT INTO "userRoles" VALUES(3,4,'2026-03-30 15:03:58',1,NULL);
CREATE TABLE IF NOT EXISTS "code_events" (
id INTEGER PRIMARY KEY AUTOINCREMENT,
codeId INTEGER,
coreSim TEXT,
doorName TEXT,
picId TEXT,
createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY (codeId) REFERENCES codes(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "visitors" (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 userId INTEGER,
 email TEXT,
 name TEXT,
 address TEXT,
 gender TEXT,
 avatar TEXT,
 sim TEXT,
 uuid TEXT,
 createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
 );
CREATE TABLE IF NOT EXISTS "divisions" (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 name TEXT,
 shortName TEXT,
 pc TEXT,
 description TEXT,
 cityId INTEGER,
 FOREIGN KEY(cityId) REFERENCES cities(id) ON DELETE CASCADE
 );
INSERT INTO "divisions" VALUES(1,'division 6','6','22244','',1);
CREATE TABLE IF NOT EXISTS "cpus"
 (id INTEGER PRIMARY KEY AUTOINCREMENT,
 	name TEXT,
 	shortName TEXT,
 	sim TEXT,
 	entries INTEGER,
 	cores INTEGER,
 	description TEXT,
 	houses INTEGER,
 	school INTEGER,
 	geoId INTEGER,
 	divisionId INTEGER,
 	FOREIGN KEY("divisionId") REFERENCES "divisions"("id") ON DELETE CASCADE,
 	FOREIGN KEY("geoId") REFERENCES "geolocations"("id") ON DELETE CASCADE);
INSERT INTO "cpus" VALUES(1,'Case grande 3 rec. 1','CG3.1','+526641942241',1,2,'',100,0,3,1);
INSERT INTO "cpus" VALUES(2,'Case grande','CG','+526641942241',2,20,'',1800,1,2,1);
INSERT INTO "cpus" VALUES(3,'Case grande 3 rec. 2','CG3.2','+526641942241',1,3,'',230,0,1,1);
CREATE TABLE IF NOT EXISTS "cores" (
    id	INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    shortName TEXT,
    address TEXT,
    houses INTEGER,
    sim TEXT,
    email TEXT,
    enable INTEGER,
    remote INTEGER,
    code_expire INTEGER,
    webService INTEGER,
    contact_name TEXT,
    contact_email TEXT,
    contact_cell TEXT,
    description TEXT,
    cpuId INTEGER,
    geoId INTEGER,
    FOREIGN KEY(cpuId) REFERENCES cpus(id) ON DELETE CASCADE,
    FOREIGN KEY(geoId) REFERENCES geolocations(id) ON DELETE CASCADE
 );
INSERT INTO "cores" VALUES(1,'San Juan','SJ','Hda. San Juan 10125',20,'+526641752182','ricardogueta@gmail.com',1,1,1,1,'','','','',2,4);
INSERT INTO "cores" VALUES(2,'Casa Grande comun','CGC','Hda. Casa grande',1800,'+526632032532','ricardogueta@gmail.com',1,1,1,1,'','ricardogueta@gmail.com','+526641752182','',2,2);
INSERT INTO "cores" VALUES(3,'San Gabriel','SG','Hda. San Gabriel',20,'+526632032532','ricardogueta@gmail.com',1,1,1,1,'','ricardogueta@gmail.com','+526641752182','',2,5);
CREATE TABLE IF NOT EXISTS "pwdRst" (
id INTEGER PRIMARY KEY AUTOINCREMENT,
email TEXT,
confirmed	INTEGER DEFAULT 0,
reseted	INTEGER DEFAULT 0,
createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY (email) REFERENCES users(email) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "users" (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  username TEXT,
  pwd TEXT,
  name TEXT,
  house TEXT,
  sim TEXT,
  gender TEXT,
  avatar TEXT,
  coreId INTEGER,
  location TEXT,
  uuid TEXT,
  locked INTEGER,
  blocked INTEGER NOT NULL DEFAULT 0 CHECK (blocked IN (0,1)),
  notes TEXT,
  setup_token TEXT,
  setup_expires TIMESTAMP,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (coreId) REFERENCES cores(id) ON DELETE CASCADE
  );
INSERT INTO "users" VALUES(1,'ricardogueta@gmail.com','rgueta','f6bf371eae09dac59cdf4d72c3196352d3cebe6b732a74451b9378347a136611','Ricardo Gueta','14','+526641752182','M','',1,'MX.BC.TJ.6.CG.SJ','b8f7c9908aa28584',0,0,NULL,'34209a98-3972-438b-8dca-dbe08d1a9156','2026-03-24T18:09:49.898Z','2026-02-13 18:40:34','2026-02-13 18:40:34');
INSERT INTO "users" VALUES(2,'vecino1@gmail.com','Vecino1','f2c3ab6ed2fd0b09e88f782bb40c353867409f08f0aa265bcf8ba95b1102d3bd','Vecino1','1','+526641752182','M','',1,'MX.BC.TJ.6.CG.SJ','6992f568-4487-4e30-9e6b-6c3afcaa9443',0,0,NULL,'df014984-78e0-42c1-833b-678cea29ea36','2026-03-31T14:40:49.317Z','2026-03-30 14:40:49','2026-03-30 14:40:49');
INSERT INTO "users" VALUES(3,'vecino2@gmail.com','Vecino2','382b9799b33cd2d7709d0638e75d025621b3d157ee17bbf7a2de1b5baca477a4','Vecino2','2','+526641752182','M','',1,'MX.BC.TJ.6.CG.SJ','6992f568-4487-4e30-9e6b-6c3afcaa9443',0,0,NULL,'3adfab85-751c-4bfa-a5a5-67447f807d5b','2026-03-31T15:03:58.654Z','2026-03-30 15:03:58','2026-03-30 15:03:58');
CREATE TABLE app_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    log_type TEXT NOT NULL,
    event_type TEXT,
    severity TEXT,


    endpoint TEXT,
    method TEXT,
    status_code INTEGER,
    response_time_ms INTEGER,


    user_id TEXT,
    user_email TEXT,
    client_ip TEXT,
    user_agent TEXT,


    request_body TEXT,
    error_message TEXT,
    error_trace TEXT,
    additional_data TEXT,


    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_date DATE DEFAULT CURRENT_DATE,
    created_time TIME DEFAULT CURRENT_TIME
);
INSERT INTO "app_logs" VALUES(1,'request','pwdRST','info','api/users/pwdRST','GET',200,401,'1.0',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-03-23 18:02:44','2026-03-23','18:02:44');
INSERT INTO "app_logs" VALUES(2,'request','pwdRST','info','api/users/pwdRST','GET',200,313,'1.0',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-03-23 18:09:50','2026-03-23','18:09:50');


CREATE TABLE IF NOT EXISTS "codes" (
   id INTEGER PRIMARY KEY AUTOINCREMENT,
   code TEXT,
   userId INTEGER,
   device_plaform TEXT,
   initial TEXT,
   expiry TEXT,
   enable INTEGER NOT NULL DEFAULT 1 CHECK (enable IN (0,1)),
   comment TEXT,
   createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
   updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
   FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
   );
INSERT INTO "codes" VALUES(1,'84538A4',1,'android','2026-04-02T10:21:15.418','2026-04-02T12:21:15.418',1,replace(' OS: CachyOS x86_64\n        :*++====+++++=============-        .==:           Host: Inspiron 7791 2n1','\n',char(10)),'2026-04-02 17:21:50','2026-04-02 17:21:50');
INSERT INTO "codes" VALUES(9,'17ABA0D',1,'android','2026-04-03T10:15:48.709','2026-04-03T17:15:50.294',1,'jzbdheiwjeiekebehjru','2026-04-03 17:16:19','2026-04-03 17:16:19');
INSERT INTO "codes" VALUES(53,'CC4A955',1,'android','2026-04-03T20:36:57.507','2026-04-03T23:36:58.770',1,'uwueheheu27u2737272ub','2026-04-04 03:37:21','2026-04-04 03:37:21');
INSERT INTO "codes" VALUES(54,'B6BB993',1,'android','2026-04-03T20:40:27.818','2026-04-04T00:40:31.826',1,'u2737472919euehdbdbeej','2026-04-04 03:40:53','2026-04-04 03:40:53');
INSERT INTO "codes" VALUES(55,'D06C8CA',1,'android','2026-04-03T21:19:31.047','2026-04-04T00:20:23.081',1,'iwi2737urhheue8282u','2026-04-04 04:21:09','2026-04-04 04:21:09');
INSERT INTO "codes" VALUES(56,'8C5A6C5',1,'android','2026-04-03T21:25:40.066','2026-04-03T22:25:40.066',1,'8283763yehheiwiwh','2026-04-04 04:26:07','2026-04-04 04:26:07');
INSERT INTO "codes" VALUES(57,'95A4416',1,'android','2026-04-03T22:14:29.309','2026-04-04T01:14:51.315',1,'22:15 hrs  , jwuuu27uiwjehuuwiowowjehh','2026-04-04 05:15:55','2026-04-04 05:15:55');
CREATE TABLE user_files (id INTEGER PRIMARY KEY, userId INTEGER, fileKey TEXT, fileName TEXT);
DELETE FROM sqlite_sequence;
INSERT INTO "sqlite_sequence" VALUES('countries',2);
INSERT INTO "sqlite_sequence" VALUES('states',1);
INSERT INTO "sqlite_sequence" VALUES('cities',1);
INSERT INTO "sqlite_sequence" VALUES('roles',9);
INSERT INTO "sqlite_sequence" VALUES('geolocations',5);
INSERT INTO "sqlite_sequence" VALUES('stores',5);
INSERT INTO "sqlite_sequence" VALUES('admin_info',2);
INSERT INTO "sqlite_sequence" VALUES('configApp',1);
INSERT INTO "sqlite_sequence" VALUES('configApp_adminInfo',2);
INSERT INTO "sqlite_sequence" VALUES('visitors',1);
INSERT INTO "sqlite_sequence" VALUES('code_events',6);
INSERT INTO "sqlite_sequence" VALUES('divisions',1);
INSERT INTO "sqlite_sequence" VALUES('cpus',3);
INSERT INTO "sqlite_sequence" VALUES('cores',3);
INSERT INTO "sqlite_sequence" VALUES('pwdRst',2);
INSERT INTO "sqlite_sequence" VALUES('users',3);
INSERT INTO "sqlite_sequence" VALUES('app_logs',2);
INSERT INTO "sqlite_sequence" VALUES('codes',57);
CREATE INDEX idx_userRoles_userId ON userRoles(userId);
CREATE INDEX idx_userRoles_roleId ON userRoles(roleId);
CREATE INDEX idx_userRoles_user_role ON userRoles(userId, roleId);
CREATE INDEX idx_pwdRST_email ON pwdRST(email);
CREATE INDEX idx_log_type ON app_logs(log_type);
CREATE INDEX idx_event_type ON app_logs(event_type);
CREATE INDEX idx_created_at ON app_logs(created_at);
CREATE INDEX idx_user_id ON app_logs(user_id);
CREATE INDEX idx_endpoint ON app_logs(endpoint);
CREATE INDEX idx_severity ON app_logs(severity);
CREATE INDEX idx_setup_token ON users(setup_token);
