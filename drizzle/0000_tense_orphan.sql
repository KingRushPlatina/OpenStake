CREATE TABLE "bets" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"game_id" text NOT NULL,
	"amount_cents" bigint NOT NULL,
	"payout_cents" bigint DEFAULT 0 NOT NULL,
	"multiplier" double precision DEFAULT 0 NOT NULL,
	"status" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"seed_pair_id" text,
	"client_seed_snapshot" text,
	"nonce" integer DEFAULT 0 NOT NULL,
	"game_input" jsonb,
	"result" jsonb,
	"secret" jsonb,
	"last_action_key" text,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"settled_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "crash_bets" (
	"id" text PRIMARY KEY NOT NULL,
	"round_id" text NOT NULL,
	"user_id" text NOT NULL,
	"amount_cents" bigint NOT NULL,
	"auto_cashout" double precision,
	"cashout_multiplier" double precision,
	"payout_cents" bigint DEFAULT 0 NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"settled_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "crash_rounds" (
	"id" text PRIMARY KEY NOT NULL,
	"round_number" integer NOT NULL,
	"server_seed" text NOT NULL,
	"server_seed_hash" text NOT NULL,
	"crash_point" double precision NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "faucet_claims" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"amount_cents" bigint NOT NULL,
	"claimed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_states" (
	"user_id" text NOT NULL,
	"game_id" text NOT NULL,
	"state" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "game_states_user_id_game_id_pk" PRIMARY KEY("user_id","game_id")
);
--> statement-breakpoint
CREATE TABLE "ledger_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"amount_cents" bigint NOT NULL,
	"balance_after_cents" bigint NOT NULL,
	"bet_id" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_stats" (
	"user_id" text PRIMARY KEY NOT NULL,
	"total_bets" integer DEFAULT 0 NOT NULL,
	"wagered_cents" bigint DEFAULT 0 NOT NULL,
	"payout_cents" bigint DEFAULT 0 NOT NULL,
	"net_profit_cents" bigint DEFAULT 0 NOT NULL,
	"biggest_win_cents" bigint DEFAULT 0 NOT NULL,
	"biggest_multiplier" double precision DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seed_pairs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"server_seed_encrypted" text NOT NULL,
	"server_seed_hash" text NOT NULL,
	"client_seed" text NOT NULL,
	"nonce" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"revealed_server_seed" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"rotated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"is_bot" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"user_id" text PRIMARY KEY NOT NULL,
	"balance_cents" bigint DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bets" ADD CONSTRAINT "bets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crash_bets" ADD CONSTRAINT "crash_bets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faucet_claims" ADD CONSTRAINT "faucet_claims_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_states" ADD CONSTRAINT "game_states_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_stats" ADD CONSTRAINT "player_stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seed_pairs" ADD CONSTRAINT "seed_pairs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bets_idempotency_unique" ON "bets" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "bets_user_created_idx" ON "bets" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "bets_game_created_idx" ON "bets" USING btree ("game_id","created_at");--> statement-breakpoint
CREATE INDEX "bets_status_idx" ON "bets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "crash_bets_round_idx" ON "crash_bets" USING btree ("round_id");--> statement-breakpoint
CREATE INDEX "crash_bets_user_idx" ON "crash_bets" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "faucet_user_created_idx" ON "faucet_claims" USING btree ("user_id","claimed_at");--> statement-breakpoint
CREATE INDEX "ledger_user_created_idx" ON "ledger_entries" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "ledger_bet_idx" ON "ledger_entries" USING btree ("bet_id");--> statement-breakpoint
CREATE INDEX "seed_pairs_user_active_idx" ON "seed_pairs" USING btree ("user_id","active");--> statement-breakpoint
CREATE UNIQUE INDEX "users_name_unique" ON "users" USING btree ("name");