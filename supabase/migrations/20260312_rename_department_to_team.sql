-- Migration to rename department to team
ALTER TABLE profiles RENAME COLUMN department TO team;
