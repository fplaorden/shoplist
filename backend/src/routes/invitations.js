const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// Create invite link for a list
router.post('/create', async (req, res) => {
  const { list_id } = req.body;
  if (!list_id) return res.status(400).json({ error: 'list_id requerido' });

  try {
    // Check that current user is owner
    const ownerCheck = await db.query(
      'SELECT 1 FROM lists WHERE id = $1 AND owner_id = $2',
      [list_id, req.user.id]
    );
    if (!ownerCheck.rows.length)
      return res.status(403).json({ error: 'Solo el propietario puede invitar' });

    const token = uuidv4();
    const result = await db.query(
      `INSERT INTO invitations (list_id, invited_by, invite_token)
       VALUES ($1, $2, $3) RETURNING *`,
      [list_id, req.user.id, token]
    );
    res.status(201).json({ ...result.rows[0], invite_token: token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Get invite info (public — no auth required to preview)
router.get('/info/:token', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT i.*, l.name as list_name, u.alias as invited_by_alias
       FROM invitations i
       JOIN lists l ON i.list_id = l.id
       JOIN users u ON i.invited_by = u.id
       WHERE i.invite_token = $1 AND i.status = 'pending' AND i.expires_at > NOW()`,
      [req.params.token]
    );
    if (!result.rows.length)
      return res.status(404).json({ error: 'Invitación no válida o expirada' });

    const inv = result.rows[0];
    res.json({ list_name: inv.list_name, invited_by_alias: inv.invited_by_alias });
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
});

// Accept invitation
router.post('/accept/:token', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM invitations
       WHERE invite_token = $1 AND status = 'pending' AND expires_at > NOW()`,
      [req.params.token]
    );
    if (!result.rows.length)
      return res.status(404).json({ error: 'Invitación no válida o expirada' });

    const inv = result.rows[0];

    // Check already member
    const already = await db.query(
      'SELECT 1 FROM list_members WHERE list_id = $1 AND user_id = $2',
      [inv.list_id, req.user.id]
    );
    if (already.rows.length)
      return res.status(409).json({ error: 'Ya eres miembro de esta lista' });

    await db.query(
      'INSERT INTO list_members (list_id, user_id, role) VALUES ($1, $2, $3)',
      [inv.list_id, req.user.id, 'member']
    );
    await db.query(
      "UPDATE invitations SET status = 'accepted' WHERE id = $1",
      [inv.id]
    );

    // Notify existing members via socket
    req.io.to(`list:${inv.list_id}`).emit('member_joined', {
      alias: req.user.alias,
      listId: inv.list_id
    });

    const listResult = await db.query('SELECT * FROM lists WHERE id = $1', [inv.list_id]);
    res.json({ success: true, list: listResult.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Get active invitations for a list
router.get('/list/:listId', async (req, res) => {
  try {
    const ownerCheck = await db.query(
      'SELECT 1 FROM lists WHERE id = $1 AND owner_id = $2',
      [req.params.listId, req.user.id]
    );
    if (!ownerCheck.rows.length)
      return res.status(403).json({ error: 'Solo el propietario puede ver invitaciones' });

    const result = await db.query(
      `SELECT * FROM invitations
       WHERE list_id = $1 AND status = 'pending' AND expires_at > NOW()
       ORDER BY created_at DESC`,
      [req.params.listId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;
