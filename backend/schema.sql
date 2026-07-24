CREATE DATABASE IF NOT EXISTS expense_tracker;
USE expense_tracker;

-- Users
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Groups (e.g. "Flat 3B", "Goa Trip")
CREATE TABLE `groups` (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  created_by INT NOT NULL,
  invite_code VARCHAR(10) NOT NULL UNIQUE,
  currency VARCHAR(3) DEFAULT 'INR',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Group membership
CREATE TABLE group_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  user_id INT NOT NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_membership (group_id, user_id),
  FOREIGN KEY (group_id) REFERENCES `groups`(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Expenses
CREATE TABLE expenses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  paid_by INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  category VARCHAR(50) DEFAULT 'General',
  description VARCHAR(255),
  split_type ENUM('equal', 'custom', 'percentage') DEFAULT 'equal',
  receipt_url VARCHAR(500) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES `groups`(id) ON DELETE CASCADE,
  FOREIGN KEY (paid_by) REFERENCES users(id) ON DELETE CASCADE
);

-- How an expense is split among members
CREATE TABLE expense_splits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  expense_id INT NOT NULL,
  user_id INT NOT NULL,
  share_amount DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Settlements (recorded payments between members)
CREATE TABLE settlements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  from_user INT NOT NULL,
  to_user INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  settled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES `groups`(id) ON DELETE CASCADE,
  FOREIGN KEY (from_user) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (to_user) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_expenses_group ON expenses(group_id);
CREATE INDEX idx_splits_expense ON expense_splits(expense_id);
CREATE INDEX idx_splits_user ON expense_splits(user_id);
CREATE INDEX idx_settlements_group ON settlements(group_id);

-- Personal recurring bills (NOT tied to a group — these are the user's own
-- reminders, e.g. Netflix, phone bill, personal loan EMI)
CREATE TABLE recurring_bills (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  category VARCHAR(50) DEFAULT 'General',
  due_day INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK (due_day BETWEEN 1 AND 28)
);

CREATE INDEX idx_recurring_bills_user ON recurring_bills(user_id);

