// lib/db.ts
import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (pool) {
    return pool;
  }
  // Asegúrate de que las variables de entorno se carguen correctamente.
  // En Next.js, esto suele ocurrir automáticamente si están en .env.local.
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000 // 10 segundos
  });

  // Opcional: Testear la conexión al crear el pool
  pool.getConnection()
    .then(connection => {
      console.log('Successfully connected to the database via pool.');
      connection.release();
    })
    .catch(err => {
      console.error('Error connecting to the database via pool:', err);
      // Podrías querer terminar el proceso si la conexión es crítica al inicio.
      // process.exit(1);
    });


  return pool;
}