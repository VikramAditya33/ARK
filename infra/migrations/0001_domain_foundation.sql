CREATE TYPE "public"."approval_state" AS ENUM('pending', 'approved', 'rejected', 'expired');--> statement-breakpoint
CREATE TYPE "public"."build_state" AS ENUM('queued', 'assembling', 'validating', 'snapshotting', 'ready');--> statement-breakpoint
CREATE TYPE "public"."capture_method" AS ENUM('api', 'export', 'network', 'browser', 'desktop', 'manual');--> statement-breakpoint
CREATE TYPE "public"."capture_state" AS ENUM('queued', 'provisioning', 'capturing', 'validating', 'normalizing', 'publishing', 'succeeded');--> statement-breakpoint
CREATE TYPE "public"."data_classification" AS ENUM('public', 'internal', 'confidential', 'restricted', 'credential');--> statement-breakpoint
CREATE TYPE "public"."drill_state" AS ENUM('queued', 'provisioning', 'injecting', 'executing', 'verifying', 'reporting', 'passed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."incident_state" AS ENUM('declared', 'assessing', 'awaiting_approval', 'activating', 'active', 'reconciling', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."reconciliation_state" AS ENUM('proposed', 'awaiting_approval', 'executing', 'applied', 'conflicted', 'failed');--> statement-breakpoint
CREATE TYPE "public"."solari_resource_state" AS ENUM('requested', 'created', 'connected', 'releasing', 'released', 'cleanup_failed');--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"aggregate_type" text NOT NULL,
	"aggregate_id" text NOT NULL,
	"actor" jsonb NOT NULL,
	"source" text NOT NULL,
	"change" jsonb NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"idempotency_key" text NOT NULL,
	"causation_id" uuid,
	"correlation_id" text NOT NULL,
	"classification" "data_classification" NOT NULL,
	"provenance" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audit_events_org_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "state_transitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"machine" text NOT NULL,
	"aggregate_id" uuid NOT NULL,
	"from_state" text NOT NULL,
	"to_state" text NOT NULL,
	"revision" integer NOT NULL,
	"idempotency_key" text NOT NULL,
	"correlation_id" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "state_transitions_org_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "capabilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"owner" text NOT NULL,
	"criticality" text NOT NULL,
	"current_version_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "capabilities_org_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "capability_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"capability_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"checksum" text NOT NULL,
	"specification" jsonb NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "capability_versions_org_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "verifier_specs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"capability_version_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"version" text NOT NULL,
	"checksum" text NOT NULL,
	"config" jsonb NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "verifier_specs_org_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "capture_cursors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"connector_instance_id" uuid NOT NULL,
	"stream" text NOT NULL,
	"partition" text DEFAULT '' NOT NULL,
	"cursor" jsonb NOT NULL,
	"source_clock" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "capture_cursors_org_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "capture_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"connector_instance_id" uuid NOT NULL,
	"state" "capture_state" DEFAULT 'queued' NOT NULL,
	"idempotency_key" text NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"safe_error" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "capture_runs_org_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "capture_stream_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"capture_run_id" uuid NOT NULL,
	"stream" text NOT NULL,
	"state" "capture_state" DEFAULT 'queued' NOT NULL,
	"idempotency_key" text NOT NULL,
	"records_read" integer DEFAULT 0 NOT NULL,
	"artifacts_read" integer DEFAULT 0 NOT NULL,
	"checkpointed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "capture_stream_runs_org_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "raw_record_envelopes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"source_system_id" uuid NOT NULL,
	"capture_run_id" uuid NOT NULL,
	"capture_stream_run_id" uuid NOT NULL,
	"source_schema_version_id" uuid,
	"stream" text NOT NULL,
	"native_id" text NOT NULL,
	"capture_method" "capture_method" NOT NULL,
	"captured_at" timestamp with time zone NOT NULL,
	"source_updated_at" timestamp with time zone,
	"payload" jsonb NOT NULL,
	"checksum" text NOT NULL,
	"tombstone" boolean DEFAULT false NOT NULL,
	"classification" "data_classification" NOT NULL,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "raw_records_org_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "source_schema_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"source_system_id" uuid NOT NULL,
	"stream" text NOT NULL,
	"source_version" text,
	"fingerprint" text NOT NULL,
	"schema" jsonb NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "source_schema_versions_org_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "evidence_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"drill_run_id" uuid,
	"kind" text NOT NULL,
	"checksum" text NOT NULL,
	"object_key" text,
	"classification" "data_classification" NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "evidence_items_org_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "evidence_manifests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"drill_run_id" uuid NOT NULL,
	"recovery_build_id" uuid NOT NULL,
	"checksum" text NOT NULL,
	"manifest" jsonb NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "evidence_manifests_org_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "artifact_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"artifact_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"checksum" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"media_type" text NOT NULL,
	"object_key" text NOT NULL,
	"classification" "data_classification" NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "artifact_versions_org_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "artifacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"current_version_id" uuid,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "artifacts_org_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "entities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"current_version_id" uuid,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entities_org_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "entity_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"entity_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"content_hash" text NOT NULL,
	"display_name" text NOT NULL,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"classification" "data_classification" NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entity_versions_org_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "provenance_edges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid NOT NULL,
	"target_json_pointer" text,
	"source_system_id" uuid NOT NULL,
	"capture_run_id" uuid NOT NULL,
	"stream" text NOT NULL,
	"native_id" text NOT NULL,
	"source_json_pointer" text,
	"artifact_version_id" uuid,
	"capture_method" "capture_method" NOT NULL,
	"captured_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "provenance_edges_org_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "relationships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"from_entity_id" uuid NOT NULL,
	"to_entity_id" uuid NOT NULL,
	"relationship_type" text NOT NULL,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"classification" "data_classification" NOT NULL,
	"valid_from" timestamp with time zone DEFAULT now() NOT NULL,
	"valid_to" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "relationships_org_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memberships_org_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_org_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"subject_type" text NOT NULL,
	"subject_id" uuid NOT NULL,
	"state" "approval_state" DEFAULT 'pending' NOT NULL,
	"requested_by_membership_id" uuid NOT NULL,
	"decided_by_membership_id" uuid,
	"reason" text,
	"idempotency_key" text NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "approvals_org_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "incident_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"incident_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	"incident_role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "incident_members_org_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "incidents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"state" "incident_state" DEFAULT 'declared' NOT NULL,
	"title" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"declared_by_membership_id" uuid NOT NULL,
	"recovery_build_id" uuid,
	"affected_source_system_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"declared_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "incidents_org_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "reconciliation_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"incident_id" uuid NOT NULL,
	"source_system_id" uuid NOT NULL,
	"state" "reconciliation_state" DEFAULT 'proposed' NOT NULL,
	"aggregate_type" text NOT NULL,
	"aggregate_id" text NOT NULL,
	"proposed_change" jsonb NOT NULL,
	"conflict" jsonb,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reconciliation_items_org_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "recovery_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"incident_id" uuid NOT NULL,
	"aggregate_type" text NOT NULL,
	"aggregate_id" text NOT NULL,
	"actor" jsonb NOT NULL,
	"source" text NOT NULL,
	"change" jsonb NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"idempotency_key" text NOT NULL,
	"causation_id" uuid,
	"correlation_id" text NOT NULL,
	"classification" "data_classification" NOT NULL,
	"provenance" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recovery_events_org_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "drill_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"drill_scenario_id" uuid NOT NULL,
	"recovery_build_id" uuid NOT NULL,
	"state" "drill_state" DEFAULT 'queued' NOT NULL,
	"idempotency_key" text NOT NULL,
	"verdict" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "drill_runs_org_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "drill_scenarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"version" integer NOT NULL,
	"definition" jsonb NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "drill_scenarios_org_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "drill_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"drill_run_id" uuid NOT NULL,
	"sequence" integer NOT NULL,
	"kind" text NOT NULL,
	"status" text NOT NULL,
	"input" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"output" jsonb,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "drill_steps_org_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "recovery_build_inputs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"recovery_build_id" uuid NOT NULL,
	"input_type" text NOT NULL,
	"input_id" uuid NOT NULL,
	"checksum" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recovery_build_inputs_org_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "recovery_builds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"state" "build_state" DEFAULT 'queued' NOT NULL,
	"idempotency_key" text NOT NULL,
	"checksum" text,
	"runtime_reference" text,
	"ready_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recovery_builds_org_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "solari_resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"environment" text NOT NULL,
	"owner_job_type" text NOT NULL,
	"owner_job_id" uuid NOT NULL,
	"product" text NOT NULL,
	"remote_session_id" text,
	"state" "solari_resource_state" DEFAULT 'requested' NOT NULL,
	"cleanup_mode" text NOT NULL,
	"timeout_seconds" integer NOT NULL,
	"idempotency_key" text NOT NULL,
	"safe_error" jsonb,
	"connected_at" timestamp with time zone,
	"released_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "solari_resources_org_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "browser_profile_references" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"source_system_id" uuid NOT NULL,
	"profile_reference" text NOT NULL,
	"environment" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "browser_profiles_org_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "connector_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"version" text NOT NULL,
	"display_name" text NOT NULL,
	"manifest" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "connector_instances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"source_system_id" uuid NOT NULL,
	"connector_definition_id" uuid NOT NULL,
	"credential_reference_id" uuid,
	"browser_profile_reference_id" uuid,
	"name" text NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "connector_instances_org_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "credential_references" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"reference" text NOT NULL,
	"purpose" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "credential_references_org_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "source_systems" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"key" text NOT NULL,
	"display_name" text NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "source_systems_org_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "state_transitions" ADD CONSTRAINT "state_transitions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capabilities" ADD CONSTRAINT "capabilities_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capability_versions" ADD CONSTRAINT "capability_versions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capability_versions" ADD CONSTRAINT "capability_versions_capability_same_org_fk" FOREIGN KEY ("organization_id","capability_id") REFERENCES "public"."capabilities"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verifier_specs" ADD CONSTRAINT "verifier_specs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verifier_specs" ADD CONSTRAINT "verifier_specs_capability_version_same_org_fk" FOREIGN KEY ("organization_id","capability_version_id") REFERENCES "public"."capability_versions"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capture_cursors" ADD CONSTRAINT "capture_cursors_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capture_cursors" ADD CONSTRAINT "capture_cursors_connector_same_org_fk" FOREIGN KEY ("organization_id","connector_instance_id") REFERENCES "public"."connector_instances"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capture_runs" ADD CONSTRAINT "capture_runs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capture_runs" ADD CONSTRAINT "capture_runs_connector_same_org_fk" FOREIGN KEY ("organization_id","connector_instance_id") REFERENCES "public"."connector_instances"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capture_stream_runs" ADD CONSTRAINT "capture_stream_runs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capture_stream_runs" ADD CONSTRAINT "capture_stream_runs_run_same_org_fk" FOREIGN KEY ("organization_id","capture_run_id") REFERENCES "public"."capture_runs"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_record_envelopes" ADD CONSTRAINT "raw_record_envelopes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_record_envelopes" ADD CONSTRAINT "raw_records_source_same_org_fk" FOREIGN KEY ("organization_id","source_system_id") REFERENCES "public"."source_systems"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_record_envelopes" ADD CONSTRAINT "raw_records_run_same_org_fk" FOREIGN KEY ("organization_id","capture_run_id") REFERENCES "public"."capture_runs"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_record_envelopes" ADD CONSTRAINT "raw_records_stream_run_same_org_fk" FOREIGN KEY ("organization_id","capture_stream_run_id") REFERENCES "public"."capture_stream_runs"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_record_envelopes" ADD CONSTRAINT "raw_records_schema_same_org_fk" FOREIGN KEY ("organization_id","source_schema_version_id") REFERENCES "public"."source_schema_versions"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_schema_versions" ADD CONSTRAINT "source_schema_versions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_schema_versions" ADD CONSTRAINT "source_schema_versions_source_same_org_fk" FOREIGN KEY ("organization_id","source_system_id") REFERENCES "public"."source_systems"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_items" ADD CONSTRAINT "evidence_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_items" ADD CONSTRAINT "evidence_items_drill_same_org_fk" FOREIGN KEY ("organization_id","drill_run_id") REFERENCES "public"."drill_runs"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_manifests" ADD CONSTRAINT "evidence_manifests_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_manifests" ADD CONSTRAINT "evidence_manifests_drill_same_org_fk" FOREIGN KEY ("organization_id","drill_run_id") REFERENCES "public"."drill_runs"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_manifests" ADD CONSTRAINT "evidence_manifests_build_same_org_fk" FOREIGN KEY ("organization_id","recovery_build_id") REFERENCES "public"."recovery_builds"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifact_versions" ADD CONSTRAINT "artifact_versions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifact_versions" ADD CONSTRAINT "artifact_versions_artifact_same_org_fk" FOREIGN KEY ("organization_id","artifact_id") REFERENCES "public"."artifacts"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entities" ADD CONSTRAINT "entities_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_versions" ADD CONSTRAINT "entity_versions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_versions" ADD CONSTRAINT "entity_versions_entity_same_org_fk" FOREIGN KEY ("organization_id","entity_id") REFERENCES "public"."entities"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provenance_edges" ADD CONSTRAINT "provenance_edges_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provenance_edges" ADD CONSTRAINT "provenance_edges_source_same_org_fk" FOREIGN KEY ("organization_id","source_system_id") REFERENCES "public"."source_systems"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provenance_edges" ADD CONSTRAINT "provenance_edges_capture_same_org_fk" FOREIGN KEY ("organization_id","capture_run_id") REFERENCES "public"."capture_runs"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provenance_edges" ADD CONSTRAINT "provenance_edges_artifact_same_org_fk" FOREIGN KEY ("organization_id","artifact_version_id") REFERENCES "public"."artifact_versions"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_from_same_org_fk" FOREIGN KEY ("organization_id","from_entity_id") REFERENCES "public"."entities"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_to_same_org_fk" FOREIGN KEY ("organization_id","to_entity_id") REFERENCES "public"."entities"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_role_same_org_fk" FOREIGN KEY ("organization_id","role_id") REFERENCES "public"."roles"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_requester_same_org_fk" FOREIGN KEY ("organization_id","requested_by_membership_id") REFERENCES "public"."memberships"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_decider_same_org_fk" FOREIGN KEY ("organization_id","decided_by_membership_id") REFERENCES "public"."memberships"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_members" ADD CONSTRAINT "incident_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_members" ADD CONSTRAINT "incident_members_incident_same_org_fk" FOREIGN KEY ("organization_id","incident_id") REFERENCES "public"."incidents"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_members" ADD CONSTRAINT "incident_members_membership_same_org_fk" FOREIGN KEY ("organization_id","membership_id") REFERENCES "public"."memberships"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_declarer_same_org_fk" FOREIGN KEY ("organization_id","declared_by_membership_id") REFERENCES "public"."memberships"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_build_same_org_fk" FOREIGN KEY ("organization_id","recovery_build_id") REFERENCES "public"."recovery_builds"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reconciliation_items" ADD CONSTRAINT "reconciliation_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reconciliation_items" ADD CONSTRAINT "reconciliation_items_incident_same_org_fk" FOREIGN KEY ("organization_id","incident_id") REFERENCES "public"."incidents"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reconciliation_items" ADD CONSTRAINT "reconciliation_items_source_same_org_fk" FOREIGN KEY ("organization_id","source_system_id") REFERENCES "public"."source_systems"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recovery_events" ADD CONSTRAINT "recovery_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recovery_events" ADD CONSTRAINT "recovery_events_incident_same_org_fk" FOREIGN KEY ("organization_id","incident_id") REFERENCES "public"."incidents"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drill_runs" ADD CONSTRAINT "drill_runs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drill_runs" ADD CONSTRAINT "drill_runs_scenario_same_org_fk" FOREIGN KEY ("organization_id","drill_scenario_id") REFERENCES "public"."drill_scenarios"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drill_runs" ADD CONSTRAINT "drill_runs_build_same_org_fk" FOREIGN KEY ("organization_id","recovery_build_id") REFERENCES "public"."recovery_builds"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drill_scenarios" ADD CONSTRAINT "drill_scenarios_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drill_steps" ADD CONSTRAINT "drill_steps_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drill_steps" ADD CONSTRAINT "drill_steps_run_same_org_fk" FOREIGN KEY ("organization_id","drill_run_id") REFERENCES "public"."drill_runs"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recovery_build_inputs" ADD CONSTRAINT "recovery_build_inputs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recovery_build_inputs" ADD CONSTRAINT "recovery_build_inputs_build_same_org_fk" FOREIGN KEY ("organization_id","recovery_build_id") REFERENCES "public"."recovery_builds"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recovery_builds" ADD CONSTRAINT "recovery_builds_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solari_resources" ADD CONSTRAINT "solari_resources_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "browser_profile_references" ADD CONSTRAINT "browser_profile_references_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "browser_profile_references" ADD CONSTRAINT "browser_profiles_source_same_org_fk" FOREIGN KEY ("organization_id","source_system_id") REFERENCES "public"."source_systems"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connector_instances" ADD CONSTRAINT "connector_instances_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connector_instances" ADD CONSTRAINT "connector_instances_connector_definition_id_connector_definitions_id_fk" FOREIGN KEY ("connector_definition_id") REFERENCES "public"."connector_definitions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connector_instances" ADD CONSTRAINT "connector_instances_source_same_org_fk" FOREIGN KEY ("organization_id","source_system_id") REFERENCES "public"."source_systems"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connector_instances" ADD CONSTRAINT "connector_instances_credential_same_org_fk" FOREIGN KEY ("organization_id","credential_reference_id") REFERENCES "public"."credential_references"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connector_instances" ADD CONSTRAINT "connector_instances_profile_same_org_fk" FOREIGN KEY ("organization_id","browser_profile_reference_id") REFERENCES "public"."browser_profile_references"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credential_references" ADD CONSTRAINT "credential_references_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_systems" ADD CONSTRAINT "source_systems_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "audit_events_scope_idempotency_unique" ON "audit_events" USING btree ("organization_id","aggregate_type","aggregate_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "state_transitions_scope_idempotency_unique" ON "state_transitions" USING btree ("organization_id","machine","aggregate_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "state_transitions_scope_revision_unique" ON "state_transitions" USING btree ("organization_id","machine","aggregate_id","revision");--> statement-breakpoint
CREATE UNIQUE INDEX "capabilities_org_key_unique" ON "capabilities" USING btree ("organization_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "capability_versions_capability_version_unique" ON "capability_versions" USING btree ("organization_id","capability_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "verifier_specs_version_kind_unique" ON "verifier_specs" USING btree ("organization_id","capability_version_id","kind","version");--> statement-breakpoint
CREATE UNIQUE INDEX "capture_cursors_stream_partition_unique" ON "capture_cursors" USING btree ("organization_id","connector_instance_id","stream","partition");--> statement-breakpoint
CREATE UNIQUE INDEX "capture_runs_org_idempotency_unique" ON "capture_runs" USING btree ("organization_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "capture_stream_runs_run_stream_unique" ON "capture_stream_runs" USING btree ("organization_id","capture_run_id","stream");--> statement-breakpoint
CREATE UNIQUE INDEX "capture_stream_runs_scope_idempotency_unique" ON "capture_stream_runs" USING btree ("organization_id","capture_run_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "raw_records_scope_idempotency_unique" ON "raw_record_envelopes" USING btree ("organization_id","capture_run_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "raw_records_native_lookup_idx" ON "raw_record_envelopes" USING btree ("organization_id","source_system_id","stream","native_id");--> statement-breakpoint
CREATE UNIQUE INDEX "source_schema_versions_fingerprint_unique" ON "source_schema_versions" USING btree ("organization_id","source_system_id","stream","fingerprint");--> statement-breakpoint
CREATE UNIQUE INDEX "evidence_items_org_checksum_unique" ON "evidence_items" USING btree ("organization_id","checksum");--> statement-breakpoint
CREATE UNIQUE INDEX "evidence_manifests_drill_unique" ON "evidence_manifests" USING btree ("organization_id","drill_run_id");--> statement-breakpoint
CREATE UNIQUE INDEX "artifact_versions_artifact_version_unique" ON "artifact_versions" USING btree ("organization_id","artifact_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "artifact_versions_org_checksum_unique" ON "artifact_versions" USING btree ("organization_id","checksum");--> statement-breakpoint
CREATE INDEX "entities_type_idx" ON "entities" USING btree ("organization_id","entity_type");--> statement-breakpoint
CREATE UNIQUE INDEX "entity_versions_entity_version_unique" ON "entity_versions" USING btree ("organization_id","entity_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "entity_versions_entity_hash_unique" ON "entity_versions" USING btree ("organization_id","entity_id","content_hash");--> statement-breakpoint
CREATE INDEX "provenance_edges_target_idx" ON "provenance_edges" USING btree ("organization_id","target_type","target_id");--> statement-breakpoint
CREATE INDEX "relationships_from_idx" ON "relationships" USING btree ("organization_id","from_entity_id","relationship_type");--> statement-breakpoint
CREATE INDEX "relationships_to_idx" ON "relationships" USING btree ("organization_id","to_entity_id","relationship_type");--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_org_user_unique" ON "memberships" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_slug_unique" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "roles_org_key_unique" ON "roles" USING btree ("organization_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "approvals_subject_idempotency_unique" ON "approvals" USING btree ("organization_id","subject_type","subject_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "incident_members_incident_membership_unique" ON "incident_members" USING btree ("organization_id","incident_id","membership_id");--> statement-breakpoint
CREATE UNIQUE INDEX "incidents_org_idempotency_unique" ON "incidents" USING btree ("organization_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "reconciliation_items_incident_idempotency_unique" ON "reconciliation_items" USING btree ("organization_id","incident_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "recovery_events_incident_idempotency_unique" ON "recovery_events" USING btree ("organization_id","incident_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "drill_runs_org_idempotency_unique" ON "drill_runs" USING btree ("organization_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "drill_scenarios_org_key_version_unique" ON "drill_scenarios" USING btree ("organization_id","key","version");--> statement-breakpoint
CREATE UNIQUE INDEX "drill_steps_run_sequence_unique" ON "drill_steps" USING btree ("organization_id","drill_run_id","sequence");--> statement-breakpoint
CREATE UNIQUE INDEX "recovery_build_inputs_input_unique" ON "recovery_build_inputs" USING btree ("organization_id","recovery_build_id","input_type","input_id");--> statement-breakpoint
CREATE UNIQUE INDEX "recovery_builds_org_idempotency_unique" ON "recovery_builds" USING btree ("organization_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "solari_resources_org_idempotency_unique" ON "solari_resources" USING btree ("organization_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "solari_resources_remote_unique" ON "solari_resources" USING btree ("environment","product","remote_session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "browser_profiles_org_ref_unique" ON "browser_profile_references" USING btree ("organization_id","profile_reference");--> statement-breakpoint
CREATE UNIQUE INDEX "connector_definitions_key_version_unique" ON "connector_definitions" USING btree ("key","version");--> statement-breakpoint
CREATE UNIQUE INDEX "connector_instances_org_name_unique" ON "connector_instances" USING btree ("organization_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "credential_references_org_ref_unique" ON "credential_references" USING btree ("organization_id","provider","reference");--> statement-breakpoint
CREATE UNIQUE INDEX "source_systems_org_key_unique" ON "source_systems" USING btree ("organization_id","key");
--> statement-breakpoint

-- Current-version pointers must resolve to a version of the same tenant aggregate.
ALTER TABLE "entity_versions"
  ADD CONSTRAINT "entity_versions_current_pointer_unique"
  UNIQUE ("organization_id", "id", "entity_id");
--> statement-breakpoint
ALTER TABLE "entities"
  ADD CONSTRAINT "entities_current_version_same_entity_fk"
  FOREIGN KEY ("organization_id", "current_version_id", "id")
  REFERENCES "entity_versions" ("organization_id", "id", "entity_id")
  DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE "artifact_versions"
  ADD CONSTRAINT "artifact_versions_current_pointer_unique"
  UNIQUE ("organization_id", "id", "artifact_id");
--> statement-breakpoint
ALTER TABLE "artifacts"
  ADD CONSTRAINT "artifacts_current_version_same_artifact_fk"
  FOREIGN KEY ("organization_id", "current_version_id", "id")
  REFERENCES "artifact_versions" ("organization_id", "id", "artifact_id")
  DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE "capability_versions"
  ADD CONSTRAINT "capability_versions_current_pointer_unique"
  UNIQUE ("organization_id", "id", "capability_id");
--> statement-breakpoint
ALTER TABLE "capabilities"
  ADD CONSTRAINT "capabilities_current_version_same_capability_fk"
  FOREIGN KEY ("organization_id", "current_version_id", "id")
  REFERENCES "capability_versions" ("organization_id", "id", "capability_id")
  DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint

-- Idempotency keys are scope-local capabilities and may never be blank.
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_idempotency_nonempty" CHECK (length(btrim("idempotency_key")) > 0);
ALTER TABLE "state_transitions" ADD CONSTRAINT "state_transitions_idempotency_nonempty" CHECK (length(btrim("idempotency_key")) > 0);
ALTER TABLE "capture_runs" ADD CONSTRAINT "capture_runs_idempotency_nonempty" CHECK (length(btrim("idempotency_key")) > 0);
ALTER TABLE "capture_stream_runs" ADD CONSTRAINT "capture_stream_runs_idempotency_nonempty" CHECK (length(btrim("idempotency_key")) > 0);
ALTER TABLE "raw_record_envelopes" ADD CONSTRAINT "raw_records_idempotency_nonempty" CHECK (length(btrim("idempotency_key")) > 0);
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_idempotency_nonempty" CHECK (length(btrim("idempotency_key")) > 0);
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_idempotency_nonempty" CHECK (length(btrim("idempotency_key")) > 0);
ALTER TABLE "reconciliation_items" ADD CONSTRAINT "reconciliation_items_idempotency_nonempty" CHECK (length(btrim("idempotency_key")) > 0);
ALTER TABLE "recovery_events" ADD CONSTRAINT "recovery_events_idempotency_nonempty" CHECK (length(btrim("idempotency_key")) > 0);
ALTER TABLE "drill_runs" ADD CONSTRAINT "drill_runs_idempotency_nonempty" CHECK (length(btrim("idempotency_key")) > 0);
ALTER TABLE "recovery_builds" ADD CONSTRAINT "recovery_builds_idempotency_nonempty" CHECK (length(btrim("idempotency_key")) > 0);
ALTER TABLE "solari_resources" ADD CONSTRAINT "solari_resources_idempotency_nonempty" CHECK (length(btrim("idempotency_key")) > 0);
ALTER TABLE "state_transitions" ADD CONSTRAINT "state_transitions_revision_positive" CHECK ("revision" > 0);
ALTER TABLE "solari_resources" ADD CONSTRAINT "solari_resources_timeout_positive" CHECK ("timeout_seconds" > 0);
ALTER TABLE "entity_versions" ADD CONSTRAINT "entity_versions_version_positive" CHECK ("version" > 0);
ALTER TABLE "artifact_versions" ADD CONSTRAINT "artifact_versions_version_positive" CHECK ("version" > 0 AND "size_bytes" >= 0);
ALTER TABLE "capability_versions" ADD CONSTRAINT "capability_versions_version_positive" CHECK ("version" > 0);
--> statement-breakpoint

CREATE FUNCTION ark_reject_mutation() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME USING ERRCODE = '55000';
  RETURN OLD;
END;
$$;
--> statement-breakpoint

CREATE FUNCTION ark_reject_published_mutation() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD."published_at" IS NOT NULL THEN
    RAISE EXCEPTION 'published row in % is immutable', TG_TABLE_NAME USING ERRCODE = '55000';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint

CREATE FUNCTION ark_reject_ready_build_mutation() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD."state" = 'ready' THEN
    RAISE EXCEPTION 'ready recovery build is immutable' USING ERRCODE = '55000';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint

CREATE TRIGGER raw_record_envelopes_append_only BEFORE UPDATE OR DELETE ON "raw_record_envelopes" FOR EACH ROW EXECUTE FUNCTION ark_reject_mutation();
CREATE TRIGGER provenance_edges_append_only BEFORE UPDATE OR DELETE ON "provenance_edges" FOR EACH ROW EXECUTE FUNCTION ark_reject_mutation();
CREATE TRIGGER recovery_build_inputs_append_only BEFORE UPDATE OR DELETE ON "recovery_build_inputs" FOR EACH ROW EXECUTE FUNCTION ark_reject_mutation();
CREATE TRIGGER audit_events_append_only BEFORE UPDATE OR DELETE ON "audit_events" FOR EACH ROW EXECUTE FUNCTION ark_reject_mutation();
CREATE TRIGGER state_transitions_append_only BEFORE UPDATE OR DELETE ON "state_transitions" FOR EACH ROW EXECUTE FUNCTION ark_reject_mutation();
CREATE TRIGGER recovery_events_append_only BEFORE UPDATE OR DELETE ON "recovery_events" FOR EACH ROW EXECUTE FUNCTION ark_reject_mutation();

CREATE TRIGGER source_schema_versions_published_immutable BEFORE UPDATE OR DELETE ON "source_schema_versions" FOR EACH ROW EXECUTE FUNCTION ark_reject_published_mutation();
CREATE TRIGGER entity_versions_published_immutable BEFORE UPDATE OR DELETE ON "entity_versions" FOR EACH ROW EXECUTE FUNCTION ark_reject_published_mutation();
CREATE TRIGGER artifact_versions_published_immutable BEFORE UPDATE OR DELETE ON "artifact_versions" FOR EACH ROW EXECUTE FUNCTION ark_reject_published_mutation();
CREATE TRIGGER capability_versions_published_immutable BEFORE UPDATE OR DELETE ON "capability_versions" FOR EACH ROW EXECUTE FUNCTION ark_reject_published_mutation();
CREATE TRIGGER verifier_specs_published_immutable BEFORE UPDATE OR DELETE ON "verifier_specs" FOR EACH ROW EXECUTE FUNCTION ark_reject_published_mutation();
CREATE TRIGGER drill_scenarios_published_immutable BEFORE UPDATE OR DELETE ON "drill_scenarios" FOR EACH ROW EXECUTE FUNCTION ark_reject_published_mutation();
CREATE TRIGGER evidence_items_published_immutable BEFORE UPDATE OR DELETE ON "evidence_items" FOR EACH ROW EXECUTE FUNCTION ark_reject_published_mutation();
CREATE TRIGGER evidence_manifests_published_immutable BEFORE UPDATE OR DELETE ON "evidence_manifests" FOR EACH ROW EXECUTE FUNCTION ark_reject_published_mutation();
CREATE TRIGGER recovery_builds_ready_immutable BEFORE UPDATE OR DELETE ON "recovery_builds" FOR EACH ROW EXECUTE FUNCTION ark_reject_ready_build_mutation();
