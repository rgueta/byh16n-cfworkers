import { Hono } from "hono";
import { sign, verify } from "hono/jwt";
import { verifyPwd, sha256, randomToken } from "../auth/pwd.js";
import { createAccessToken, createRefreshToken } from "../auth/tokens.js";

export const auth = new Hono();
// Valores por defecto desde environment
const getDefaults = (c) => ({
  accessTokenExpiry: parseInt(c.env.ACCESS_TOKEN_EXPIRY) || 2 * 60,
  refreshTokenExpiry: parseInt(c.env.REFRESH_TOKEN_EXPIRY) || 14 * 24 * 60 * 60,
  refreshTokenLimit: parseInt(c.env.REFRESH_TOKEN_LIMIT) || 5,
});

// En tu endpoint de login

auth.post("/signin", async (c) => {
  const { email, pwd, deviceId } = await c.req.json();

  const user = await c.env.DB.prepare(
    `
    SELECT
        u.id,
        u.name,
        u.pwd,
        u.sim,
        u.email,
        u.location,
        c.id as core,
        u.locked,
        c.name AS coreName,
        c.Sim AS coreSim,
        c.shortName AS coreShortName,
        c.code_expire,
        c.remote,
        cpu.shortName AS cpu,
        country.shortName AS country,
        city.shortName AS city,
        d.id AS div,
        conf.backendUrl,
        conf.localUrl,
        json_group_array(
               json_object(
                   'id', r.id,
                   'name', r.name,
                   'shortName', r.shortName,
                   'level', r.level
                )
           ) as roles,
        COUNT(r.id) as qtyRoles
    FROM users u
    -- Join con cores
    INNER JOIN cores c ON u.coreId = c.id
    -- Join con CPUs
    INNER JOIN cpus cpu ON c.cpuId = cpu.id
    -- Join con divisions
    INNER JOIN divisions d ON d.id = cpu.divisionId
    -- Join con cities
    INNER JOIN cities city ON city.id = d.cityId
    -- Join con states
    INNER JOIN states state ON state.id = city.stateId
    -- Join con countries
    INNER JOIN countries country ON state.countryId = country.id
    -- Join con configApp (con ID específico)
    INNER JOIN configApp conf ON conf.id = 1
    -- Left join con roles para mantener usuarios sin roles
     LEFT JOIN userRoles ur ON u.id = ur.userId
     LEFT JOIN roles r ON ur.roleId = r.id
    WHERE u.email = ?
    GROUP BY u.id, u.username, u.email`,
  )
    .bind(email)
    .first();

  if (!user) return c.json({ error: "Invalid credentials" }, 401);

  const valid = await verifyPwd(pwd, email.toLowerCase(), user.pwd);

  if (!valid) return c.json({ error: "Invalid credentials" }, 401);

  const jsonRoles = user.roles ? JSON.parse(user.roles) : [];
  const primaryRole = jsonRoles.length > 0 ? jsonRoles[0].name : "";

  // Crear objeto user con el rol
  const userForToken = {
    id: user.id,
    role: primaryRole,
    ...user,
  };

  const accessToken = await createAccessToken(c, userForToken);

  const refreshToken = await createRefreshToken(
    c,
    user.id,
    primaryRole,
    deviceId,
  );
  const decode = decodeJwt(accessToken);

  // Fechas CORRECTAS
  const expDate = new Date(decode.exp * 1000);
  const iatDate = new Date(decode.iat * 1000);

  return c.json({
    authToken: accessToken,
    refreshToken: refreshToken,
    userId: user.id,
    userName: user.name,
    roles: jsonRoles,
    sim: user.sim,
    coreSim: user.coreSim,
    pwd: user.pwd,
    locked: user.locked,
    coreId: user.core,
    coreName: user.coreName,
    email: user.email,
    location: user.location,
    backendUrl: user.backendUrl,
    localUrl: user.localUrl,
    code_expiry: user.code_expire,
    iatDate: iatDate.toLocaleString(),
    expDate: expDate.toLocaleString(),
    remote: user.remote,
  });
});

