export type AuditExposure = {
  description: string;
  currency: string;
  direction: "RECEIVABLE" | "PAYABLE";
  notional: number;
  cashflow_date: string;
  exposureClass?: "FINANCIAL" | "PHYSICAL_COMMODITY";
  physicalQuantity?: number | null;
  physicalUnit?: string | null;
  commodityReference?: string | null;
};

export type AuditLineage = {
  source_id: string;
  source_url: string;
  source_file: string;
  extracted_at_utc: string;
  source_asof: string | null;
  source_hash_sha256: string | null;
  parser_version: string;
  validation_status: "valid" | "invalid" | "warning";
};

export type AuditReportModel = {
  generatedAtUtc: string;
  scenarioId: string;
  exposures: AuditExposure[];
  lineage: AuditLineage[];
  calculationMemory: string[];
  limitations: string[];
};

export function createAuditReportModel(input: {
  generatedAtUtc: string;
  scenarioId: string;
  exposures: AuditExposure[];
  lineage: AuditLineage[];
  calculationMemory?: string[];
  limitations?: string[];
}): AuditReportModel {
  return {
    generatedAtUtc: input.generatedAtUtc,
    scenarioId: input.scenarioId,
    exposures: input.exposures,
    lineage: input.lineage,
    calculationMemory: input.calculationMemory ?? [
      "O relatório representa exclusivamente o estado dos DataFrames na sessão no instante indicado.",
      "As exposições são mantidas como registros econômicos; não há persistência relacional neste ambiente.",
      "Nenhum MTM, Greek, VaR, efetividade contábil ou preço de derivativo é apresentado sem boletim B3 de preços validado.",
      "Quando utilizado, o dimensionamento DOL/WDO deve registrar contrato, política de arredondamento, nocional e residual no pacote de cenário correspondente.",
    ],
    limitations: input.limitations ?? [
      "Este documento não constitui recomendação de investimento, instrução de negociação ou parecer contábil.",
      "A qualificação para hedge accounting exige política da entidade, documentação de designação e validação por responsável técnico.",
      "Dados ou cálculos sem fonte, layout e convenção confirmados permanecem indisponíveis em vez de serem estimados.",
    ],
  };
}
