import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey() {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error("ENCRYPTION_SECRET nao configurada nas variaveis de ambiente.");
  }
  // Garante que a chave tenha 32 bytes para o AES-256
  return crypto.createHash("sha256").update(secret).digest();
}

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  const authTag = cipher.getAuthTag().toString("hex");
  
  // Retorna iv:authTag:encrypted
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

export function decrypt(cipherText: string): string {
  const [ivHex, authTagHex, encryptedHex] = cipherText.split(":");
  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error("Formato de texto cifrado invalido.");
  }

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
  
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");
  
  return decrypted;
}

export function tryDecrypt(text: string | undefined | null): string | undefined {
  if (!text) return undefined;
  try {
    return decrypt(text);
  } catch {
    // Se falhar, assume que ja esta em texto limpo (para retrocompatibilidade durante a migracao)
    return text;
  }
}
