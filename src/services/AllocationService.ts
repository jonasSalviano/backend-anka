import { prisma } from './prisma.js';
import { Prisma } from '@prisma/client';
const D = (n:number|string)=>new Prisma.Decimal(n);

export class AllocationService {
  static async addFinancial(versionId: string, name: string, value: number, date: string) {
    const a = await prisma.allocation.create({ data: { versionId, type: 'FINANCIAL', name } });
    await prisma.allocationEntry.create({ data: { allocationId: a.id, date: new Date(date), value: D(value) }});
    return a;
  }

  static async addRealEstate(versionId: string, args: { name: string; value: number; date: string;
    financed?: { start: string; installments: number; monthlyRate?: number; downPayment?: number } }) {
    const a = await prisma.allocation.create({
      data: {
        versionId, type: 'REAL_ESTATE', name: args.name,
        hasFinancing: !!args.financed,
        financeStart: args.financed ? new Date(args.financed.start) : null,
        financeInstallments: args.financed?.installments ?? null,
        financeMonthlyRate: args.financed?.monthlyRate ? D(args.financed.monthlyRate) : null,
        financeDownPayment: args.financed?.downPayment ? D(args.financed.downPayment) : null,
      }
    });
    await prisma.allocationEntry.create({ data: { allocationId: a.id, date: new Date(args.date), value: D(args.value) }});
    return a;
  }

  static timeline(allocationId: string) {
    return prisma.allocationEntry.findMany({ where: { allocationId }, orderBy: { date: 'asc' }});
  }

  static addEntry(allocationId: string, value: number, date: string) {
    return prisma.allocationEntry.create({ data: { allocationId, value: D(value), date: new Date(date) }});
  }

  static editEntry(entryId: string, value: number) {
    return prisma.allocationEntry.update({ where: { id: entryId }, data: { value: D(value) }});
  }

  static updateToday(allocationId: string, value: number) {
    return this.addEntry(allocationId, value, new Date().toISOString());
  }
}
