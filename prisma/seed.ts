import { PrismaClient, Prisma } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();
const prisma = new PrismaClient();

type AllocationKind = 'FINANCIAL' | 'REAL_ESTATE';
interface AllocationMock {
  id: string; name: string; type: string; kind: AllocationKind; updatedAt: string | null;
  start: string; end?: string; value: number; financed: boolean; base?: number;
  installmentsTotal?: number; installmentsPaid?: number;
}

const mockAllocations: AllocationMock[] = [
  { id: 'cdb-itau', name: 'CDB Banco Itaú', type: 'Financeira Manual', kind: 'FINANCIAL', updatedAt: '2025-06-10', start: '2024-06-20', value: 1000000, financed: false },
  { id: 'cdb-c6', name: 'CDB Banco C6', type: 'Financeira Manual', kind: 'FINANCIAL', updatedAt: '2025-08-10', start: '2023-06-20', value: 1000000, financed: false },
  { id: 'apto-vila-olimpia', name: 'Apartamento Vila Olímpia', type: 'Imobilizada', kind: 'REAL_ESTATE', updatedAt: '2025-08-10', start: '2024-07-01', end: '2041-02-01', value: 148666, base: 2123800, financed: true, installmentsTotal: 200, installmentsPaid: 14 },
  { id: 'loja', name: 'Loja', type: 'Imobilizada', kind: 'REAL_ESTATE', updatedAt: null, start: '2023-04-20', value: 1800000, financed: false },
];

const projectionData = [
  { year: 2025, financeiro: 850000, imobilizado: 1200000, totalSemSeg: 2050000, total: 2550000 },
  { year: 2030, financeiro: 1700000, imobilizado: 1350000, totalSemSeg: 3050000, total: 3550000 },
  { year: 2035, financeiro: 2200000, imobilizado: 1450000, totalSemSeg: 3650000, total: 4150000 },
  { year: 2040, financeiro: 2100000, imobilizado: 1500000, totalSemSeg: 3600000, total: 4100000 },
  { year: 2045, financeiro: 1500000, imobilizado: 1400000, totalSemSeg: 2900000, total: 3400000 },
  { year: 2050, financeiro: 900000,  imobilizado: 1200000, totalSemSeg: 2100000, total: 2600000 },
  { year: 2055, financeiro: 400000,  imobilizado: 900000,  totalSemSeg: 1300000, total: 1800000 },
  { year: 2060, financeiro: 100000,  imobilizado: 500000,  totalSemSeg: 600000,  total: 1100000 },
];

const movements = [
  { id: 'm1', name: 'Herança',        freq: 'Única',  type: 'Crédito', value: 220000 },
  { id: 'm2', name: 'Comissão',       freq: 'Anual',  type: 'Crédito', value: 500000 },
  { id: 'm3', name: 'Custo do filho', freq: 'Mensal', type: 'Débito',  value: -1500  },
];

const insurances = [
  { id: 'i1', name: 'Seguro de Vida Familiar', duration: 15, premiumMo: 150, insured: 500000 },
  { id: 'i2', name: 'Seguro de Invalidez',     duration: 6,  premiumMo: 200, insured: 100000 },
];

const D = (n: number | string) => new Prisma.Decimal(n);
const parseBr = (d: string) => { const [dd, mm, yy] = d.split('/').map(Number); return new Date(2000+yy, mm-1, dd); };

async function main() {
  const sim = await prisma.simulation.upsert({
    where: { name: 'Matheus Silveira' },
    update: {},
    create: { name: 'Matheus Silveira' },
  });

  const baseVersion = await prisma.simulationVersion.create({
    data: { simulationId: sim.id, startDate: new Date('2025-01-01'), realRatePct: D(4), versionIndex: 1, isLegacy: false },
  });

  for (const a of mockAllocations) {
    const alloc = await prisma.allocation.create({
      data: {
        versionId: baseVersion.id,
        type: a.kind === 'FINANCIAL' ? 'FINANCIAL' : 'REAL_ESTATE',
        name: a.name,
        hasFinancing: a.financed,
        financeStart: a.financed ? new Date(a.start) : null,
        financeInstallments: a.financed ? (a.installmentsTotal ?? null) : null,
        financeMonthlyRate: null,
        financeDownPayment: null,
      },
    });
    await prisma.allocationEntry.create({
      data: { allocationId: alloc.id, date: new Date(a.start), value: D(a.value) },
    });
  }

  for (const m of movements) {
    await prisma.movement.create({
      data: {
        versionId: baseVersion.id,
        type: m.type === 'Crédito' ? 'INCOME' : 'EXPENSE',
        value: D(Math.abs(m.value)),
        frequency: m.freq === 'Única' ? 'UNIQUE' : m.freq === 'Mensal' ? 'MONTHLY' : 'YEARLY',
        startDate: new Date('2025-01-01'),
        endDate: null,
      },
    });
  }

  for (const i of insurances) {
    await prisma.insurance.create({
      data: {
        versionId: baseVersion.id,
        type: i.name.includes('Invalidez') ? 'DISABILITY' : 'LIFE',
        name: i.name,
        startDate: new Date('2025-01-01'),
        durationMo: i.duration * 12,
        premiumMo: D(i.premiumMo),
        insuredAmt: D(i.insured),
      },
    });
  }

  for (const p of projectionData) {
    await prisma.projection.create({
      data: {
        versionId: baseVersion.id,
        status: 'VIVO',
        year: p.year,
        finWealth: D(p.financeiro),
        realWealth: D(p.imobilizado),
        totalNoIns: D(p.totalSemSeg),
        total: D(p.total),
      },
    });
  }

  let idx = 2;
  const history = [
    { date: '01/02/25', patrimonioFinal: 4312500 },
    { date: '04/05/25', patrimonioFinal: 3587420 },
    { date: '10/06/25', patrimonioFinal: 3100000 },
    { date: '12/07/25', patrimonioFinal: 2800000 },
  ];
  for (const h of history) {
    const v = await prisma.simulationVersion.create({
      data: {
        simulationId: sim.id,
        startDate: new Date('2025-01-01'),
        realRatePct: D(4),
        versionIndex: idx++,
        createdAt: parseBr(h.date),
        isLegacy: true,
      },
    });
    await prisma.projection.create({
      data: {
        versionId: v.id,
        status: 'VIVO',
        year: 2060,
        finWealth: D(h.patrimonioFinal),
        realWealth: D(0),
        totalNoIns: D(h.patrimonioFinal),
        total: D(h.patrimonioFinal),
      },
    });
  }

  console.log('Seed OK');
}

main().catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
