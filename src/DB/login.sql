with vars AS (
    SELECT 'ricardogueta@gmail.com' AS correo
)


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
     state.name,
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
 WHERE u.email = (select correo from vars)
 GROUP BY u.id, u.username, u.email;
