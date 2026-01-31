const DISCORD_API_BASE = 'https://discord.com/api/v10';

/**
 * Exchange authorization code for access token
 */
async function exchangeCode(code) {
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID,
    client_secret: process.env.DISCORD_CLIENT_SECRET,
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: process.env.DISCORD_REDIRECT_URI
  });

  const response = await fetch(`${DISCORD_API_BASE}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code: ${error}`);
  }

  return response.json();
}

/**
 * Get user info from Discord
 */
async function getUser(accessToken) {
  const response = await fetch(`${DISCORD_API_BASE}/users/@me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to get user info');
  }

  return response.json();
}

/**
 * Get user's guilds (servers) from Discord
 */
async function getUserGuilds(accessToken) {
  const response = await fetch(`${DISCORD_API_BASE}/users/@me/guilds`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to get user guilds');
  }

  return response.json();
}

/**
 * Check if user is a member of the Tinkerer Club server
 */
async function isTinkererMember(accessToken) {
  const guilds = await getUserGuilds(accessToken);
  const tinkererGuildId = process.env.TINKERER_GUILD_ID;
  
  return guilds.some(guild => guild.id === tinkererGuildId);
}

/**
 * Generate Discord OAuth URL with state parameter
 */
function getAuthUrl(state) {
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID,
    redirect_uri: process.env.DISCORD_REDIRECT_URI,
    response_type: 'code',
    scope: 'identify guilds',
    state: state
  });

  return `https://discord.com/oauth2/authorize?${params}`;
}

/**
 * Generate avatar URL for a Discord user
 */
function getAvatarUrl(userId, avatarHash) {
  if (!avatarHash) {
    // Default avatar based on discriminator (legacy) or user id
    const defaultAvatarIndex = (BigInt(userId) >> 22n) % 6n;
    return `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png`;
  }
  
  const extension = avatarHash.startsWith('a_') ? 'gif' : 'png';
  return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${extension}`;
}

module.exports = {
  exchangeCode,
  getUser,
  getUserGuilds,
  isTinkererMember,
  getAuthUrl,
  getAvatarUrl
};
