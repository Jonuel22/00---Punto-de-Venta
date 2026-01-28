const express = require('express');
const router = express.Router();
const mysql = require('mysql');
const jwt = require('jsonwebtoken');
const { addToBlacklist } = require('./authMiddleware');
const secret = process.env.JWT_SECRET || 'jwt_secret_key';

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '2002',
  database: 'punto_de_venta'
});

db.connect(err => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('MySQL connected...');
});

// LOGIN: genera y envía JWT como cookie httpOnly
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const query = 'SELECT * FROM usuarios WHERE username = ? AND password = ?';
  db.query(query, [username, password], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Error en el servidor' });
    } else if (results.length > 0) {
      const user = results[0];
      const token = jwt.sign({ id: user.id, username: user.username }, secret, { expiresIn: '2h' });
      res.cookie('token', token, { httpOnly: true, sameSite: 'Strict', secure: false });
      return res.json({ message: 'Login successful', token });
    } else {
      return res.status(401).json({ message: 'Credenciales incorrectas' });
    }
  });
});

// LOGOUT: invalida el token y elimina cookie
router.post('/logout', (req, res) => {
  const token = req.cookies?.token || req.headers['authorization']?.split(' ')[1];
  if (token) addToBlacklist(token);
  res.clearCookie('token');
  res.json({ message: 'Logout successful' });
});

// Verificar sesión/token
router.get('/check', (req, res) => {
  const token = req.cookies?.token || req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No autorizado' });
  try {
    jwt.verify(token, secret);
    res.json({ message: 'Token válido' });
  } catch {
    res.status(401).json({ message: 'Token inválido' });
  }
});

module.exports = router;
