import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  numeric,
  jsonb,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("user", {
  id: text("id").primaryKey(), // Using text because Authelia 'Remote-User' is a string username
  name: text("name"),
  email: text("email"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const goalProfiles = pgTable("goal_profile", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  kcal: integer("kcal").notNull(),
  proteinG: integer("protein_g").notNull(),
  fatG: integer("fat_g").notNull(),
  carbsG: integer("carbs_g").notNull(),
  fiberG: integer("fiber_g"),
  validFrom: timestamp("valid_from").defaultNow().notNull(),
  validTo: timestamp("valid_to"),
});

export const foods = pgTable("food", {
  id: serial("id").primaryKey(),
  nameDe: text("name_de").notNull(),
  nameEn: text("name_en"),
  displayName: text("display_name"), // Full specific product name from OFF (e.g. "Sportness Clear Whey Protein Pfirsich Eistee")
  source: varchar("source", { length: 20 }).notNull(), // enum: usda, off, llm, custom
  sourceId: text("source_id"), // Original ID from USDA/OFF to prevent duplicates
  brand: text("brand"),
  ean: text("ean"),
  nutrientsPer100g: jsonb("nutrients_per_100g").notNull(), // format: { kcal, protein, fat, carbs, fiber }
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const meals = pgTable("meal", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  slot: varchar("slot", { length: 20 }).notNull(), // enum: breakfast, lunch, dinner, snack
  photoKey: text("photo_key"),
  rawInput: text("raw_input"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const mealItems = pgTable("meal_item", {
  id: serial("id").primaryKey(),
  mealId: integer("meal_id").notNull().references(() => meals.id, { onDelete: 'cascade' }),
  foodId: integer("food_id").references(() => foods.id),
  grams: numeric("grams").notNull(),
  // Immutable snapshot of the nutrients calculated for this specific amount at time of creation.
  nutrientsSnapshot: jsonb("nutrients_snapshot").notNull(), 
});

export const favorites = pgTable("favorite", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  targetType: varchar("target_type", { length: 20 }).notNull(), // enum: meal, food
  targetId: integer("target_id").notNull(),
  label: text("label").notNull(),
  grams: numeric("grams"), // Portionsgröße für Schnell-Loggen
  sortOrder: integer("sort_order").default(0).notNull(),
});

export const userAliases = pgTable("user_alias", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  triggerPhrase: text("trigger_phrase").notNull(),
  resolvedFoodId: integer("resolved_food_id").references(() => foods.id),
  resolvedGrams: numeric("resolved_grams"),
  confidence: numeric("confidence"),
  usageCount: integer("usage_count").default(1).notNull(),
});

export const correctionEvents = pgTable("correction_event", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  mealId: integer("meal_id").references(() => meals.id, { onDelete: 'cascade' }),
  originalJson: jsonb("original_json").notNull(),
  correctedJson: jsonb("corrected_json").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const ingestionLogs = pgTable("ingestion_log", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  rawInput: text("raw_input"),
  llmResponse: jsonb("llm_response"),
  promptTokens: integer("prompt_tokens"),
  completionTokens: integer("completion_tokens"),
  latencyMs: integer("latency_ms"),
  costUsd: numeric("cost_usd"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// ─── Relations ───────────────────────────────────────────────────────────────
export const mealsRelations = relations(meals, ({ many }) => ({
  items: many(mealItems),
}));

export const mealItemsRelations = relations(mealItems, ({ one }) => ({
  meal: one(meals, { fields: [mealItems.mealId], references: [meals.id] }),
  food: one(foods, { fields: [mealItems.foodId], references: [foods.id] }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  meals: many(meals),
  goalProfiles: many(goalProfiles),
}));

export const goalProfilesRelations = relations(goalProfiles, ({ one }) => ({
  user: one(users, { fields: [goalProfiles.userId], references: [users.id] }),
}));

export const userAliasesRelations = relations(userAliases, ({ one }) => ({
  user: one(users, { fields: [userAliases.userId], references: [users.id] }),
  resolvedFood: one(foods, { fields: [userAliases.resolvedFoodId], references: [foods.id] }),
}));
