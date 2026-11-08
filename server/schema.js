import {sqliteTable,text,integer} from 'drizzle-orm/sqlite-core';
export const accessAttempts=sqliteTable('access_attempts',{
  key:text('key').primaryKey(),started:integer('started').notNull(),attempts:integer('attempts').notNull(),
});
