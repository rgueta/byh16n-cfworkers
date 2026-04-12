import { Hono } from "hono";
import { verifyToken, verifyRoleLevel } from "../auth/auth.js";

const infoRoutes = new Hono();

infoRoutes.get("/:userId/:now", async (c) => {
  const userId = c.req.param("userId");
  try {
    // const data = await c.env.DB.prepare(
    //   `
    //   SELECT
    //       cp.id,
    //       cp.name,
    //       co.shortName || '.' || s.shortName || '.' || ci.shortName ||
    //       '.' || d.shortName || '.' || cp.shortName AS location
    //   FROM cpus cp
    //   LEFT JOIN divisions d ON d.id = cp.divisionId
    //   LEFT JOIN cities ci ON ci.id = d.cityId
    //   LEFT JOIN states s ON s.id = ci.stateId
    //   LEFT JOIN countries co ON co.id = ci.countryId
    //   LEFT JOIN cores c ON cp.id = c.cpuId
    //   LEFT JOIN geolocations g ON g.id = c.geoId
    //   GROUP BY cp.id, cp.name, co.shortName, s.shortName, ci.shortName, d.shortName, cp.shortName
    //   ORDER BY cp.id;
    //   `,
    // ).all();

    // if (!data) {
    //   return c.json({ error: "codigos no encontrados" }, 401);
    // }
    //
    const data = [
      {
        id: 1,
        title: "Aqui va el titulo..",
        url: "http://google.com",
        description: "Description",
        image: "IMG-20260406-WA0002.jpg",
        path: "http://192.168.1.170:8787/api/r2/get/",
        updatedAt: "2024/01/28 21:46:11",
      },
      {
        id: 2,
        title: "Aqui va el titulo..",
        url: "http://google.com",
        description: "Description",
        image: "IMG-20260407-WA0001.jpg",
        path: "http://192.168.1.170:8787/api/r2/get/",
        updatedAt: "2024/01/28 21:46:11",
      },
      {
        id: 2,
        title: "Aqui va el titulo..",
        url: "http://google.com",
        description: "Description",
        image: "MX.BC.TJ.6.CG.SJ/42026/1775799917886_image.jpg",
        path: "http://192.168.1.170:8787/api/r2/get/",
        updatedAt: "2024/01/28 21:46:11",
      },
    ];

    return c.json(data || {}, 200);
  } catch (err) {
    return c.json({ msg: err }, 404);
  }
});

infoRoutes.post("/:userId", async (c) => {
  const body = c.req.body();
  console.log("info: ", body);
  return c.json({ success: true }, 200);
});

export default infoRoutes;
