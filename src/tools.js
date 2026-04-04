export const getLocalISOString = () => {
  const date = new Date();

  const formatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
    hour12: false,
    timeZoneName: "longOffset",
  };

  const formatter = new Intl.DateTimeFormat("es-MX", formatOptions);
  const parts = formatter.formatToParts(date);

  // Procesar las partes para construir el string ISO local
  const values = {};
  parts.forEach((part) => {
    values[part.type] = part.value;
  });

  // return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}.${values.fractionalSecond}${values.timeZoneName.replace("GMT", "")}`;
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}.${values.fractionalSecond}`;
};

/*
 * Inserta un log en la tabla app_logs de D1
 * @param {Object} env - Entorno de Cloudflare Worker
 * @param {Object} logData - Datos del log
 * @returns {Promise<Object>}
 *
 */
export const insertLog = async (DB, logData) => {
  const {
    log_type,
    event_type = null,
    severity = "info",
    endpoint = null,
    method = null,
    status_code = null,
    response_time_ms = null,
    user_id = null,
    user_email = null,
    client_ip = null,
    user_agent = null,
    request_body = null,
    error_message = null,
    error_trace = null,
    additional_data = null,
  } = logData;

  const query = `
          INSERT INTO app_logs (
              log_type, event_type, severity, endpoint, method,
              status_code, response_time_ms, user_id, user_email,
              client_ip, user_agent, request_body, error_message,
              error_trace, additional_data
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

  const params = [
    log_type,
    event_type,
    severity,
    endpoint,
    method,
    status_code,
    response_time_ms,
    user_id,
    user_email,
    client_ip,
    user_agent,
    request_body,
    error_message,
    error_trace,
    additional_data,
  ];

  try {
    const stmt = DB.prepare(query);
    const result = await stmt.bind(...params).run();
    return { success: true, meta: result };
  } catch (error) {
    console.error("Error inserting log:", error);
    // No lanzamos el error para no afectar la respuesta principal
    return { success: false, error: error.message };
  }
};

export const addRecord = async (DB, table, fields) => {
  // Validar que hay campos para insertar
  if (!fields || Object.keys(fields).length === 0) {
    throw new Error("No se proporcionaron campos para insertar");
  }

  // Obtener las columnas y valores
  const columns = Object.keys(fields);
  const values = Object.values(fields);

  // Crear placeholders para SQL (?, ?, ?)
  const placeholders = values.map(() => "?").join(", ");

  // Construir la consulta SQL
  const sql = `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`;

  try {
    // Ejecutar la inserción
    const result = await DB.prepare(sql)
      .bind(...values)
      .run();

    // Obtener el ID del registro insertado
    const lastId = result.meta.last_row_id;

    // Obtener el registro completo recién insertado
    const selectSql = `SELECT * FROM ${table} WHERE id = ?`;
    const insertedRecord = await DB.prepare(selectSql).bind(lastId).first(); // .first() retorna un solo registro

    return {
      success: true,
      meta: result.meta,
      id: lastId,
      data: insertedRecord,
    };
  } catch (error) {
    console.error(`Error insertando en ${table}:`, error);
    throw new Error(`Error al insertar registro: ${error.message}`);
  }
};
