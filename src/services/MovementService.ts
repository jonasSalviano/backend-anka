import { prisma } from './prisma.js';
import { Prisma } from '@prisma/client';
const D = (n:number|string)=>new Prisma.Decimal(n);

export class MovementService {
  static create(versionId: string, args: { type: 'INCOME'|'EXPENSE'; value: number; frequency: 'UNIQUE'|'MONTHLY'|'YEARLY'; startDate: string; endDate?: string; }) {
    return prisma.movement.create({
      data: { versionId, type: args.type, value: D(Math.abs(args.value)), frequency: args.frequency, startDate: new Date(args.startDate), endDate: args.endDate ? new Date(args.endDate) : null }
    });
  }
  static list(versionId: string) {
    return prisma.movement.findMany({ where: { versionId }, orderBy: { startDate: 'asc' }});
  }
  static update(id: string, args: Partial<{ type: 'INCOME'|'EXPENSE'; value: number; frequency: 'UNIQUE'|'MONTHLY'|'YEARLY'; startDate: string; endDate: string|null; }>) {
    const data: Prisma.MovementUpdateInput = {};
    if (args.type) data.type = args.type;
    if (typeof args.value === 'number') data.value = D(Math.abs(args.value));
    if (args.frequency) data.frequency = args.frequency;
    if (args.startDate) data.startDate = new Date(args.startDate);
    if ('endDate' in args) data.endDate = args.endDate ? new Date(args.endDate) : null;
    return prisma.movement.update({ where: { id }, data });
  }
  static delete(id: string) { return prisma.movement.delete({ where: { id } }); }
}
