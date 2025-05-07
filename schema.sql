-- schema for the database
CREATE TABLE users(
id SERIAL PRIMARY KEY,
email VARCHAR(100) NOT NULL UNIQUE,
password VARCHAR(100) NOT NULL
)

-- adds a secret TEXT field to the users table
ALTER TABLE users ADD COLUMN secret TEXT;