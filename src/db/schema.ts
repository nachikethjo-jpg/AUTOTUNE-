import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, real } from 'drizzle-orm/pg-core';

// Define the 'users' table.
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Define the 'tunes' table to track custom vehicle tuning maps saved in the cloud.
export const tunes = pgTable('tunes', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  brand: text('brand').notNull(),
  model: text('model').notNull(),
  engineName: text('engine_name').notNull(),
  ecuModel: text('ecu_model').notNull(),
  fuelType: text('fuel_type').notNull(),
  stockHp: integer('stock_hp').notNull(),
  stockTorque: integer('stock_torque').notNull(),
  suggestedPeakHp: integer('suggested_peak_hp'),
  suggestedPeakTorque: integer('suggested_peak_torque'),
  recommendation: text('recommendation'),
  expectedGainsSummary: text('expected_gains_summary'),
  suggestedOffsetIgnitionDegrees: real('suggested_offset_ignition_degrees'),
  suggestedOffsetBoostPct: real('suggested_offset_boost_pct'),
  checksumHex: text('checksum_hex'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Define relationships for the 'users' table.
export const usersRelations = relations(users, ({ many }) => ({
  tunes: many(tunes),
}));

// Define relationships for the 'tunes' table.
export const tunesRelations = relations(tunes, ({ one }) => ({
  user: one(users, {
    fields: [tunes.userId],
    references: [users.id],
  }),
}));
