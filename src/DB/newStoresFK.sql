CREATE TABLE "stores" (
	"id"	INTEGER,
	"name"	TEXT,
	"m2"	INTEGER,
	"att"	INTEGER,
	"products"	TEXT,
	"cpuId"	INTEGER,
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("cpuId") REFERENCES "cpus"("id") ON DELETE CASCADE
);
