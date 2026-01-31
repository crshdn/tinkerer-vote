const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../config/database');
const { requireAuth, requireAdmin, sanitizeInput, isAdmin } = require('../middleware/auth');
const { getAvatarUrl } = require('../utils/discord');

/**
 * GET /api/leaderboard
 * Get all ideas ranked by votes
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const ideas = await query(`
      SELECT 
        i.id,
        i.title,
        i.description,
        i.created_at,
        i.updated_at,
        u.id as author_id,
        u.username as author_username,
        u.discord_id as author_discord_id,
        u.avatar_hash as author_avatar,
        COUNT(v.id) as vote_count
      FROM ideas i
      JOIN users u ON i.author_id = u.id
      LEFT JOIN votes v ON i.id = v.idea_id
      GROUP BY i.id
      ORDER BY vote_count DESC, i.created_at DESC
    `);
    
    // Get current user's votes if logged in
    let userVotes = [];
    if (req.session.user) {
      const votes = await query(
        'SELECT idea_id FROM votes WHERE user_id = ?',
        [req.session.user.id]
      );
      userVotes = votes.map(v => v.idea_id);
    }
    
    const result = ideas.map(idea => ({
      id: idea.id,
      title: idea.title,
      description: idea.description,
      created_at: idea.created_at,
      updated_at: idea.updated_at,
      author: {
        id: idea.author_id,
        username: idea.author_username,
        avatar_url: getAvatarUrl(idea.author_discord_id, idea.author_avatar)
      },
      vote_count: parseInt(idea.vote_count),
      user_voted: userVotes.includes(idea.id)
    }));
    
    res.json({ ideas: result });
    
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

/**
 * POST /api/ideas
 * Create a new idea
 */
router.post('/ideas', requireAuth, async (req, res) => {
  try {
    const title = sanitizeInput(req.body.title, 200);
    const description = sanitizeInput(req.body.description, 2000);
    
    if (!title || title.length < 3) {
      return res.status(400).json({ error: 'Title must be at least 3 characters' });
    }
    
    const result = await query(
      'INSERT INTO ideas (title, description, author_id) VALUES (?, ?, ?)',
      [title, description, req.session.user.id]
    );
    
    const idea = await queryOne(`
      SELECT 
        i.id,
        i.title,
        i.description,
        i.created_at,
        i.updated_at,
        u.id as author_id,
        u.username as author_username,
        u.discord_id as author_discord_id,
        u.avatar_hash as author_avatar
      FROM ideas i
      JOIN users u ON i.author_id = u.id
      WHERE i.id = ?
    `, [result.insertId]);
    
    console.log(`User ${req.session.user.username} created idea: ${title}`);
    
    res.status(201).json({
      idea: {
        id: idea.id,
        title: idea.title,
        description: idea.description,
        created_at: idea.created_at,
        updated_at: idea.updated_at,
        author: {
          id: idea.author_id,
          username: idea.author_username,
          avatar_url: getAvatarUrl(idea.author_discord_id, idea.author_avatar)
        },
        vote_count: 0,
        user_voted: false
      }
    });
    
  } catch (error) {
    console.error('Create idea error:', error);
    res.status(500).json({ error: 'Failed to create idea' });
  }
});

/**
 * PUT /api/ideas/:id
 * Update an idea (author only)
 */
router.put('/ideas/:id', requireAuth, async (req, res) => {
  try {
    const ideaId = parseInt(req.params.id);
    const idea = await queryOne('SELECT * FROM ideas WHERE id = ?', [ideaId]);
    
    if (!idea) {
      return res.status(404).json({ error: 'Idea not found' });
    }
    
    // Only author can edit
    if (idea.author_id !== req.session.user.id) {
      return res.status(403).json({ error: 'You can only edit your own ideas' });
    }
    
    const title = sanitizeInput(req.body.title, 200);
    const description = sanitizeInput(req.body.description, 2000);
    
    if (!title || title.length < 3) {
      return res.status(400).json({ error: 'Title must be at least 3 characters' });
    }
    
    await query(
      'UPDATE ideas SET title = ?, description = ? WHERE id = ?',
      [title, description, ideaId]
    );
    
    console.log(`User ${req.session.user.username} updated idea ${ideaId}`);
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Update idea error:', error);
    res.status(500).json({ error: 'Failed to update idea' });
  }
});

/**
 * DELETE /api/ideas/:id
 * Delete an idea (author or admin)
 */
router.delete('/ideas/:id', requireAuth, async (req, res) => {
  try {
    const ideaId = parseInt(req.params.id);
    const idea = await queryOne('SELECT * FROM ideas WHERE id = ?', [ideaId]);
    
    if (!idea) {
      return res.status(404).json({ error: 'Idea not found' });
    }
    
    // Only author or admin can delete
    const isAuthor = idea.author_id === req.session.user.id;
    const userIsAdmin = req.session.user.is_admin;
    
    if (!isAuthor && !userIsAdmin) {
      return res.status(403).json({ error: 'You can only delete your own ideas' });
    }
    
    await query('DELETE FROM ideas WHERE id = ?', [ideaId]);
    
    console.log(`User ${req.session.user.username} deleted idea ${ideaId}`);
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Delete idea error:', error);
    res.status(500).json({ error: 'Failed to delete idea' });
  }
});

/**
 * POST /api/votes/:ideaId
 * Vote for an idea (toggle)
 */
router.post('/votes/:ideaId', requireAuth, async (req, res) => {
  try {
    const ideaId = parseInt(req.params.ideaId);
    const userId = req.session.user.id;
    
    // Check if idea exists
    const idea = await queryOne('SELECT id FROM ideas WHERE id = ?', [ideaId]);
    if (!idea) {
      return res.status(404).json({ error: 'Idea not found' });
    }
    
    // Check if user already voted
    const existingVote = await queryOne(
      'SELECT id FROM votes WHERE user_id = ? AND idea_id = ?',
      [userId, ideaId]
    );
    
    let voted;
    if (existingVote) {
      // Remove vote
      await query('DELETE FROM votes WHERE id = ?', [existingVote.id]);
      voted = false;
      console.log(`User ${req.session.user.username} removed vote from idea ${ideaId}`);
    } else {
      // Add vote
      await query(
        'INSERT INTO votes (user_id, idea_id) VALUES (?, ?)',
        [userId, ideaId]
      );
      voted = true;
      console.log(`User ${req.session.user.username} voted for idea ${ideaId}`);
    }
    
    // Get updated vote count
    const result = await queryOne(
      'SELECT COUNT(*) as count FROM votes WHERE idea_id = ?',
      [ideaId]
    );
    
    res.json({
      voted: voted,
      vote_count: parseInt(result.count)
    });
    
  } catch (error) {
    console.error('Vote error:', error);
    res.status(500).json({ error: 'Failed to process vote' });
  }
});

/**
 * GET /api/stats
 * Get overall statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const [ideaCount] = await query('SELECT COUNT(*) as count FROM ideas');
    const [voteCount] = await query('SELECT COUNT(*) as count FROM votes');
    const [userCount] = await query('SELECT COUNT(*) as count FROM users');
    
    res.json({
      ideas: parseInt(ideaCount.count),
      votes: parseInt(voteCount.count),
      members: parseInt(userCount.count)
    });
    
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
