export async function insertarDesdeJSON(db, tabla, data) {
  const keys = Object.keys(data);
  const values = Object.values(data);

  const columnas = keys.join(", ");
  const placeholders = keys.map(() => "?").join(", ");

  const stmt = db.prepare(
    `INSERT INTO ${tabla} (${columnas}) VALUES (${placeholders})`,
  );

  const result = await stmt.bind(...values).run();

  return result.meta.last_row_id;
}
