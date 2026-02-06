-- Índices para la tabla users
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_locked ON users(locked);
CREATE INDEX idx_users_blocked ON users(blocked);
CREATE INDEX idx_users_createdAt ON users(createdAt);

-- Índices para la tabla roles
-- CREATE INDEX idx_roles_level ON roles(level);

-- Índices para la tabla user_roles
CREATE INDEX idx_userRoles_userId ON userRoles(userId);
CREATE INDEX idx_userRoles_roleId ON userRoles(roleId);
CREATE INDEX idx_userRoles_user_role ON userRoles(userId, roleId);
