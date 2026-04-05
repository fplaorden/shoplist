const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// Get all lists for current user
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT l.*, u.alias as owner_alias,
        (SELECT COUNT(*) FROM items WHERE list_id = l.id AND checked = false) as pending_count,
        (SELECT COUNT(*) FROM list_members WHERE list_id = l.id) as member_count
       FROM lists l
       JOIN list_members lm ON l.id = lm.list_id
       JOIN users u ON l.owner_id = u.id
       WHERE lm.user_id = $1
       ORDER BY l.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Create list
router.post('/', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });

  try {
    const result = await db.query(
      'INSERT INTO lists (name, owner_id) VALUES ($1, $2) RETURNING *',
      [name, req.user.id]
    );
    const list = result.rows[0];
    await db.query(
      'INSERT INTO list_members (list_id, user_id, role) VALUES ($1, $2, $3)',
      [list.id, req.user.id, 'owner']
    );
    res.status(201).json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Get list members
router.get('/:id/members', async (req, res) => {
  try {
    const member = await db.query(
      'SELECT 1 FROM list_members WHERE list_id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!member.rows.length) return res.status(403).json({ error: 'Sin acceso' });

    const result = await db.query(
      `SELECT u.id, u.alias, u.email, lm.role, lm.joined_at
       FROM list_members lm JOIN users u ON lm.user_id = u.id
       WHERE lm.list_id = $1 ORDER BY lm.joined_at ASC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
});

// Delete list (owner only)
router.delete('/:id', async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM lists WHERE id = $1 AND owner_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (!result.rows.length) return res.status(403).json({ error: 'No autorizado' });
    req.io.to(`list:${req.params.id}`).emit('list_deleted', { listId: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;
