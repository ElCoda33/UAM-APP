import crypto from 'node:crypto'

const algorithm = 'aes-192-cbc'
const password = 'LaCalentita.decanato' // Debes usar la misma clave

// La clave y el IV deben ser los mismos que se utilizaron para cifrar los datos
const key = 'LaCalentita.decanato' // Recupera la clave de manera segura
const iv = [24, 89, 75, 23, 96, 42, 127, 45, 2, 34, 79, 11, 46, 181, 78, 103] // Recupera el IV de manera segura

// Crea el descifrador
const decipher = crypto.createDecipheriv(algorithm, key, iv)

let decrypted = ''
decipher.setEncoding('utf8')

decipher.on('data', (chunk) => (decrypted += chunk))
decipher.on('end', () => console.log('Datos descifrados:', decrypted))

// Datos cifrados que deseas descifrar
const encryptedData = '...' // Reemplaza con tus datos cifrados
decipher.write(encryptedData, 'hex')
decipher.end()
