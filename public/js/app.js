/**
 * Tinkerer Vote - Frontend Application
 */

// State
let currentUser = null;
let ideas = [];

// DOM Elements
const userSection = document.getElementById('userSection');
const heroSection = document.getElementById('heroSection');
const statsBar = document.getElementById('statsBar');
const submitSection = document.getElementById('submitSection');
const submitForm = document.getElementById('submitForm');
const toggleSubmitBtn = document.getElementById('toggleSubmitBtn');
const ideasList = document.getElementById('ideasList');
const loadingIndicator = document.getElementById('loadingIndicator');
const emptyState = document.getElementById('emptyState');
const errorBanner = document.getElementById('errorBanner');
const errorMessage = document.getElementById('errorMessage');
const editModal = document.getElementById('editModal');

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
  checkUrlErrors();
  await checkAuth();
  await loadStats();
  await loadLeaderboard();
}

// Check for error in URL params
function checkUrlErrors() {
  const params = new URLSearchParams(window.location.search);
  const error = params.get('error');
  
  if (error) {
    const messages = {
      'invalid_state': 'Authentication failed. Please try again.',
      'no_code': 'Authentication was cancelled.',
      'not_member': 'You must be a member of Tinkerer Club to access this site.',
      'auth_failed': 'Authentication failed. Please try again.'
    };
    
    showError(messages[error] || 'An error occurred.');
    
    // Clean URL
    window.history.replaceState({}, document.title, '/');
  }
}

// Auth check
async function checkAuth() {
  try {
    const response = await fetch('/auth/me');
    const data = await response.json();
    
    if (data.user) {
      currentUser = data.user;
      renderLoggedIn();
    } else {
      renderLoggedOut();
    }
  } catch (error) {
    console.error('Auth check failed:', error);
    renderLoggedOut();
  }
}

function renderLoggedIn() {
  heroSection.style.display = 'none';
  statsBar.style.display = 'flex';
  submitSection.style.display = 'block';
  
  userSection.innerHTML = `
    <div class="user-info">
      <img src="${currentUser.avatar_url}" alt="${currentUser.username}" class="user-avatar">
      <span class="user-name">
        ${escapeHtml(currentUser.username)}
        ${currentUser.is_admin ? '<span class="admin-badge">[admin]</span>' : ''}
      </span>
    </div>
    <a href="/auth/logout" class="btn btn-ghost btn-small">LOGOUT</a>
  `;
}

function renderLoggedOut() {
  heroSection.style.display = 'block';
  statsBar.style.display = 'none';
  submitSection.style.display = 'none';
  
  userSection.innerHTML = `
    <a href="/auth/login" class="btn btn-primary btn-small">
      <span class="btn-icon">></span>LOGIN
    </a>
  `;
}

// Stats
async function loadStats() {
  try {
    const response = await fetch('/api/stats');
    const data = await response.json();
    
    document.getElementById('statIdeas').textContent = data.ideas;
    document.getElementById('statVotes').textContent = data.votes;
    document.getElementById('statMembers').textContent = data.members;
  } catch (error) {
    console.error('Failed to load stats:', error);
  }
}

// Leaderboard
async function loadLeaderboard() {
  try {
    loadingIndicator.style.display = 'block';
    emptyState.style.display = 'none';
    
    const response = await fetch('/api/leaderboard');
    const data = await response.json();
    
    ideas = data.ideas;
    renderIdeas();
  } catch (error) {
    console.error('Failed to load leaderboard:', error);
    showError('Failed to load ideas. Please refresh the page.');
  } finally {
    loadingIndicator.style.display = 'none';
  }
}

