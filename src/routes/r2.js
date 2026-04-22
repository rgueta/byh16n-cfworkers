import { Hono } from "hono";
import { addRecord, monthlyFolder } from "../tools.js";
const r2Routes = new Hono();

// Listar archivos en el bucket
r2Routes.get("/list", async (c) => {
  try {
    const objects = await c.env.BUCKET.list();

    return c.json({
      success: true,
      objects: objects.objects,
    });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

r2Routes.get("/list-keys", async (c) => {
  try {
    const objects = await c.env.BUCKET.list();

    // Extraer solo los keys
    const keys = objects.objects.map((obj) => obj.key);

    return c.json({
      success: true,
      count: keys.length,
      keys: keys,
    });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// En tu archivo principal del Worker (Hono)
r2Routes.get("/view/:key", async (c) => {
  let key = decodeURIComponent(c.req.param("key"));

  // Si aún hay %2F, decodificar nuevamente (doble codificación)
  if (key.includes("%2F")) {
    key = decodeURIComponent(key);
  }

  try {
    // Obtener el objeto del bucket local
    const object = await c.env.BUCKET.get(key);

    if (!object) {
      return c.text("Imagen no encontrada", 404);
    }

    // Determinar el tipo de contenido
    const contentType = object.httpMetadata?.contentType || "image/jpeg";

    // Devolver la imagen
    return new Response(object.body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Error al obtener imagen:", error);
    return c.text("Error al cargar la imagen", 500);
  }
});

// Agregar el dashboard de desarrollo
r2Routes.all("/dashboard/*", async (c) => {
  const { default: createHandler } = await import("cf-local-helpers");
  const dashboard = createHandler({ basePath: "/dashboard" });
  return dashboard.fetch(c.req.raw, c.env, c.executionCtx);
});

// Subir archivo
r2Routes.post("/upload", async (c) => {
  try {
    const formData = await c.req.formData();

    const file = formData.get("file");
    const key = formData.get("key");

    const fileBuffer = await file.arrayBuffer();

    const pkg = {
      title: formData.get("title"),
      url: formData.get("url"),
      image: key,
      path: c.env.public_host + "/api/r2/get/",
      description: formData.get("description"),
      location: formData.get("location"),
      size: formData.get("size"),
      userId: formData.get("userId"),
    };

    if (!file) {
      return c.json({ error: "No file provided" }, 400);
    }

    // await c.env.BUCKET.put(key, file);
    // Guardar en R2 con la ruta completa
    await c.env.BUCKET.put(key, fileBuffer, {
      httpMetadata: {
        contentType: file.type,
        contentDisposition: `inline; filename="${key}"`,
      },
      customMetadata: {
        originalName: key,
        uploadPath: formData.get("uploadPath"),
        uploadedAt: new Date().toISOString(),
      },
    });

    const result = addRecord(c.env.DB, "information", pkg);

    if (!(await result).success) {
      c.env.BUCKET.delete(key);
      return c.json(
        {
          success: false,
          error: "Fallo al agregar usuario",
          details: error.message,
        },
        404,
      );
    }

    return c.json({
      success: true,
      key: key,
      size: file.size,
    });
  } catch (error) {
    console.log("error: ", error.message);
    return c.json({ error: error.message }, 500);
  }
});

// Obtener archivo
r2Routes.get("/get/:key", async (c) => {
  try {
    // 1. Decodificar la key por si trae caracteres especiales como '/' (%2F)
    const key = decodeURIComponent(c.req.param("key"));

    const object = await c.env.BUCKET.get(key);

    if (!object) {
      return c.json({ error: "File not found" }, 404);
    }

    // 2. Extraer metadatos y preparar headers
    const headers = new Headers();
    object.writeHttpMetadata(headers); // Esto copia automáticamente contentType, etc.
    headers.set("etag", object.httpEtag);

    // Forzamos el Content-Type si R2 local no lo detecta bien
    const contentType = object.httpMetadata?.contentType || "image/jpeg";
    headers.set("Content-Type", contentType);

    // 3. Retornar el cuerpo del objeto (un ReadableStream)
    return new Response(object.body, {
      headers: headers,
    });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

r2Routes.get("/get_old/:key", async (c) => {
  try {
    const key = decodeURIComponent(c.req.param("key"));
    const object = await c.env.BUCKET.get(key);

    if (!object) {
      return c.json({ error: "File not found" }, 404);
    }

    return new Response(object.body, {
      headers: {
        "Content-Type":
          object.httpMetadata?.contentType || "r2Routeslication/octet-stream",
        "Content-Disposition": `inline; filename="${key}"`,
      },
    });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// Eliminar archivo
r2Routes.delete("/delete/:key", async (c) => {
  try {
    // const key = c.req.param("key");
    const key = decodeURIComponent(c.req.param("key"));
    console.log("Key a eliminar:", key);

    await c.env.BUCKET.delete(key);

    return c.json({
      success: true,
      key: key,
    });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// Subir JSON directamente (útil para tu validación bancaria)
r2Routes.post("/json", async (c) => {
  try {
    const data = await c.req.json();
    const key = data.key || `data_${Date.now()}.json`;

    await c.env.BUCKET.put(key, JSON.stringify(data, null, 2), {
      httpMetadata: { contentType: "application/json" },
    });

    return c.json({
      success: true,
      key: key,
    });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

export default r2Routes;
