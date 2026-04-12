import { Hono } from "hono";
import { monthlyFolder } from "../tools.js";
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

// En tu archivo principal del Worker (Hono)
r2Routes.get("/view/:key", async (c) => {
  const key = decodeURIComponent(c.req.param("key"));

  console.log("decoded key: ", key);
  // return c.text("Imagen no encontrada", 200);

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
    // formData.set(
    //   "locationFolder",
    //   formData.get("locationFolder") + "/" + (await monthlyFolder()),
    // );

    const file = formData.get("file");
    const key = formData.key || file.name;

    const folderPath =
      formData.get("locationFolder") + "/" + (await monthlyFolder());

    const fullKey = `${folderPath}/${key}`;
    console.log("fullKey: ", fullKey);

    const fileBuffer = await file.arrayBuffer();

    // const key =
    //   formData.get("locationFolder") + "/" + (await monthlyFolder()) ||
    //   file.name;

    console.log("formData: ", formData);

    return c.json({ success: true }, 200);

    if (!file) {
      return c.json({ error: "No file provided" }, 400);
    }

    // await c.env.BUCKET.put(key, file);
    //
    // Guardar en R2 con la ruta completa
    await c.env.BUCKET.put(fullKey, fileBuffer, {
      httpMetadata: {
        contentType: file.type,
        contentDisposition: `inline; filename="${key}"`,
      },
      customMetadata: {
        originalName: key,
        uploadPath: folderPath,
        uploadedAt: new Date().toISOString(),
      },
    });

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
    const key = c.req.param("key");
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
    const key = c.req.param("key");
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
