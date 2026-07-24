const pool = require('../config/db');
const generateInviteCode = require('../utils/generateInviteCode');


async function createGroup(req, res) {
  try {
    const { name, currency } = req.body;
    const userId = req.user.id;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    const groupCurrency = (currency && currency.trim().toUpperCase()) || 'INR';

    
    let inviteCode;
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateInviteCode();
      const [rows] = await pool.query('SELECT id FROM `groups` WHERE invite_code = ?', [candidate]);
      if (rows.length === 0) {
        inviteCode = candidate;
        break;
      }
    }
    if (!inviteCode) {
      return res.status(500).json({ error: 'Could not generate a unique invite code, please try again' });
    }

    const [result] = await pool.query(
      'INSERT INTO `groups` (name, created_by, invite_code, currency) VALUES (?, ?, ?, ?)',
      [name.trim(), userId, inviteCode, groupCurrency]
    );

    const groupId = result.insertId;

    
    await pool.query(
      'INSERT INTO group_members (group_id, user_id) VALUES (?, ?)',
      [groupId, userId]
    );

    res.status(201).json({
      group: { id: groupId, name: name.trim(), invite_code: inviteCode, currency: groupCurrency, created_by: userId }
    });
  } catch (err) {
    console.error('Create group error:', err);
    res.status(500).json({ error: 'Could not create group' });
  }
}


async function joinGroup(req, res) {
  try {
    const { inviteCode } = req.body;
    const userId = req.user.id;

    if (!inviteCode) {
      return res.status(400).json({ error: 'Invite code is required' });
    }

    const [groups] = await pool.query('SELECT * FROM `groups` WHERE invite_code = ?', [inviteCode.toUpperCase()]);
    if (groups.length === 0) {
      return res.status(404).json({ error: 'No group found with that invite code' });
    }

    const group = groups[0];

    const [existing] = await pool.query(
      'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
      [group.id, userId]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'You are already a member of this group' });
    }

    await pool.query(
      'INSERT INTO group_members (group_id, user_id) VALUES (?, ?)',
      [group.id, userId]
    );

    res.status(200).json({ group });
  } catch (err) {
    console.error('Join group error:', err);
    res.status(500).json({ error: 'Could not join group' });
  }
}

async function getMyGroups(req, res) {
  try {
    const userId = req.user.id;

    const [groups] = await pool.query(
      `SELECT g.id, g.name, g.invite_code, g.currency, g.created_by, g.created_at,
              (SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = g.id) AS member_count
       FROM \`groups\` g
       JOIN group_members gm ON gm.group_id = g.id
       WHERE gm.user_id = ?
       ORDER BY g.created_at DESC`,
      [userId]
    );

    res.json({ groups });
  } catch (err) {
    console.error('Get groups error:', err);
    res.status(500).json({ error: 'Could not fetch groups' });
  }
}

async function getGroupById(req, res) {
  try {
    const groupId = req.params.id;
    const userId = req.user.id;

    const [membership] = await pool.query(
      'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, userId]
    );
    if (membership.length === 0) {
      return res.status(403).json({ error: 'You are not a member of this group' });
    }

    const [groups] = await pool.query('SELECT * FROM `groups` WHERE id = ?', [groupId]);
    if (groups.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const [members] = await pool.query(
      `SELECT u.id, u.name, u.email
       FROM users u
       JOIN group_members gm ON gm.user_id = u.id
       WHERE gm.group_id = ?`,
      [groupId]
    );

    res.json({ group: groups[0], members });
  } catch (err) {
    console.error('Get group details error:', err);
    res.status(500).json({ error: 'Could not fetch group details' });
  }
}

async function leaveGroup(req, res) {
  try {
    const groupId = req.params.id;
    const userId = req.user.id;

    const [membership] = await pool.query(
      'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, userId]
    );
    if (membership.length === 0) {
      return res.status(403).json({ error: 'You are not a member of this group' });
    }

    const { getGroupBalanceData } = require('./expenseController');
    const { balances } = await getGroupBalanceData(groupId);
    const yourBalance = balances[String(userId)] || 0;

    if (Math.abs(yourBalance) > 0.01) {
      return res.status(400).json({
        error: yourBalance > 0
          ? `You're still owed ₹${yourBalance.toFixed(2)} in this group. Settle up before leaving.`
          : `You still owe ₹${Math.abs(yourBalance).toFixed(2)} in this group. Settle up before leaving.`
      });
    }

    await pool.query(
      'DELETE FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, userId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Leave group error:', err);
    res.status(500).json({ error: 'Could not leave group' });
  }
}

module.exports = { createGroup, joinGroup, getMyGroups, getGroupById, leaveGroup };