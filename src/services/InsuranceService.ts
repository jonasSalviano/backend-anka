import { prisma } from './prisma.js';
import { Prisma } from '@prisma/client';
const D = (n:number|string)=>new Prisma.Decimal(n);

export class InsuranceService {
  static create(versionId: string, args: { type: 'LIFE'|'DISABILITY'; name: string; startDate: string; durationMo: number; premiumMo: number; insuredAmt: number; }) {
    return prisma.insurance.create({ data: { versionId, type: args.type, name: args.name, startDate: new Date(args.startDate), durationMo: args.durationMo, premiumMo: D(args.premiumMo), insuredAmt: D(args.insuredAmt) }});
  }
  static list(versionId: string) { return prisma.insurance.findMany({ where: { versionId }, orderBy: { startDate: 'asc' }}); }
  static delete(id: string) { return prisma.insurance.delete({ where: { id } }); }
}
