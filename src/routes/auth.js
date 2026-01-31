const express = require('express');
const router = express.Router();
const discord = require('../utils/discord');
const { query, queryOne } = require('../config/database');
const { generateState, validateState, isAdmin } = require('../middleware/auth');

/**
 * GET /auth/login
 * Redirect to Discord OAuth
 */
router.get('/login', (req, res) => {
  const state = generateState();
  req.session.oauthState = state;
  
  const authUrl = discord.getAuthUrl(state);
  res.redirect(authUrl);
});

/**
 * GET /auth/callback
 * Handle Discord OAuth callback
 */
router.get('/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    // Validate state to prevent CSRF
    if (!validateState(req.session.oauthState, state)) {
      console.error('Invalid OAuth state');
      return res.redirect('/?error=invalid_state');
    }
    
    // Clear the state
    delete req.session.oauthState;
    
    if (!code) {
      return res.redirect('/?error=no_code');
    }
    
    // Exchange code for token
    const tokenData = await discord.exchangeCode(code);
    const accessToken = tokenData.access_token;
    
    // Get user info
    const discordUser = await discord.getUser(accessToken);
    
    // Verify user is a member of Tinkerer Club
    const isMember = await discord.isTinkererMember(accessToken);
    
    if (!isMember) {
      console.log(`User ${discordUser.username} (${discordUser.id}) is not a Tinkerer Club member`);
      return res.redirect('/?error=not_member');
    }
    
    // Create or update user in database
    const existingUser = await queryOne(
      'SELECT id, discord_id, username, avatar_hash, is_admin FROM users WHERE discord_id = ?',
      [discordUser.id]
    );
    
    let user;
    const adminStatus = isAdmin(discordUser.id);
    
    if (existingUser) {
      // Update existing user
      await query(
        'UPDATE users SET username = ?, avatar_hash = ?, is_admin = ?, last_login = NOW() WHERE discord_id = ?',
        [discordUser.username, discordUser.avatar, adminStatus, discordUser.id]
      );
      user = {
        id: existingUser.id,
        discord_id: discordUser.id,
        username: discordUser.username,
        avatar_hash: discordUser.avatar,
        is_admin: adminStatus
      };
    } else {
      // Create new user
      const result = await query(
        'INSERT INTO users (discord_id, username, avatar_hash, is_admin) VALUES (?, ?, ?, ?)',
        [discordUser.id, discordUser.username, discordUser.avatar, adminStatus]
      );
      user = {
        id: result.insertId,
        discord_id: discordUser.id,
        username: discordUser.username,
        avatar_hash: discordUser.avatar,
        is_admin: adminStatus
      };
    }
    
    // Set session
    req.session.user = user;
    
    console.log(`User ${user.username} logged in successfully`);
    res.redirect('/');
    
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect('/?error=auth_failed');
  }
});

/**
 * GET /auth/logout
 * Clear session and logout
 */
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/');
  });
});

/**
 * GET /auth/me
 * Get current user info
 */
router.get('/me', (req, res) => {
  if (!req.session.user) {
    return res.json({ user: null });
  }
  
  const user = req.session.user;
  res.json({
    user: {
      id: user.id,
      username: user.username,
      avatar_url: discord.getAvatarUrl(user.discord_id, user.avatar_hash),
      is_admin: user.is_admin
    }
  });
});

module.exports = router;
