-- Tinkerer Vote Database Initialization
-- Run this script to set up the database and user

-- Create database
CREATE DATABASE IF NOT EXISTS tinkerer_vote
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Create dedicated user with minimal permissions
-- IMPORTANT: Change the password before running!
CREATE USER IF NOT EXISTS 'tinkerer_vote_user'@'%' 
  IDENTIFIED BY 'CHANGE_THIS_PASSWORD';

-- Grant only necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON tinkerer_vote.* TO 'tinkerer_vote_user'@'%';

-- Flush privileges
FLUSH PRIVILEGES;

-- Switch to the database
USE tinkerer_vote;

-- Tables are created automatically by the application on startup
-- See src/config/database.js for schema

-- Done!
SELECT 'Database setup complete!' AS status;
