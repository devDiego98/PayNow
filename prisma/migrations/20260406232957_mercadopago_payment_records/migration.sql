-- CreateTable
CREATE TABLE "mercadopago_payment_records" (
    "id" TEXT NOT NULL,
    "mpPaymentId" TEXT NOT NULL,
    "externalReference" TEXT,
    "preferenceId" TEXT,
    "merchantOrderId" TEXT,
    "status" TEXT NOT NULL,
    "statusDetail" TEXT,
    "transactionAmount" DECIMAL(20,4),
    "currencyId" TEXT,
    "payerEmail" TEXT,
    "paymentMethodId" TEXT,
    "paymentTypeId" TEXT,
    "dateApproved" TIMESTAMP(3),
    "notificationJson" JSONB,
    "paymentSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mercadopago_payment_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mercadopago_payment_records_mpPaymentId_key" ON "mercadopago_payment_records"("mpPaymentId");

-- CreateIndex
CREATE INDEX "mercadopago_payment_records_externalReference_idx" ON "mercadopago_payment_records"("externalReference");

-- CreateIndex
CREATE INDEX "mercadopago_payment_records_preferenceId_idx" ON "mercadopago_payment_records"("preferenceId");

-- CreateIndex
CREATE INDEX "mercadopago_payment_records_status_idx" ON "mercadopago_payment_records"("status");
