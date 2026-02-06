const encoder = new TextEncoder();

export async function hashPwd(password, salt) {
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);

  return [...new Uint8Array(hashBuffer)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyPwd(password, salt, hash) {
  const newHash = await hashPwd(password, salt);
  return newHash === hash;
}
