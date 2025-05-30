// Get the client
// Create the connection o database
import mysql from 'mysql2/promise'
import jwt from 'jsonwebtoken'

const payload = { userId: 123 }
const secret = 'your_jwt_secret'
const token = jwt.sign(payload, secret, { expiresIn: '1h' })

try {
    jwt.verify(token, secret)
} catch (error) {}

const dbconfig = {
    host: process.env.BDIP,
    user: process.env.BDUSER,
    password: process.env.BDPASS,
    database: process.env.BDNAME,
}

const dbquery = async (query: string, credentials = '') => {
    const sql = await mysql.createConnection(dbconfig)
    const result = await sql.query(query, credentials)

    return result
}

export default dbquery
