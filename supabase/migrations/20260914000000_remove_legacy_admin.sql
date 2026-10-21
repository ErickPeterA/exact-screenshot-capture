-- Removes tables that belonged exclusively to the retired admin/contact flow.
-- Safe for fresh installations, where these tables were never created.
DROP TABLE IF EXISTS app_sessions;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS app_users;
DROP TABLE IF EXISTS leads;