function renderIdeas() {
  if (ideas.length === 0) {
    ideasList.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }
  
  emptyState.style.display = 'none';
  
  ideasList.innerHTML = ideas.map((idea, index) => {
    const rank = index + 1;
    const isTopIdea = rank === 1 && idea.vote_count > 0;
    const canEdit = currentUser && currentUser.id === idea.author.id;
    const canDelete = currentUser && (currentUser.id === idea.author.id || currentUser.is_admin);
    const canVote = currentUser !== null;
    
    return `
      <div class="idea-card ${isTopIdea ? 'top-idea' : ''}" data-id="${idea.id}">
        <span class="idea-rank ${rank <= 3 ? 'rank-' + rank : ''}">#${rank}</span>
        <div class="idea-header">
          <div class="idea-vote-section">
            <button 
              class="vote-btn ${idea.user_voted ? 'voted' : ''}" 
              onclick="toggleVote(${idea.id})"
              ${!canVote ? 'disabled title="Login to vote"' : ''}
            >
              ${idea.user_voted ? '✓' : '▲'}
            </button>
            <span class="vote-count">${idea.vote_count}</span>
          </div>
          <div class="idea-content">
            <h3 class="idea-title">${escapeHtml(idea.title)}</h3>
            ${idea.description ? `<p class="idea-description">${escapeHtml(idea.description)}</p>` : ''}
          </div>
        </div>
        <div class="idea-meta">
          <div class="idea-author">
            <img src="${idea.author.avatar_url}" alt="${idea.author.username}" class="idea-author-avatar">
            <span class="idea-author-name">${escapeHtml(idea.author.username)}</span>
          </div>
          <span class="idea-date">${formatDate(idea.created_at)}</span>
          ${canEdit || canDelete ? `
            <div class="idea-actions">
              ${canEdit ? `<button class="btn btn-ghost btn-small" onclick="openEditModal(${idea.id})">EDIT</button>` : ''}
              ${canDelete ? `<button class="btn btn-danger btn-small" onclick="deleteIdea(${idea.id})">DELETE</button>` : ''}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// Submit idea
function toggleSubmitForm() {
  const isVisible = submitForm.style.display !== 'none';
  submitForm.style.display = isVisible ? 'none' : 'block';
  toggleSubmitBtn.style.display = isVisible ? 'inline-flex' : 'none';
  
  if (!isVisible) {
    document.getElementById('ideaTitle').focus();
  }
}

async function submitIdea(event) {
  event.preventDefault();
  
  const title = document.getElementById('ideaTitle').value.trim();
  const description = document.getElementById('ideaDescription').value.trim();
  
  if (!title) return;
  
  try {
    const response = await fetch('/api/ideas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description })
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to submit idea');
    }
    
    // Reset form and reload
    document.getElementById('ideaTitle').value = '';
    document.getElementById('ideaDescription').value = '';
    toggleSubmitForm();
    
    await loadStats();
    await loadLeaderboard();
  } catch (error) {
    showError(error.message);
  }
}

// Voting
async function toggleVote(ideaId) {
  if (!currentUser) {
    window.location.href = '/auth/login';
    return;
  }
  
  try {
    const response = await fetch(`/api/votes/${ideaId}`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to vote');
    }
    
    const data = await response.json();
    
    // Update local state
    const idea = ideas.find(i => i.id === ideaId);
    if (idea) {
      idea.user_voted = data.voted;
      idea.vote_count = data.vote_count;
    }
    
    // Re-sort and render
    ideas.sort((a, b) => b.vote_count - a.vote_count || new Date(b.created_at) - new Date(a.created_at));
    renderIdeas();
    
    // Update stats
    await loadStats();
  } catch (error) {
    showError(error.message);
  }
}

// Edit idea
function openEditModal(ideaId) {
  const idea = ideas.find(i => i.id === ideaId);
  if (!idea) return;
  
  document.getElementById('editIdeaId').value = ideaId;
  document.getElementById('editTitle').value = idea.title;
  document.getElementById('editDescription').value = idea.description || '';
  
  editModal.style.display = 'flex';
  document.getElementById('editTitle').focus();
}

function closeEditModal() {
  editModal.style.display = 'none';
}

async function updateIdea(event) {
  event.preventDefault();
  
  const ideaId = document.getElementById('editIdeaId').value;
  const title = document.getElementById('editTitle').value.trim();
  const description = document.getElementById('editDescription').value.trim();
  
  if (!title) return;
  
  try {
    const response = await fetch(`/api/ideas/${ideaId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description })
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to update idea');
    }
    
    closeEditModal();
    await loadLeaderboard();
  } catch (error) {
    showError(error.message);
  }
}

// Delete idea
async function deleteIdea(ideaId) {
  if (!confirm('Are you sure you want to delete this idea? This cannot be undone.')) {
    return;
  }
  
  try {
    const response = await fetch(`/api/ideas/${ideaId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to delete idea');
    }
    
    await loadStats();
    await loadLeaderboard();
  } catch (error) {
    showError(error.message);
  }
}

// Error handling
function showError(message) {
  errorMessage.textContent = message;
  errorBanner.style.display = 'flex';
}

function hideError() {
  errorBanner.style.display = 'none';
}

// Utilities
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
}

// Close modal on escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && editModal.style.display === 'flex') {
    closeEditModal();
  }
});

// Close modal on backdrop click
editModal.addEventListener('click', (e) => {
  if (e.target === editModal) {
    closeEditModal();
  }
});
