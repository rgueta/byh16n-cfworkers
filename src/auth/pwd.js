import { bcrypt } from "bcrypt-web";

// Verificar contraseña existente
async function verifyPwd(pwd, bcryptHash) {
  return await bcrypt.compare(pwd, bcryptHash);
}

// Crear nuevo hash (para nuevos usuarios)
async function hashPwd(pwd) {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(pwd, salt);
}
