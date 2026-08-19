import { describe, expect, it } from "vitest";
import { assessHedgeEffectiveness } from "./hedgeEffectiveness";

const lineage = { valuationAsOf: "2026-08-13", cpc48Revision: "CPC_48_REV_14" as const, cpc48SourceHashSha256: "90ff2efbbbb449b89c53947b2beafd9acc871beccfc5fd28d4d553752fc4e9a8", valuationSourceIds: ["BCB_PTAX", "B3_PUBLIC_FILES"] };
const eligibility = { eligibleHedgingInstrument: true, eligibleHedgedItem: true, documentedAtInception: true, economicRelationship: true, creditRiskDominatesValueChanges: false, hedgeRatioMatchesActualQuantities: true };

describe("triagem de efetividade CPC 48", () => {
  it("calcula offset e inefetividade sem concluir hedge accounting", () => {
    const result = assessHedgeEffectiveness({ hedgedItemChangeBrl: 100_000, hedgingInstrumentChangeBrl: -96_000, hedgedItemNotionalBrl: 1_000_000, hedgingInstrumentNotionalBrl: 950_000, accountingFramework: "IFRS9_CPC48", accountingPolicyReference: "POL-HDG-001", eligibility, lineage });
    expect(result.offsetRatio).toBeCloseTo(0.96, 8);
    expect(result.ineffectivenessBrl).toBe(4_000);
    expect(result.actualNotionalHedgeRatio).toBeCloseTo(0.95, 8);
    expect(result.status).toBe("screening_passed_not_accounting_conclusion");
  });

  it("aplica o gate documental distinto do framework IAS 39 legado", () => {
    const result = assessHedgeEffectiveness({ hedgedItemChangeBrl: 100, hedgingInstrumentChangeBrl: -100, hedgedItemNotionalBrl: 100, hedgingInstrumentNotionalBrl: 100, accountingFramework: "IAS39_LEGACY", accountingPolicyReference: "POL-LEG-001", eligibility: { ...eligibility, documentedAtInception: false }, lineage });
    expect(result.method).toBe("IAS39_LEGACY_POLICY_CHECK");
    expect(result.status).toBe("screening_incomplete_or_failed");
    expect(result.criteria.find(item => item.criterion === "Documentação do teste legada declarada")?.passed).toBe(false);
  });
});
