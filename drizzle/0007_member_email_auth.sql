ALTER TABLE members ADD COLUMN email_verified_at text;
--> statement-breakpoint
CREATE TABLE email_verification_tokens (
  token_hash text PRIMARY KEY NOT NULL,
  member_id text NOT NULL REFERENCES members(id),
  expires_at integer NOT NULL,
  created_at integer NOT NULL,
  used_at integer
);
--> statement-breakpoint
CREATE INDEX email_verification_tokens_member_idx ON email_verification_tokens(member_id);
--> statement-breakpoint
CREATE INDEX email_verification_tokens_expiry_idx ON email_verification_tokens(expires_at);
--> statement-breakpoint
CREATE TABLE password_reset_tokens (
  token_hash text PRIMARY KEY NOT NULL,
  member_id text NOT NULL REFERENCES members(id),
  expires_at integer NOT NULL,
  created_at integer NOT NULL,
  used_at integer
);
--> statement-breakpoint
CREATE INDEX password_reset_tokens_member_idx ON password_reset_tokens(member_id);
--> statement-breakpoint
CREATE INDEX password_reset_tokens_expiry_idx ON password_reset_tokens(expires_at);
