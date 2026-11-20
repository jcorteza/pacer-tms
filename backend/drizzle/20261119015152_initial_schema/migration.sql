CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"expires_at" timestamp with time zone DEFAULT now() + interval '12 hours' NOT NULL,
	"user_id" uuid
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"password_hash" text NOT NULL,
	"roles" text[] NOT NULL,
	"settings" jsonb DEFAULT '{}' NOT NULL,
	CONSTRAINT "users_has_role" CHECK (cardinality("roles") >= 1)
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"billing_address" text NOT NULL,
	"billing_contact" jsonb NOT NULL,
	"shipping_contact" jsonb NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "shipping_addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"client_id" uuid NOT NULL,
	"nickname" text,
	"address" text NOT NULL,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"zip" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"client_id" uuid NOT NULL,
	"sku" text NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"weight_lbs" numeric(12,2) NOT NULL,
	"length_in" numeric(12,2) NOT NULL,
	"width_in" numeric(12,2) NOT NULL,
	"height_in" numeric(12,2) NOT NULL,
	"cost" numeric(12,2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "building_codes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "building_codes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"code" varchar(4) NOT NULL UNIQUE,
	"warehouse_id" integer NOT NULL,
	"building" char(1) NOT NULL,
	"description" text,
	CONSTRAINT "building_codes_code_length" CHECK (char_length("code") >= 2)
);
--> statement-breakpoint
CREATE TABLE "item_locations" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "item_locations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"code" varchar(4) NOT NULL UNIQUE,
	"building_id" integer NOT NULL,
	"item_id" integer UNIQUE,
	"description" text,
	CONSTRAINT "item_locations_code_length" CHECK (char_length("code") >= 2)
);
--> statement-breakpoint
CREATE TABLE "warehouse_codes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "warehouse_codes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"code" varchar(4) NOT NULL UNIQUE,
	"manager_id" uuid NOT NULL,
	"phone" text NOT NULL,
	"address" text NOT NULL,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"zip" text NOT NULL,
	CONSTRAINT "warehouse_codes_code_length" CHECK (char_length("code") >= 2)
);
--> statement-breakpoint
CREATE TABLE "carrier_invoices" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "carrier_invoices_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"received_at" timestamp with time zone NOT NULL,
	"deadline" timestamp with time zone NOT NULL,
	"carrier_id" integer NOT NULL,
	"invoice_number" text NOT NULL,
	"amount" numeric(12,2) NOT NULL,
	"status" text NOT NULL,
	"url" text NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "carriers" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "carriers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"contact_name" text NOT NULL,
	"contact_phone" text NOT NULL,
	"contact_email" text NOT NULL,
	"carrier_number" text NOT NULL,
	"carrier_number_type" text NOT NULL,
	"service_levels" text[] DEFAULT '{}'::text[] NOT NULL,
	"notes" text,
	CONSTRAINT "carriers_number_type" CHECK ("carrier_number_type" in ('usdot', 'mc'))
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "orders_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"po" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"client_id" uuid NOT NULL,
	"status" text NOT NULL,
	"requested_delivery_at" timestamp with time zone NOT NULL,
	"estimated_delivery_at" timestamp with time zone,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "shipment_handoffs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "shipment_handoffs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"shipment_id" integer NOT NULL,
	"warehouse_id" integer NOT NULL,
	"building_id" integer,
	"scanned_by" uuid NOT NULL,
	"scanned_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipments" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "shipments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tracking_code" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
	"order_id" integer NOT NULL,
	"client_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"item_id" integer NOT NULL,
	"item_count" integer NOT NULL,
	"delivery_address_id" uuid NOT NULL,
	"container" text NOT NULL,
	"weight" numeric(12,2) NOT NULL,
	"volume" numeric(12,2),
	"status" text NOT NULL,
	"contents" text,
	"estimated_delivery_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"carrier_id" integer,
	"carrier_tracking_number" text,
	"carrier_invoice_id" integer,
	"service_level" text,
	"payment_terms" text,
	"declared_value" numeric(12,2),
	"insurance_coverage" numeric(12,2),
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "invoices_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"client_id" uuid NOT NULL,
	"order_id" integer NOT NULL,
	"amount" numeric(12,2) NOT NULL,
	"status" text NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "documents_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"type" text NOT NULL,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"client_id" uuid,
	"order_id" integer,
	"shipment_id" integer,
	"carrier_id" integer,
	"url" text NOT NULL,
	"status" text NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "status_change_log" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "status_change_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"action" text NOT NULL,
	"description" text NOT NULL,
	"user_id" uuid NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "shipping_addresses" ADD CONSTRAINT "shipping_addresses_client_id_clients_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id");--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_client_id_clients_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id");--> statement-breakpoint
ALTER TABLE "building_codes" ADD CONSTRAINT "building_codes_warehouse_id_warehouse_codes_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouse_codes"("id");--> statement-breakpoint
ALTER TABLE "item_locations" ADD CONSTRAINT "item_locations_building_id_building_codes_id_fkey" FOREIGN KEY ("building_id") REFERENCES "building_codes"("id");--> statement-breakpoint
ALTER TABLE "item_locations" ADD CONSTRAINT "item_locations_item_id_items_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id");--> statement-breakpoint
ALTER TABLE "warehouse_codes" ADD CONSTRAINT "warehouse_codes_manager_id_users_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "carrier_invoices" ADD CONSTRAINT "carrier_invoices_carrier_id_carriers_id_fkey" FOREIGN KEY ("carrier_id") REFERENCES "carriers"("id");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_client_id_clients_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id");--> statement-breakpoint
ALTER TABLE "shipment_handoffs" ADD CONSTRAINT "shipment_handoffs_shipment_id_shipments_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id");--> statement-breakpoint
ALTER TABLE "shipment_handoffs" ADD CONSTRAINT "shipment_handoffs_warehouse_id_warehouse_codes_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouse_codes"("id");--> statement-breakpoint
ALTER TABLE "shipment_handoffs" ADD CONSTRAINT "shipment_handoffs_building_id_building_codes_id_fkey" FOREIGN KEY ("building_id") REFERENCES "building_codes"("id");--> statement-breakpoint
ALTER TABLE "shipment_handoffs" ADD CONSTRAINT "shipment_handoffs_scanned_by_users_id_fkey" FOREIGN KEY ("scanned_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_order_id_orders_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id");--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_client_id_clients_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id");--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_item_id_items_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id");--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_delivery_address_id_shipping_addresses_id_fkey" FOREIGN KEY ("delivery_address_id") REFERENCES "shipping_addresses"("id");--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_carrier_id_carriers_id_fkey" FOREIGN KEY ("carrier_id") REFERENCES "carriers"("id");--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_carrier_invoice_id_carrier_invoices_id_fkey" FOREIGN KEY ("carrier_invoice_id") REFERENCES "carrier_invoices"("id");--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_id_clients_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id");--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_order_id_orders_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id");--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_client_id_clients_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id");--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_order_id_orders_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id");--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_shipment_id_shipments_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id");--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_carrier_id_carriers_id_fkey" FOREIGN KEY ("carrier_id") REFERENCES "carriers"("id");--> statement-breakpoint
ALTER TABLE "status_change_log" ADD CONSTRAINT "status_change_log_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");