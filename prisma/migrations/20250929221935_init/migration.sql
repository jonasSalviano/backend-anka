-- CreateEnum
CREATE TYPE "AllocationType" AS ENUM ('FINANCIAL', 'REAL_ESTATE');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "Frequency" AS ENUM ('UNIQUE', 'MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "InsuranceType" AS ENUM ('LIFE', 'DISABILITY');

-- CreateEnum
CREATE TYPE "LifeStatus" AS ENUM ('VIVO', 'MORTO', 'INVALIDO');

-- CreateTable
CREATE TABLE "Simulation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Simulation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationVersion" (
    "id" TEXT NOT NULL,
    "simulationId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "realRatePct" DECIMAL(65,30) NOT NULL,
    "isLegacy" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "versionIndex" INTEGER NOT NULL,

    CONSTRAINT "SimulationVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Allocation" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "type" "AllocationType" NOT NULL,
    "name" TEXT NOT NULL,
    "hasFinancing" BOOLEAN NOT NULL DEFAULT false,
    "financeStart" TIMESTAMP(3),
    "financeInstallments" INTEGER,
    "financeMonthlyRate" DECIMAL(65,30),
    "financeDownPayment" DECIMAL(65,30),

    CONSTRAINT "Allocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AllocationEntry" (
    "id" TEXT NOT NULL,
    "allocationId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "value" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "AllocationEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Movement" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "type" "MovementType" NOT NULL,
    "value" DECIMAL(65,30) NOT NULL,
    "frequency" "Frequency" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),

    CONSTRAINT "Movement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Insurance" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "type" "InsuranceType" NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "durationMo" INTEGER NOT NULL,
    "premiumMo" DECIMAL(65,30) NOT NULL,
    "insuredAmt" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "Insurance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Projection" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "status" "LifeStatus" NOT NULL,
    "year" INTEGER NOT NULL,
    "finWealth" DECIMAL(65,30) NOT NULL,
    "realWealth" DECIMAL(65,30) NOT NULL,
    "totalNoIns" DECIMAL(65,30) NOT NULL,
    "total" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "Projection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Simulation_name_key" ON "Simulation"("name");

-- CreateIndex
CREATE INDEX "SimulationVersion_simulationId_createdAt_idx" ON "SimulationVersion"("simulationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AllocationEntry_allocationId_date_key" ON "AllocationEntry"("allocationId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Projection_versionId_status_year_key" ON "Projection"("versionId", "status", "year");

-- AddForeignKey
ALTER TABLE "SimulationVersion" ADD CONSTRAINT "SimulationVersion_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "Simulation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Allocation" ADD CONSTRAINT "Allocation_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "SimulationVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AllocationEntry" ADD CONSTRAINT "AllocationEntry_allocationId_fkey" FOREIGN KEY ("allocationId") REFERENCES "Allocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movement" ADD CONSTRAINT "Movement_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "SimulationVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Insurance" ADD CONSTRAINT "Insurance_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "SimulationVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Projection" ADD CONSTRAINT "Projection_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "SimulationVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
