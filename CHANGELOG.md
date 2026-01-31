# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-01-31

### Added
- Initial release of Tinkerer Vote
- Discord OAuth authentication with server membership verification
- Only Tinkerer Club Discord members can access the application
- Submit project ideas with title and description
- Upvote/unvote ideas (toggle)
- Leaderboard ranking by vote count
- Edit and delete own ideas
- Admin role for Kitze and Chris (can delete any idea)
- Terminal/hacker aesthetic matching tinkerer.club design
- Dark theme with green/cyan accents
- Mobile responsive design
- Docker containerization with security hardening
- Rate limiting on auth and API endpoints
- Session-based authentication with secure cookies
- MariaDB database with prepared statements (SQL injection protection)
- Nginx reverse proxy configuration with SSL
- Terms of Service and Privacy Policy pages

### Security Features
- Discord OAuth with CSRF state parameter protection
- HttpOnly, Secure, SameSite cookies
- Helmet.js security headers
- Rate limiting (100 req/15min API, 20 req/15min auth)
- Non-root Docker container user
- Read-only container filesystem
- Resource limits on container
- Input sanitization and validation
- No secrets in code (environment variables only)

### Tech Stack
- Node.js 20 + Express
- MariaDB with mysql2 driver
- Docker + Docker Compose
- Nginx reverse proxy
- Let's Encrypt SSL

---

## Configuration

### Environment Variables
See `.env.example` for required configuration.

### Admin Users
Admin Discord IDs are configured in `src/middleware/auth.js`:
- Kitze: 103551461266296832
- Chris: 752150652309864489

### Database
Tables are auto-created on first run. See `src/config/database.js` for schema.
