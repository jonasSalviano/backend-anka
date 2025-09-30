import { prisma } from './prisma.js';
import { Prisma } from '@prisma/client';

const D = (n: number|string) => new Prisma.Decimal(n);

export class SimulationService {
  static async create(name: string, startDate: Date, realRatePct = 4) {
    const sim = await prisma.simulation.create({ data: { name } });
    const version = await prisma.simulationVersion.create({
      data: { simulationId: sim.id, startDate, realRatePct: D(realRatePct), versionIndex: 1 }
    });
    return { sim, version };
  }

  static async edit(simulationId: string, args: { name?: string; startDate?: Date; realRatePct?: number; }) {
    if (args.name) await prisma.simulation.update({ where: { id: simulationId }, data: { name: args.name } });
    const latest = await prisma.simulationVersion.findFirstOrThrow({ where: { simulationId }, orderBy: { createdAt: 'desc' } });
    const data: Prisma.SimulationVersionUpdateInput = {};
    if (args.startDate) data.startDate = args.startDate;
    if (typeof args.realRatePct === 'number') data.realRatePct = D(args.realRatePct);
    if (Object.keys(data).length) await prisma.simulationVersion.update({ where: { id: latest.id }, data });
  }

  static async delete(simulationId: string) {
    const sim = await prisma.simulation.findUniqueOrThrow({ where: { id: simulationId } });
    if (sim.name.toLowerCase().includes('situação atual')) throw new Error('Situação Atual não pode ser deletada');
    await prisma.simulation.delete({ where: { id: simulationId } });
  }

  static async newVersion(simulationId: string) {
    const latest = await prisma.simulationVersion.findFirstOrThrow({ where: { simulationId }, orderBy: { createdAt: 'desc' } });
    await prisma.simulationVersion.update({ where: { id: latest.id }, data: { isLegacy: true } });

    const version = await prisma.simulationVersion.create({
      data: { simulationId, startDate: latest.startDate, realRatePct: latest.realRatePct, versionIndex: latest.versionIndex + 1 }
    });

    await prisma.$transaction(async (tx) => {
      const allocs = await tx.allocation.findMany({ where: { versionId: latest.id } });
      for (const a of allocs) {
        const newA = await tx.allocation.create({
          data: {
            versionId: version.id, type: a.type, name: a.name,
            hasFinancing: a.hasFinancing, financeStart: a.financeStart,
            financeInstallments: a.financeInstallments, financeMonthlyRate: a.financeMonthlyRate,
            financeDownPayment: a.financeDownPayment
          }
        });
        const entries = await tx.allocationEntry.findMany({ where: { allocationId: a.id } });
        for (const e of entries) {
          await tx.allocationEntry.create({ data: { allocationId: newA.id, date: e.date, value: e.value } });
        }
      }

      const moves = await tx.movement.findMany({ where: { versionId: latest.id } });
      for (const m of moves) {
        await tx.movement.create({
          data: { versionId: version.id, type: m.type, value: m.value, frequency: m.frequency, startDate: m.startDate, endDate: m.endDate }
        });
      }

      const ins = await tx.insurance.findMany({ where: { versionId: latest.id } });
      for (const s of ins) {
        await tx.insurance.create({
          data: { versionId: version.id, type: s.type, name: s.name, startDate: s.startDate, durationMo: s.durationMo, premiumMo: s.premiumMo, insuredAmt: s.insuredAmt }
        });
      }
    });

    return version;
  }

  static async createCurrentSituation() {
    const sims = await prisma.simulation.findMany({ include: { versions: { orderBy: { createdAt: 'desc' }, take: 1 } } });
    const byName = new Map<string, { simId: string; versionId: string }>();
    for (const s of sims) {
      if (s.versions.length === 0) continue;
      const k = s.name.toLowerCase();
      const exist = byName.get(k);
      if (!exist || s.id < exist.simId) byName.set(k, { simId: s.id, versionId: s.versions[0].id });
    }
    const first = [...byName.values()][0];
    if (!first) throw new Error('Nenhuma simulação para copiar');

    const baseSim = await prisma.simulation.findUniqueOrThrow({ where: { id: first.simId } });
    const { sim, version } = await this.create(`Situação Atual - ${baseSim.name}`, new Date(), 4);
    await this.copyVersionData(first.versionId, version.id);
    return { sim, version };
  }

  static async copyVersionData(fromVersion: string, toVersion: string) {
    await prisma.$transaction(async (tx) => {
      const allocs = await tx.allocation.findMany({ where: { versionId: fromVersion } });
      for (const a of allocs) {
        const newA = await tx.allocation.create({
          data: {
            versionId: toVersion, type: a.type, name: a.name,
            hasFinancing: a.hasFinancing, financeStart: a.financeStart,
            financeInstallments: a.financeInstallments, financeMonthlyRate: a.financeMonthlyRate,
            financeDownPayment: a.financeDownPayment
          }
        });
        const entries = await tx.allocationEntry.findMany({ where: { allocationId: a.id } });
        for (const e of entries) {
          await tx.allocationEntry.create({ data: { allocationId: newA.id, date: e.date, value: e.value } });
        }
      }

      const moves = await tx.movement.findMany({ where: { versionId: fromVersion } });
      for (const m of moves) {
        await tx.movement.create({
          data: { versionId: toVersion, type: m.type, value: m.value, frequency: m.frequency, startDate: m.startDate, endDate: m.endDate }
        });
      }

      const ins = await tx.insurance.findMany({ where: { versionId: fromVersion } });
      for (const s of ins) {
        await tx.insurance.create({
          data: { versionId: toVersion, type: s.type, name: s.name, startDate: s.startDate, durationMo: s.durationMo, premiumMo: s.premiumMo, insuredAmt: s.insuredAmt }
        });
      }
    });
  }

  static getVersions(simulationId: string) {
    return prisma.simulationVersion.findMany({ where: { simulationId }, orderBy: { createdAt: 'desc' } });
  }
}
