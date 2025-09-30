import { prisma } from './prisma.js';
import { Prisma } from '@prisma/client';
import { RunProjectionInput, RunProjectionResult, YearPoint, LifeStatusIn } from '../models/ProjectionModel.js';

const D = (n: number|string) => new Prisma.Decimal(n);

function applyRealRate(amount: Prisma.Decimal, ratePct: number): Prisma.Decimal {
  const r = new Prisma.Decimal(ratePct).div(100);
  return amount.mul(r.add(1));
}

function lifeRules(status: LifeStatusIn, v: { incomes: Prisma.Decimal; expenses: Prisma.Decimal }) {
  if (status === 'MORTO') return { incomes: D(0), expenses: v.expenses.div(2) };
  if (status === 'INVALIDO') return { incomes: D(0), expenses: v.expenses };
  return v;
}

export class ProjectionService {
  static async run(input: RunProjectionInput): Promise<RunProjectionResult> {
    const version = await prisma.simulationVersion.findFirstOrThrow({
      where: { simulationId: input.simulationId },
      orderBy: { createdAt: 'desc' },
    });

    const start = new Date(input.startDate ?? version.startDate);
    const yearStart = start.getUTCFullYear();
    const ratePct = input.realRatePct ?? Number(version.realRatePct);

    // base: último registro <= start de cada alocação
    const allocations = await prisma.allocation.findMany({
      where: { versionId: version.id },
      select: { id: true, type: true }
    });

    const allocationIds = allocations.map(a => a.id);
    const latestEntriesByAllocation = await prisma.allocationEntry.groupBy({
      by: ['allocationId'],
      where: {
        allocationId: { in: allocationIds },
        date: { lte: start },
      },
      _max: { date: true },
    });

    const uniqueEntries = await prisma.allocationEntry.findMany({
      where: {
        OR: latestEntriesByAllocation.map(e => ({
          allocationId: e.allocationId,
          date: e._max.date!,
        })),
      },
    });

    const allocMap = new Map(allocations.map(a => [a.id, a]));
    const { fin0, real0 } = uniqueEntries.reduce((acc, entry) => {
      const alloc = allocMap.get(entry.allocationId);
      if (alloc?.type === 'FINANCIAL') acc.fin0 = acc.fin0.add(entry.value);
      else if (alloc?.type === 'REAL_ESTATE') acc.real0 = acc.real0.add(entry.value);
      return acc;
    }, { fin0: D(0), real0: D(0) });

    const moves = await prisma.movement.findMany({ where: { versionId: version.id } });
    const ins = await prisma.insurance.findMany({ where: { versionId: version.id } });

    const points: YearPoint[] = [];
    let fin = fin0;
    let real = real0;
    let finNoIns = fin0;

    for (let y = yearStart; y <= 2060; y++) {
      if (y > yearStart) {
        fin = applyRealRate(fin, ratePct);
        real = applyRealRate(real, ratePct);
        finNoIns = applyRealRate(finNoIns, ratePct);
      }

      let incomes = D(0);
      let expenses = D(0);

      for (const m of moves) {
        const yStart = m.startDate.getUTCFullYear();
        const yEnd = (m.endDate ?? new Date('2099-12-31')).getUTCFullYear();
        if (y < yStart || y > yEnd) continue;

        const val = m.value;
        if (m.frequency === 'UNIQUE') {
          if (y === yStart) {
            if (m.type === 'INCOME') incomes = incomes.add(val);
            else expenses = expenses.add(val);
          }
        } else if (m.frequency === 'YEARLY') {
          if (m.type === 'INCOME') incomes = incomes.add(val);
          else expenses = expenses.add(val);
        } else if (m.frequency === 'MONTHLY') {
          const yearVal = val.mul(12);
          if (m.type === 'INCOME') incomes = incomes.add(yearVal);
          else expenses = expenses.add(yearVal);
        }
      }

      let premiumYear = D(0);
      for (const s of ins) {
        const startY = s.startDate.getUTCFullYear();
        const endDate = new Date(s.startDate);
        endDate.setUTCMonth(endDate.getUTCMonth() + s.durationMo);
        endDate.setUTCDate(endDate.getUTCDate() - 1);
        const endY = endDate.getUTCFullYear();
        if (y >= startY && y <= endY) premiumYear = premiumYear.add(s.premiumMo.mul(12));
      }
      expenses = expenses.add(premiumYear);

      const lr = lifeRules(input.status, { incomes, expenses });
      incomes = lr.incomes; expenses = lr.expenses;

      fin = fin.add(incomes).sub(expenses);
      finNoIns = finNoIns.add(incomes).sub(expenses.sub(premiumYear));

      points.push({
        year: y,
        finWealth: Number(fin),
        realWealth: Number(real),
        totalNoIns: Number(finNoIns.add(real)),
        total: Number(fin.add(real)),
      });
    }

    return { versionId: version.id, status: input.status, points };
  }
}
