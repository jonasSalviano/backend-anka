export type LifeStatusIn = 'VIVO'|'MORTO'|'INVALIDO';

export interface RunProjectionInput {
  simulationId: string;
  status: LifeStatusIn;
  realRatePct?: number;
  startDate?: string;
}

export interface YearPoint {
  year: number;
  finWealth: number;
  realWealth: number;
  totalNoIns: number;
  total: number;
}

export interface RunProjectionResult {
  versionId: string;
  status: LifeStatusIn;
  points: YearPoint[];
}
