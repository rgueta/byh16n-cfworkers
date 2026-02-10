export const autoRefreshMiddleware = () => {
  return async (c, next) => {
    // Primero, ejecutar la autenticación normal
    await next();

    // Verificar si la respuesta fue 401 (token expirado)
    if (c.res.status === 401) {
      const authHeader = c.req.header("Authorization");

      if (authHeader && authHeader.startsWith("Bearer ")) {
        const refreshToken = c.req.header("X-Refresh-Token");

        if (refreshToken) {
          // Intentar renovar el token
          try {
            const response = await fetch(new URL("/auth/refresh", c.req.url), {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ refreshToken }),
            });

            if (response.ok) {
              const { accessToken } = await response.json();

              // Ejecutar la solicitud original nuevamente con el nuevo token
              const newReq = new Request(c.req.url, {
                method: c.req.method,
                headers: {
                  ...Object.fromEntries(c.req.headers),
                  Authorization: `Bearer ${accessToken}`,
                },
                body: c.req.body,
              });

              // Crear una nueva respuesta con el nuevo token
              const newResponse = await app.fetch(newReq, c.env);

              // Devolver la nueva respuesta con headers adicionales
              const newRes = new Response(newResponse.body, newResponse);
              newRes.headers.set("X-New-Access-Token", accessToken);
              return newRes;
            }
          } catch (error) {
            console.error("Error refreshing token:", error);
          }
        }
      }
    }
  };
};
