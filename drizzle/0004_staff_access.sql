CREATE TABLE staff_access (username text PRIMARY KEY NOT NULL REFERENCES admin_users(username),role text NOT NULL CHECK(role IN ('super_admin','manager','sales','reception')),disabled integer NOT NULL DEFAULT 0 CHECK(disabled IN (0,1)));
--> statement-breakpoint
CREATE TABLE staff_audit_events (id text PRIMARY KEY NOT NULL,actor text NOT NULL,target text NOT NULL,action text NOT NULL,created_at text NOT NULL);
--> statement-breakpoint
CREATE INDEX staff_audit_target_idx ON staff_audit_events(target,created_at);
--> statement-breakpoint
INSERT INTO staff_access(username,role,disabled) SELECT username,'super_admin',0 FROM admin_users WHERE username=(SELECT username FROM admin_users ORDER BY rowid ASC LIMIT 1);
