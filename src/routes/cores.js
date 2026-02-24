import { Hono } from "hono";

const coresRoutes = new Hono();

coresRoutes.get("/:userId", async (c) => {
  const userId = c.req.param("userId");
  try {
    const data = await c.env.DB.prepare(
      `
      SELECT
          c.id,
          c.name,
          c.shortName,
          c.address,
          c.houses,
          c.sim,
          c.email,
          c.enable,
          c.remote,
          c.code_expire,
          c.webService,
          c.contact_name,
          c.contact_email,
          c.contact_cell,
          c.description,
          co.shortName || '.' || s.shortName || '.' || ci.shortName ||
          '.' || d.shortName || '.' || cp.shortName || '.' || c.shortName AS location
      FROM cores c
      JOIN cpus cp ON cp.id = c.cpuId
      JOIN geolocations g ON g.id = c.geoId
      JOIN divisions d ON d.id = cp.divisionId
      JOIN cities ci ON ci.id = d.cityId
      JOIN states s ON s.id = ci.stateId
      JOIN countries co ON co.id = ci.countryId
      ORDER BY c.id;
      `,
    )
      .bind(userId)
      .all();

    if (!data) {
      return c.json({ error: "codigos no encontrados" }, 401);
    }

    return c.json(data || {}, 200);
  } catch (err) {
    return c.json({ msg: err }, 404);
  }
});

coresRoutes.get("/admin/:userId", async (c) => {
  const userId = c.req.param("userId");

  try {
    const data = await c.env.DB.prepare(
      ` SELECT
        c.id,
        c.name,
        c.shortName,
        c.address,
        c.houses,
        c.sim,
        c.email,
        c.enable,
        c.remote,
        c.code_expire,
        c.webService,
        c.contact_name,
        c.contact_email,
        c.contact_cell,
        c.description,
        co.shortName || '.' || s.shortName || '.' || ci.shortName ||
        '.' || d.shortName || '.' || cp.shortName || '.' || c.shortName AS location,
        g.latitud,
        g.longitud
    FROM cores c
    JOIN cpus cp ON cp.id = c.cpuId
    JOIN geolocations g ON g.id = c.geoId
    JOIN divisions d ON d.id = cp.divisionId
    JOIN cities ci ON ci.id = d.cityId
    JOIN states s ON s.id = ci.stateId
    JOIN countries co ON co.id = ci.countryId
      `,
    ).all();

    if (!data) {
      return c.json({ error: "codigos no encontrados" }, 401);
    }

    return c.json(data || {}, 200);
  } catch (err) {
    return c.json({ msg: err }, 404);
  }
});

coresRoutes.put("/update/:userId/:codeId", async (c) => {
  const body = await c.req.json();
  console.log("body-->", body);
  return c.json({ msg: "ok" });
});

coresRoutes.post("/:userId", async (c) => {
  const body = await c.req.json();
  console.log("body-->", body);
  return c.json({ msg: "ok" });
});

coresRoutes.post("/chgItem/:userId", async (c) => {
  const body = await c.req.json();
  console.log("body-->", body);
  return c.json({ msg: "ok" });
});

export default coresRoutes;
