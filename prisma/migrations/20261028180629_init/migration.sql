-- CreateEnum
CREATE TYPE "bus_class" AS ENUM ('EXECUTIVE_2_2', 'SLEEPER_2_1');

-- CreateEnum
CREATE TYPE "seat_status" AS ENUM ('AVAILABLE', 'HOLD', 'BOOKED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "schedule_status" AS ENUM ('ACTIVE', 'CANCELLED_BY_OPERATOR');

-- CreateEnum
CREATE TYPE "booking_status" AS ENUM ('PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "refund_status" AS ENUM ('PENDING', 'PROCESSED', 'FAILED', 'REJECTED');

-- CreateTable
CREATE TABLE "operators" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact_phone" TEXT,
    "contact_email" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "operators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buses" (
    "id" TEXT NOT NULL,
    "operator_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bus_class" "bus_class" NOT NULL,
    "total_seats" INTEGER NOT NULL,
    "facilities" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "buses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cities" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "province_code" TEXT NOT NULL,
    "province_name" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "is_hub" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routes" (
    "id" TEXT NOT NULL,
    "origin_city_id" TEXT NOT NULL,
    "destination_city_id" TEXT NOT NULL,
    "distance_km" INTEGER NOT NULL,
    "osrm_duration_minutes" INTEGER NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'osrm',
    "computed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "terminals" (
    "id" TEXT NOT NULL,
    "city_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "coords_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "terminals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedules" (
    "id" TEXT NOT NULL,
    "bus_id" TEXT NOT NULL,
    "route_id" TEXT NOT NULL,
    "departure_time" TIMESTAMPTZ(3) NOT NULL,
    "arrival_time" TIMESTAMPTZ(3) NOT NULL,
    "price" INTEGER NOT NULL,
    "status" "schedule_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_stops" (
    "id" TEXT NOT NULL,
    "schedule_id" TEXT NOT NULL,
    "terminal_id" TEXT NOT NULL,
    "stop_sequence" INTEGER NOT NULL,
    "arrival_at" TIMESTAMPTZ(3) NOT NULL,
    "departure_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "schedule_stops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_seats" (
    "id" TEXT NOT NULL,
    "schedule_id" TEXT NOT NULL,
    "seat_number" TEXT NOT NULL,
    "status" "seat_status" NOT NULL DEFAULT 'AVAILABLE',
    "hold_token" TEXT,
    "hold_expires_at" TIMESTAMPTZ(3),
    "booking_id" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "schedule_seats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "public_token" UUID NOT NULL,
    "schedule_id" TEXT NOT NULL,
    "status" "booking_status" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "contact_name" TEXT NOT NULL,
    "contact_email" TEXT NOT NULL,
    "contact_phone" TEXT NOT NULL,
    "ticket_total" INTEGER NOT NULL,
    "service_fee" INTEGER NOT NULL DEFAULT 0,
    "grand_total" INTEGER NOT NULL,
    "cancelled_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_passengers" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "seat_number" TEXT NOT NULL,
    "passenger_type" TEXT NOT NULL DEFAULT 'adult',
    "full_name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_passengers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "payment_method" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "payment_status" NOT NULL DEFAULT 'PENDING',
    "va_number" TEXT,
    "qr_string" TEXT,
    "qr_url" TEXT,
    "midtrans_transaction_id" TEXT,
    "expiry_time" TIMESTAMPTZ(3),
    "paid_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "payment_id" TEXT,
    "refund_percentage" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "refund_status" NOT NULL DEFAULT 'PENDING',
    "processed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_events" (
    "id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "operators_code_key" ON "operators"("code");

-- CreateIndex
CREATE INDEX "buses_operator_id_idx" ON "buses"("operator_id");

-- CreateIndex
CREATE UNIQUE INDEX "buses_operator_id_name_key" ON "buses"("operator_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "cities_code_key" ON "cities"("code");

-- CreateIndex
CREATE INDEX "cities_name_idx" ON "cities"("name");

-- CreateIndex
CREATE UNIQUE INDEX "routes_origin_city_id_destination_city_id_key" ON "routes"("origin_city_id", "destination_city_id");

-- CreateIndex
CREATE INDEX "terminals_city_id_idx" ON "terminals"("city_id");

-- CreateIndex
CREATE UNIQUE INDEX "terminals_city_id_name_key" ON "terminals"("city_id", "name");

-- CreateIndex
CREATE INDEX "schedules_bus_id_idx" ON "schedules"("bus_id");

-- CreateIndex
CREATE INDEX "schedules_route_id_departure_time_idx" ON "schedules"("route_id", "departure_time");

-- CreateIndex
CREATE INDEX "schedules_departure_time_idx" ON "schedules"("departure_time");

-- CreateIndex
CREATE UNIQUE INDEX "schedules_bus_id_departure_time_key" ON "schedules"("bus_id", "departure_time");

-- CreateIndex
CREATE INDEX "schedule_stops_schedule_id_idx" ON "schedule_stops"("schedule_id");

-- CreateIndex
CREATE INDEX "schedule_stops_terminal_id_idx" ON "schedule_stops"("terminal_id");

-- CreateIndex
CREATE UNIQUE INDEX "schedule_stops_schedule_id_stop_sequence_key" ON "schedule_stops"("schedule_id", "stop_sequence");

-- CreateIndex
CREATE INDEX "schedule_seats_schedule_id_status_idx" ON "schedule_seats"("schedule_id", "status");

-- CreateIndex
CREATE INDEX "schedule_seats_status_hold_expires_at_idx" ON "schedule_seats"("status", "hold_expires_at");

-- CreateIndex
CREATE INDEX "schedule_seats_booking_id_idx" ON "schedule_seats"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "schedule_seats_schedule_id_seat_number_key" ON "schedule_seats"("schedule_id", "seat_number");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_code_key" ON "bookings"("code");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_public_token_key" ON "bookings"("public_token");

-- CreateIndex
CREATE INDEX "bookings_schedule_id_idx" ON "bookings"("schedule_id");

-- CreateIndex
CREATE INDEX "bookings_contact_email_idx" ON "bookings"("contact_email");

-- CreateIndex
CREATE INDEX "booking_passengers_booking_id_idx" ON "booking_passengers"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "booking_passengers_booking_id_seat_number_key" ON "booking_passengers"("booking_id", "seat_number");

-- CreateIndex
CREATE UNIQUE INDEX "payments_order_id_key" ON "payments"("order_id");

-- CreateIndex
CREATE INDEX "payments_booking_id_idx" ON "payments"("booking_id");

-- CreateIndex
CREATE INDEX "refunds_booking_id_idx" ON "refunds"("booking_id");

-- CreateIndex
CREATE INDEX "refunds_payment_id_idx" ON "refunds"("payment_id");

-- CreateIndex
CREATE INDEX "payment_events_payment_id_idx" ON "payment_events"("payment_id");

-- AddForeignKey
ALTER TABLE "buses" ADD CONSTRAINT "buses_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "operators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routes" ADD CONSTRAINT "routes_origin_city_id_fkey" FOREIGN KEY ("origin_city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routes" ADD CONSTRAINT "routes_destination_city_id_fkey" FOREIGN KEY ("destination_city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terminals" ADD CONSTRAINT "terminals_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_bus_id_fkey" FOREIGN KEY ("bus_id") REFERENCES "buses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "routes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_stops" ADD CONSTRAINT "schedule_stops_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_stops" ADD CONSTRAINT "schedule_stops_terminal_id_fkey" FOREIGN KEY ("terminal_id") REFERENCES "terminals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_seats" ADD CONSTRAINT "schedule_seats_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_seats" ADD CONSTRAINT "schedule_seats_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "schedules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_passengers" ADD CONSTRAINT "booking_passengers_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CheckConstraints
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_price_check" CHECK ("price" > 0);
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_ticket_total_check" CHECK ("ticket_total" >= 0);
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_service_fee_check" CHECK ("service_fee" >= 0);
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_grand_total_check" CHECK ("grand_total" >= 0);
ALTER TABLE "payments" ADD CONSTRAINT "payments_amount_check" CHECK ("amount" >= 0);
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_amount_check" CHECK ("amount" >= 0);
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_percentage_check" CHECK ("refund_percentage" >= 0 AND "refund_percentage" <= 100);
ALTER TABLE "routes" ADD CONSTRAINT "routes_origin_dest_different_check" CHECK ("origin_city_id" <> "destination_city_id");
ALTER TABLE "schedule_seats" ADD CONSTRAINT "schedule_seats_hold_check" CHECK (("status" <> 'HOLD') OR ("hold_token" IS NOT NULL AND "hold_expires_at" IS NOT NULL));
ALTER TABLE "schedule_seats" ADD CONSTRAINT "schedule_seats_booked_check" CHECK (("status" <> 'BOOKED') OR ("booking_id" IS NOT NULL));
