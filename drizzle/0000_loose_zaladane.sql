CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"vehicle_id" integer,
	"padron_number" text,
	"entity" text DEFAULT 'VEHICLE' NOT NULL,
	"entity_id" text,
	"action" text DEFAULT 'UPDATE' NOT NULL,
	"field_name" text NOT NULL,
	"old_value" text,
	"new_value" text,
	"reason" text,
	"ip_address" text,
	"user_email" text NOT NULL,
	"user_name" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "driver_licenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"vehicle_id" integer NOT NULL,
	"person_id" integer,
	"license_number" text,
	"origin_authority" text,
	"issue_date" text,
	"expiration_date" text,
	"is_current" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "insurances" (
	"id" serial PRIMARY KEY NOT NULL,
	"vehicle_id" integer NOT NULL,
	"entity_name" text NOT NULL,
	"policy_number" text,
	"issue_date" text,
	"expiration_date" text,
	"is_current" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "padron_change_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_vehicle_id" integer NOT NULL,
	"target_vehicle_id" integer,
	"requested_padron" text NOT NULL,
	"request_type" text NOT NULL,
	"status" text DEFAULT 'PENDIENTE' NOT NULL,
	"reason" text NOT NULL,
	"requested_by_name" text NOT NULL,
	"requested_by_email" text NOT NULL,
	"reviewed_by_name" text,
	"reviewed_at" timestamp,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "persons" (
	"id" serial PRIMARY KEY NOT NULL,
	"dni" text NOT NULL,
	"full_name" text NOT NULL,
	"address" text,
	"phone" text,
	"status" text DEFAULT 'ACTIVO' NOT NULL,
	"withdrawal_date" text,
	"withdrawal_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "persons_dni_unique" UNIQUE("dni")
);
--> statement-breakpoint
CREATE TABLE "portal_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"type" text DEFAULT 'asamblea' NOT NULL,
	"event_date" text NOT NULL,
	"event_time" text,
	"location" text,
	"description" text,
	"agenda" text,
	"status" text DEFAULT 'upcoming' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "portal_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"subtitle" text,
	"content" text NOT NULL,
	"type" text DEFAULT 'image' NOT NULL,
	"media_url" text,
	"video_url" text,
	"pdf_url" text,
	"pdf_file_name" text,
	"pdf_file_size" text,
	"category" text DEFAULT 'General' NOT NULL,
	"badge_text" text,
	"badge_color" text DEFAULT 'blue',
	"start_date" text,
	"end_date" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_hero_carousel" boolean DEFAULT false NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"author_name" text DEFAULT 'Administración Central',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "road_safety_courses" (
	"id" serial PRIMARY KEY NOT NULL,
	"vehicle_id" integer NOT NULL,
	"person_id" integer,
	"certificate_number" text,
	"issue_date" text,
	"expiration_date" text,
	"is_current" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "system_roles" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"badge_color" text DEFAULT 'indigo' NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"permissions" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "technical_inspections" (
	"id" serial PRIMARY KEY NOT NULL,
	"vehicle_id" integer NOT NULL,
	"center_name" text,
	"certificate_number" text,
	"issue_date" text,
	"expiration_date" text,
	"is_current" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" text NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password" text DEFAULT '123456',
	"role" text DEFAULT 'operator' NOT NULL,
	"assigned_padron" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
CREATE TABLE "vehicle_drivers" (
	"id" serial PRIMARY KEY NOT NULL,
	"vehicle_id" integer NOT NULL,
	"person_id" integer NOT NULL,
	"is_current" boolean DEFAULT true NOT NULL,
	"valid_from" text,
	"valid_until" text,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "vehicle_owners" (
	"id" serial PRIMARY KEY NOT NULL,
	"vehicle_id" integer NOT NULL,
	"person_id" integer NOT NULL,
	"is_primary" boolean DEFAULT true NOT NULL,
	"is_current" boolean DEFAULT true NOT NULL,
	"valid_from" text,
	"valid_until" text,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "vehicle_padron_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"vehicle_id" integer NOT NULL,
	"previous_padron" text NOT NULL,
	"new_padron" text NOT NULL,
	"change_type" text NOT NULL,
	"related_vehicle_id" integer,
	"reason" text,
	"authorization_reference" text,
	"authorized_by" text,
	"changed_by_user_id" text,
	"changed_by_user_name" text,
	"effective_date" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" serial PRIMARY KEY NOT NULL,
	"padron_number" text NOT NULL,
	"plate" text NOT NULL,
	"brand" text NOT NULL,
	"model_year" integer NOT NULL,
	"engine_number" text,
	"driver_id" integer,
	"status" text DEFAULT 'ACTIVO' NOT NULL,
	"withdrawal_date" text,
	"withdrawal_reason" text,
	"withdrawal_user_name" text,
	"requires_review" boolean DEFAULT false NOT NULL,
	"review_notes" text,
	"import_source" text,
	"import_batch_id" text,
	"import_raw_data" text,
	"import_notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "vehicles_padron_number_unique" UNIQUE("padron_number"),
	CONSTRAINT "vehicles_plate_unique" UNIQUE("plate")
);
--> statement-breakpoint
ALTER TABLE "driver_licenses" ADD CONSTRAINT "driver_licenses_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_licenses" ADD CONSTRAINT "driver_licenses_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insurances" ADD CONSTRAINT "insurances_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "padron_change_requests" ADD CONSTRAINT "padron_change_requests_source_vehicle_id_vehicles_id_fk" FOREIGN KEY ("source_vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "padron_change_requests" ADD CONSTRAINT "padron_change_requests_target_vehicle_id_vehicles_id_fk" FOREIGN KEY ("target_vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "road_safety_courses" ADD CONSTRAINT "road_safety_courses_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "road_safety_courses" ADD CONSTRAINT "road_safety_courses_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "technical_inspections" ADD CONSTRAINT "technical_inspections_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_drivers" ADD CONSTRAINT "vehicle_drivers_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_drivers" ADD CONSTRAINT "vehicle_drivers_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_owners" ADD CONSTRAINT "vehicle_owners_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_owners" ADD CONSTRAINT "vehicle_owners_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_padron_history" ADD CONSTRAINT "vehicle_padron_history_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_padron_history" ADD CONSTRAINT "vehicle_padron_history_related_vehicle_id_vehicles_id_fk" FOREIGN KEY ("related_vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_driver_id_persons_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."persons"("id") ON DELETE set null ON UPDATE no action;