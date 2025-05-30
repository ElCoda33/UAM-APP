// generate-hash.js
const bcrypt = require('bcrypt');

const plainPassword = 'Elkoda33'; // La contraseña que quieres hashear
const saltRounds = 10; // El "cost factor" para bcrypt, 10-12 es común

bcrypt.hash(plainPassword, saltRounds, function(err, hash) {
  if (err) {
    console.error('Error hashing password:', err);
    return;
  }
  console.log('Plain Password:', plainPassword);
  console.log('BCrypt Hash:   ', hash);
  // Ahora puedes copiar este hash y pegarlo en tu base de datos
  // para el campo password_hash del usuario testuser@example.com
});