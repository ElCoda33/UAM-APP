import { scrypt, randomFill, createCipheriv } from 'node:crypto'
import crypto from 'crypto'

const algorithm = 'aes-256-cbc'
const key = crypto.randomBytes(32)
const iv = crypto.randomBytes(16)

// const password = "LaCalentita.decanato";

// const encriptar = (password) => {
//   const cipher = crypto.createCipheriv(algorithm, key, iv);
//   const encrypted = Buffer.concat([cipher.update(password),cipher.final()])
//   return {
//     iv: iv.toString("hex"),
//     encrypted: encrypted.toString("hex"),
//     key: key.toString("hex")
//   }
// };

export default function desencriptar() {
    const password = {
        iv: 'b70d9bdaaaaf07e7a69fb3c72f21b8c0',
        key: '682cda1eaabacdf28f0a39be0f1685978e0cc506333bbee4b62ac885734d8a0a',
        encrypted:
            '127d5a36385abf55afd58fb34604694bdbdb360c9d44ac3baee58232ba4d664b',
    }
    const iv = Buffer.from(password.iv, 'hex')
    const encripted = Buffer.from(password.encrypted, 'hex')
    const key = Buffer.from(password.key, 'hex')
    const passwordDesencripted = crypto.createDecipheriv(algorithm, key, iv)

    return Buffer.concat([
        passwordDesencripted.update(encripted),
        passwordDesencripted.final(),
    ]).toString()
}
