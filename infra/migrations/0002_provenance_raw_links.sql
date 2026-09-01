ALTER TABLE "provenance_edges" ADD COLUMN "raw_record_envelope_id" uuid;--> statement-breakpoint
ALTER TABLE "provenance_edges" ADD CONSTRAINT "provenance_edges_raw_record_same_org_fk" FOREIGN KEY ("organization_id","raw_record_envelope_id") REFERENCES "public"."raw_record_envelopes"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provenance_edges" ADD CONSTRAINT "provenance_edges_exact_source_required" CHECK ("raw_record_envelope_id" IS NOT NULL OR "artifact_version_id" IS NOT NULL);
