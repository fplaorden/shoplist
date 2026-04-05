const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

async function isMember(listId, userId) {
  const r = await db.query(
    'SELECT 1 FROM list_members WHERE list_id = $1 AND user_id = $2',
    [listId, userId]
  );
  return r.rows.length > 0;
}

// Get items for a list
router.get('/list/:listId', async (req, res) => {
  if (!await isMember(req.params.listId, req.user.id))
    return res.status(403).json({ error: 'Sin acceso' });

  try {
    const result = await db.query(
      `SELECT i.*, u.alias as added_by_alias
       FROM items i JOIN users u ON i.added_by = u.id
       WHERE i.list_id = $1
       ORDER BY i.checked ASC, i.created_at DESC`,
      [req.params.listId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
});

// Add item
router.post('/', async (req, res) => {
  const { list_id, name, quantity, category } = req.body;
  if (!list_id || !name)
    return res.status(400).json({ error: 'list_id y name son requeridos' });

  if (!await isMember(list_id, req.user.id))
    return res.status(403).json({ error: 'Sin acceso' });

  try {
    const result = await db.query(
      `INSERT INTO items (list_id, name, quantity, category, added_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [list_id, name, quantity || null, category || null, req.user.id]
    );
    const item = result.rows[0];
    item.added_by_alias = req.user.alias;

    req.io.to(`list:${list_id}`).emit('item_added', item);
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
});

// Toggle item checked
router.patch('/:id/toggle', async (req, res) => {
  try {
    const itemResult = await db.query('SELECT * FROM items WHERE id = $1', [req.params.id]);
    if (!itemResult.rows.length) return res.status(404).json({ error: 'Item no encontrado' });

    const item = itemResult.rows[0];
    if (!await isMember(item.list_id, req.user.id))
      return res.status(403).json({ error: 'Sin acceso' });

    const updated = await db.query(
      'UPDATE items SET checked = NOT checked, updated_at = NOW() WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    const updatedItem = updated.rows[0];
    req.io.to(`list:${item.list_id}`).emit('item_updated', updatedItem);
    res.json(updatedItem);
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
});

// Delete item
router.delete('/:id', async (req, res) => {
  try {
    const itemResult = await db.query('SELECT * FROM items WHERE id = $1', [req.params.id]);
    if (!itemResult.rows.length) return res.status(404).json({ error: 'Item no encontrado' });

    const item = itemResult.rows[0];
    const isOwner = item.added_by === req.user.id;
    const isListOwner = (await db.query(
      'SELECT 1 FROM lists WHERE id = $1 AND owner_id = $2',
      [item.list_id, req.user.id]
    )).rows.length > 0;

    if (!isOwner && !isListOwner)
      return res.status(403).json({ error: 'Solo puedes eliminar tus propios items' });

    await db.query('DELETE FROM items WHERE id = $1', [req.params.id]);
    req.io.to(`list:${item.list_id}`).emit('item_deleted', { id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
});

// Clear checked items
router.delete('/list/:listId/checked', async (req, res) => {
  if (!await isMember(req.params.listId, req.user.id))
    return res.status(403).json({ error: 'Sin acceso' });

  try {
    await db.query(
      'DELETE FROM items WHERE list_id = $1 AND checked = true',
      [req.params.listId]
    );
    req.io.to(`list:${req.params.listId}`).emit('checked_cleared', { listId: req.params.listId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;
