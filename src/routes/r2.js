import { Hono } from "hono";

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

// Subir archivo
r2Routes.post("/upload", async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get("file");
    const key = formData.get("key") || file.name;

    if (!file) {
      return c.json({ error: "No file provided" }, 400);
    }

    await c.env.BUCKET.put(key, file);

    return c.json({
      success: true,
      key: key,
      size: file.size,
    });
  } catch (error) {
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
