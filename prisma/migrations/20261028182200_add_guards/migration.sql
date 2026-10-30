-- DropIndex
DROP INDEX "refunds_booking_id_idx";

-- CreateIndex: Unique refund per booking
CREATE UNIQUE INDEX "refunds_booking_id_key" ON "refunds"("booking_id");

-- CreateIndex: Partial unique index preventing multiple PENDING payments for the same booking
CREATE UNIQUE INDEX "payments_booking_id_pending_key" ON "payments"("booking_id") WHERE "status" = 'PENDING';

-- CheckConstraints
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_arrival_after_departure_check" CHECK ("arrival_time" > "departure_time");
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_grand_total_sum_check" CHECK ("grand_total" = ("ticket_total" + "service_fee"));
