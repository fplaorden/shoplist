const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../db');
const { generateToken, authenticate } = require('../middleware/auth');

// Register
router.post('/register', async (req, res) => {
  const { email, alias, password } = req.body;
  if (!email || !alias || !password)
    return res.status(400).json({ error: 'Email, alias y contraseña son requeridos' });

  if (!/^[a-zA-Z0-9_]{3,20}$/.test(alias))
    return res.status(400).json({ error: 'El alias debe tener 3-20 caracteres alfanuméricos o guiones bajos' });

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await db.query(
      'INSERT INTO users (email, alias, password_hash) VALUES ($1, $2, $3) RETURNING id, email, alias, created_at',
      [email.toLowerCase(), alias, passwordHash]
    );
    const user = result.rows[0];
    const token = generateToken(user);

    // Auto-create a default list for new users
    const listResult = await db.query(
      'INSERT INTO lists (name, owner_id) VALUES ($1, $2) RETURNING *',
      ['Mi lista de la compra', user.id]
    );
    await db.query(
      'INSERT INTO list_members (list_id, user_id, role) VALUES ($1, $2, $3)',
      [listResult.rows[0].id, user.id, 'owner']
    );

    res.status(201).json({ user, token });
  } catch (err) {
    if (err.code === '23505') {
      const field = err.constraint?.includes('email') ? 'email' : 'alias';
      return res.status(409).json({ error: `Este ${field} ya está en uso` });
    }
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email y contraseña requeridos' });

  try {
    const result = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Credenciales incorrectas' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Credenciales incorrectas' });

    const token = generateToken(user);
    res.json({ user: { id: user.id, email: user.email, alias: user.alias }, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, email, alias, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