auth.post("/refresh", async (c) => {
  const defaults = getDefaults(c);
  const { refreshToken } = await c.req.json();

  if (!refreshToken) {
    return c.json({ error: "No refresh token" }, 401);
  }

  try {
    // 1. Verificar el token primero
    const payload = await verify(
      refreshToken.trim(),
      c.env.JWT_SECRET,
      "HS256",
    );
    console.log("payload:", payload);

    // 2. Construir la clave según TU formato: refresh:${userId}:${deviceId}
    const key = `refresh:${payload.sub}:${payload.deviceId}`;
    console.log("🔑 Buscando clave en KV:", key);

    // 3. Buscar en KV usando la clave construida
    const refreshData = await c.env.REFRESH_KV.get(key);
    console.log("📦 refreshData desde KV:", refreshData);

    if (!refreshData) {
      return c.json(
        {
          error: "Refresh token not found",
          detail: "El token no existe en KV",
          key: key,
        },
        403,
      );
    }

    // 4. Parsear los datos guardados
    const tokenData = JSON.parse(refreshData);
    console.log("📊 tokenData:", tokenData);

    // 5. Calcular el hash del token recibido para comparar
    const receivedHash = await sha256(refreshToken);

    // 6. Verificar que el hash coincida
    if (receivedHash !== tokenData.hash) {
      return c.json({ error: "Token hash mismatch" }, 403);
    }

    // 7. Verificar expiración
    const now = Math.floor(Date.now() / 1000);

    if (tokenData.expiresAt < now) {
      // Eliminar token expirado
      await c.env.REFRESH_KV.delete(key);
      return c.json({ error: "Refresh token expired" }, 403);
    }

    // 8. Obtener datos actualizados del usuario
    const user = await c.env.DB.prepare(
      `
      SELECT
        u.id,
        u.username,
        u.email,
        u.locked,
        json_group_array(
          json_object(
            'id', r.id,
            'name', r.name,
            'shortName', r.shortName,
            'level', r.level
          )
        ) as roles
      FROM users u
      LEFT JOIN userRoles ur ON u.id = ur.userId
      LEFT JOIN roles r ON ur.roleId = r.id
      WHERE u.id = ? AND u.locked = 0
      GROUP BY u.id
    `,
    )
      .bind(payload.sub)
      .first();

    if (!user) {
      return c.json({ error: "User not found or locked" }, 403);
    }

    const jsonRoles = user.roles ? JSON.parse(user.roles) : [];
    const primaryRole = jsonRoles.length > 0 ? jsonRoles[0].name : "";

    // 9. Verificar si debemos rotar el refresh token
    const timeToExpiry = payload.exp - now;
    const shouldRotate = timeToExpiry <= defaults.refreshTokenLimit;
    console.log(
      "🔄 ¿Rotar token?",
      shouldRotate,
      "Tiempo restante:",
      timeToExpiry,
    );

    // 10. Generar nuevo access token
    const iatDate = now;
    const expDate = iatDate + defaults.accessTokenExpiry;

    const newAccessToken = await sign(
      {
        sub: String(user.id),
        role: primaryRole,
        deviceId: payload.deviceId,
        iat: iatDate,
        exp: expDate,
      },
      c.env.JWT_SECRET,
      "HS256",
    );

    let newRefreshToken = null;
    let responseData = {
      success: true,
      authToken: newAccessToken,
      iatDate: new Date(iatDate * 1000).toISOString(),
      expDate: new Date(expDate * 1000).toISOString(),
    };

    // 11. Rotar refresh token si es necesario
    if (shouldRotate) {
      const newExpiry = iatDate + defaults.refreshTokenExpiry;

      // Generar nuevo refresh token
      newRefreshToken = await sign(
        {
          sub: String(user.id),
          role: primaryRole,
          type: "refresh",
          jti: crypto.randomUUID(),
          deviceId: payload.deviceId,
          iat: iatDate,
          exp: newExpiry,
        },
        c.env.JWT_SECRET,
        "HS256",
      );

      // Hashear el nuevo token
      const newHash = await sha256(newRefreshToken);

      // Guardar nuevo refresh token con TU formato
      const newKey = `refresh:${user.id}:${payload.deviceId}`;
      await c.env.REFRESH_KV.put(
        newKey,
        JSON.stringify({
          hash: newHash,
          userId: String(user.id),
          role: primaryRole,
          deviceId: payload.deviceId,
          issuedAt: Date.now(),
          expiresAt: newExpiry,
        }),
        { expirationTtl: defaults.refreshTokenExpiry },
      );

      // Opcional: Eliminar el refresh token usado
      // await c.env.REFRESH_KV.delete(key);

      responseData.refreshToken = newRefreshToken;
      console.log("✅ Nuevo refresh token generado");
    } else {
      console.log("✅ Usando mismo refresh token");
    }

    return c.json(responseData, 200);
  } catch (err) {
    console.error("❌ Error en refresh:", err);
    return c.json(
      {
        error: "Invalid refresh token",
        message: err instanceof Error ? err.message : "Unknown error",
      },
      403,
    );
  }
});

