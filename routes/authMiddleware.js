const jwt = require('jsonwebtoken');
const secret = process.env.JWT_SECRET || 'jwt_secret_key';
const blacklist = new Set(); // En producción, usar Redis o base de datos

function authMiddleware(req, res, next) {
  const token = req.cookies?.token || req.headers['authorization']?.split(' ')[1];
  if (!token || blacklist.has(token)) {
    return res.status(401).json({ message: 'No autorizado' });
  }
  try {
    req.user = jwt.verify(token, secret);
    next();
  } catch {
    return res.status(401).json({ message: 'Token inválido' });
  }
}

function addToBlacklist(token) {
  blacklist.add(token);
}

module.exports = { authMiddleware, addToBlacklist };
