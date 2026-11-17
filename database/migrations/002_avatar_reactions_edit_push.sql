-- SecureChat Database Migration 002: Profile Avatars, Message Edits, Reactions, and Web Push
-- Authors: REAM RITHY & SENG KOEMNAN (Group 7)
-- Aligns incremental migrations with database/schema.sql (MySQL 8.0 / InnoDB / 3NF)

USE securechat;

-- 1. Safely add avatar_url to users if missing
SET @col_avatar := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'avatar_url'
);
SET @sql_avatar := IF(@col_avatar = 0,
    'ALTER TABLE users ADD COLUMN avatar_url MEDIUMTEXT NULL AFTER display_name',
    'SELECT "avatar_url already exists"'
);
PREPARE stmt FROM @sql_avatar;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Safely add is_edited to messages if missing
SET @col_edited := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'messages' AND COLUMN_NAME = 'is_edited'
);
SET @sql_edited := IF(@col_edited = 0,
    'ALTER TABLE messages ADD COLUMN is_edited BOOLEAN DEFAULT FALSE AFTER delivery_status',
    'SELECT "is_edited already exists"'
);
PREPARE stmt FROM @sql_edited;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. MessageReactions Table (Real-Time Emoji Reactions)
CREATE TABLE IF NOT EXISTS message_reactions (
    id VARCHAR(36) PRIMARY KEY,
    message_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    emoji VARCHAR(16) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_message_reaction (message_id, user_id),
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_reaction_message (message_id),
    INDEX idx_reaction_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. PushSubscriptions Table (W3C Web Push Subscriptions)
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    endpoint TEXT NOT NULL,
    p256dh VARCHAR(255) NOT NULL,
    auth VARCHAR(255) NOT NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_push_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
