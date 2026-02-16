export const autoRefresh = (app) => {
  return async (c, next) => {
    console.log("Estoy en auto refresh...");

    const authHeader = c.req.header("Authorization");
    const refreshToken = c.req.header("X-Refresh-Token");

    // Si hay token de autorización y refresh token
    if (authHeader?.startsWith("Bearer ") && refreshToken) {
      const token = authHeader.split(" ")[1];

      try {
        // Verificar si el token está expirado
        const payload = JSON.parse(atob(token.split(".")[1]));
        const now = Math.floor(Date.now() / 1000);

        // Si el token está expirado
        if (payload.exp < now) {
          console.log("Token expirado, intentando refrescar...");

          // Intentar refrescar el token
          const refreshResponse = await fetch(
            new URL("/api/auth/refresh", c.req.url),
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: authHeader,
              },
              body: JSON.stringify({ refreshToken }),
            },
          );

          if (refreshResponse.ok) {
            const { accessToken } = await refreshResponse.json();
            console.log("Token refrescado exitosamente");

            // Actualizar el header con el nuevo token
            c.req.headers.set("Authorization", `Bearer ${accessToken}`);

            // Continuar con la petición original pero con el nuevo token
            const response = await next();

            // Agregar el nuevo token a la respuesta
            const newResponse = new Response(response.body, response);
            newResponse.headers.set("X-New-Access-Token", accessToken);
            return newResponse;
          } else {
            console.log("Error al refrescar token");
            return c.json(
              {
                error: "Token expired and refresh failed",
                code: "REFRESH_FAILED",
              },
              401,
            );
          }
        }
      } catch (error) {
        console.error("Error en autoRefresh:", error);
      }
    }

    // Si no hay problemas, continuar normalmente
    return next();
  };
};