auth.get("/debug/token/:userId/:deviceId", async (c) => {
  const userId = c.req.param("userId");
  const deviceId = c.req.param("deviceId");

  const key = `refresh:${userId}:${deviceId}`;
  const data = await c.env.REFRESH_KV.get(key);

  if (!data) {
    return c.json({ error: "Token no encontrado" }, 404);
  }

  const tokenData = JSON.parse(data);
  const now = Math.floor(Date.now() / 1000);

  return c.json({
    key: key,
    data: tokenData,
    expired: tokenData.expiresAt < now,
    timeRemaining: tokenData.expiresAt - now,
    exists: true,
  });
});

auth.get("/debug/user/:userId", async (c) => {
  const userId = c.req.param("userId");

  const keys = await c.env.REFRESH_KV.list({ prefix: `refresh:${userId}:` });
  const tokens = [];

  for (const key of keys.keys) {
    const value = await c.env.REFRESH_KV.get(key.name);
    if (value) {
      tokens.push({
        key: key.name,
        value: JSON.parse(value),
        expiration: key.expiration,
      });
    }
  }

  return c.json({
    userId: userId,
    totalTokens: tokens.length,
    tokens: tokens,
  });
});

auth.get("/kv-info", async (c) => {
  // Endpoint para debug - AÑADE ESTO TEMPORALMENTE

  try {
    // 1. Listar todas las keys con prefix refresh:
    const listResult = await c.env.REFRESH_KV.list({
      prefix: "refresh:",
      limit: 1000,
    });

    // console.log("listResult: ", listResult);

    // 2. Si hay keys, obtener una muestra
    const samples = [];
    let count = 0;
    for (const key of listResult.keys.slice(0, 4)) {
      // for (const key of listResult.keys) {
      count++;
      const value = await c.env.REFRESH_KV.get(key.name, "json");
      samples.push({
        key: key.name,
        expiration: key.expiration,
        expiration_date: new Date(key.expiration * 1000).toISOString(),
        value: value,
      });
    }

    console.log("Total:", count);
    console.log(samples);

    return c.json(
      {
        success: true,
      },
      200,
    );

    //   // 3. Probar escribir y leer una key de prueba
    //   const testKey = `refresh:test:${Date.now()}`;
    //   await c.env.REFRESH_KV.put(testKey, JSON.stringify({ test: true }), {
    //     expirationTtl: 60, // 60 segundos
    //   });
    //   const testRead = await c.env.REFRESH_KV.get(testKey);

    //   return c.json({
    //     success: true,
    //     timestamp: Date.now(),
    //     kv_binding_exists: !!c.env.REFRESH_KV,
    //     list_keys_count: listResult.keys.length,
    //     list_complete: listResult.list_complete,
    //     samples: samples,
    //     test_write_read: {
    //       key: testKey,
    //       written: true,
    //       read: testRead ? JSON.parse(testRead) : null,
    //     },
    //   });
    //
  } catch (err) {
    return c.json(
      {
        success: false,
        error: err.message,
        stack: err.stack,
      },
      500,
    );
  }
});

auth.get("/kv-clean", async (c) => {
  try {
    // Autenticación simple (cambia esto por algo más seguro en producción)
    // const auth = c.req.header("Authorization");
    // if (auth !== "Bearer tu-clave-secreta-temporal") {
    //   return c.json({ error: "No autorizado" }, 401);
    // }

    let cursor = undefined;
    let deleted = 0;
    let failed = 0;
    const startTime = Date.now();

    do {
      // Listar keys con prefix "refresh:"
      const list = await c.env.REFRESH_KV.list({
        prefix: "refresh:",
        limit: 1000,
        cursor,
      });

      console.log(`Procesando lote de ${list.keys.length} keys...`);

      // Eliminar cada key
      for (const key of list.keys) {
        try {
          await c.env.REFRESH_KV.delete(key.name);
          deleted++;

          // Mostrar progreso cada 10 keys
          if (deleted % 10 === 0) {
            console.log(`Eliminadas ${deleted} keys...`);
          }
        } catch (err) {
          failed++;
          console.error(`Error eliminando ${key.name}:`, err);
        }
      }

      cursor = list.cursor;
    } while (cursor);

    const duration = (Date.now() - startTime) / 1000;

    return c.json({
      success: true,
      message: "Limpieza completada",
      stats: {
        deleted,
        failed,
        total_processed: deleted + failed,
        duration_seconds: duration,
      },
    });
  } catch (err) {
    return c.json(
      {
        success: false,
        error: err.message,
        stack: err.stack,
      },
      500,
    );
  }
});

const decodeJwt = (token) => {
  const [, payload] = token.split(".");
  return JSON.parse(atob(payload));
};
