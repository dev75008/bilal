CREATE TABLE `access_attempts` (
	`key` text PRIMARY KEY NOT NULL,
	`started` integer NOT NULL,
	`attempts` integer NOT NULL
);
