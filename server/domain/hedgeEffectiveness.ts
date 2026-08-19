export type HedgeEffectivenessInput = {
  hedgedItemChangeBrl: number;
  hedgingInstrumentChangeBrl: number;
  hedgedItemNotionalBrl: number;
  hedgingInstrumentNotionalBrl: number;
  accountingFramework: "IFRS9_CPC48" | "IAS39_LEGACY";
  accountingPolicyReference: string;
  eligibility: {
    eligibleHedgingInstrument: boolean;
    eligibleHedgedItem: boolean;
    documentedAtInception: boolean;
    economicRelationship: boolean;
    creditRiskDominatesValueChanges: boolean;
    hedgeRatioMatchesActualQuantities: boolean;
  };
  lineage: {
    valuationAsOf: string;
    cpc48Revision: "CPC_48_REV_14";
    cpc48SourceHashSha256: string;
    valuationSourceIds: string[];
  };
};

export type HedgeEffectivenessResult = {
  method: "CPC48_IFRS9_EFFECTIVENESS_SCREENING" | "IAS39_LEGACY_POLICY_CHECK";
  formulaVersion: "1.0.0";
  offsetRatio: number | null;
  ineffectivenessBrl: number;
  actualNotionalHedgeRatio: number | null;
  accountingFramework: HedgeEffectivenessInput["accountingFramework"];
  accountingPolicyReference: string;
  criteria: Array<{ criterion: string; passed: boolean; rationale: string }>;
  status: "screening_passed_not_accounting_conclusion" | "screening_incomplete_or_failed";
  warnings: string[];
  lineage: HedgeEffectivenessInput["lineage"];
};

const CPC48_HASH = "90ff2efbbbb449b89c53947b2beafd9acc871beccfc5fd28d4d553752fc4e9a8";

/**
 * Diagnóstico quantitativo e documental do item 6.4.1 do CPC 48. Não reconhece
 * contabilização de hedge, não aplica banda 80–125% e não substitui a política contábil.
 */
export function assessHedgeEffectiveness(input: HedgeEffectivenessInput): HedgeEffectivenessResult {
  if (!Number.isFinite(input.hedgedItemChangeBrl) || !Number.isFinite(input.hedgingInstrumentChangeBrl)) throw new Error("As variações do item protegido e do instrumento de hedge devem ser finitas.");
  if (!input.lineage.valuationAsOf || input.lineage.cpc48Revision !== "CPC_48_REV_14" || input.lineage.cpc48SourceHashSha256 !== CPC48_HASH || input.lineage.valuationSourceIds.length === 0) throw new Error("A triagem exige data-base, fontes de valoração e hash da revisão CPC 48 utilizada.");
  if (!Number.isFinite(input.hedgedItemNotionalBrl) || !Number.isFinite(input.hedgingInstrumentNotionalBrl) || input.hedgedItemNotionalBrl <= 0 || input.hedgingInstrumentNotionalBrl <= 0) throw new Error("Os nocionais devem ser positivos e finitos para calcular o hedge ratio.");
  if (!input.accountingPolicyReference.trim()) throw new Error("A triagem exige a referência da política contábil aplicável.");
  const actualNotionalHedgeRatio = input.hedgingInstrumentNotionalBrl / input.hedgedItemNotionalBrl;
  const offsetRatio = input.hedgedItemChangeBrl === 0 ? null : -input.hedgingInstrumentChangeBrl / input.hedgedItemChangeBrl;
  const ifrsCriteria = [
    { criterion: "Instrumento de hedge elegível", passed: input.eligibility.eligibleHedgingInstrument, rationale: "CPC 48.6.4.1(a)" },
    { criterion: "Item protegido elegível", passed: input.eligibility.eligibleHedgedItem, rationale: "CPC 48.6.4.1(a)" },
    { criterion: "Designação e documentação no início", passed: input.eligibility.documentedAtInception, rationale: "CPC 48.6.4.1(b)" },
    { criterion: "Relação econômica", passed: input.eligibility.economicRelationship, rationale: "CPC 48.6.4.1(c)(i)" },
    { criterion: "Risco de crédito não dominante", passed: !input.eligibility.creditRiskDominatesValueChanges, rationale: "CPC 48.6.4.1(c)(ii)" },
    { criterion: "Índice de hedge aderente às quantidades efetivamente usadas", passed: input.eligibility.hedgeRatioMatchesActualQuantities, rationale: "CPC 48.6.4.1(c)(iii)" },
  ];
  const ias39Criteria = [
    { criterion: "Política IAS 39 legada identificada", passed: input.accountingPolicyReference.trim().length > 0, rationale: "Referência interna informada; a política da entidade define a metodologia." },
    { criterion: "Documentação do teste legada declarada", passed: input.eligibility.documentedAtInception, rationale: "O HEDGE LAB não executa teste retrospectivo nem aplica faixa automática." },
    { criterion: "Revisão profissional requerida", passed: true, rationale: "Resultado apenas de governança; não produz conclusão contábil." },
  ];
  const criteria = input.accountingFramework === "IAS39_LEGACY" ? ias39Criteria : ifrsCriteria;
  const passed = criteria.every(criterion => criterion.passed) && offsetRatio !== null;
  const warnings = [
    "O offset ratio é uma métrica diagnóstica: CPC 48/IFRS 9 não autoriza concluir contabilização de hedge por uma banda quantitativa isolada.",
    "O resultado exige avaliação da política contábil, documentação formal, fontes de inefetividade e aprovação profissional antes de qualquer lançamento contábil.",
  ];
  warnings.unshift(input.accountingFramework === "IAS39_LEGACY" ? "Framework IAS 39 legado declarado: a entidade deve aplicar sua política documentada; a plataforma não aplica automaticamente banda retrospectiva." : "Framework IFRS 9/CPC 48 declarado: a triagem avalia os critérios prospectivos declarados no CPC 48.6.4.1.");
  if (offsetRatio === null) warnings.unshift("O offset ratio não é calculável porque a variação do item protegido é zero na observação.");
  return { method: input.accountingFramework === "IAS39_LEGACY" ? "IAS39_LEGACY_POLICY_CHECK" : "CPC48_IFRS9_EFFECTIVENESS_SCREENING", formulaVersion: "1.0.0", offsetRatio, ineffectivenessBrl: input.hedgedItemChangeBrl + input.hedgingInstrumentChangeBrl, actualNotionalHedgeRatio, accountingFramework: input.accountingFramework, accountingPolicyReference: input.accountingPolicyReference, criteria, status: passed ? "screening_passed_not_accounting_conclusion" : "screening_incomplete_or_failed", warnings, lineage: input.lineage };
}
