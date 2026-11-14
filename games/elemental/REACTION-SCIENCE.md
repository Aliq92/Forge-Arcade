# Reaction Lab scientific scope

This is a deterministic educational endpoint simulator, not a laboratory procedure, safety assessment, kinetics solver or general aqueous-equilibrium calculator. Guided and free trials call the same pure `simulate(config,catalog)` function. Unsupported mixtures return **NO VERIFIED REACTION AVAILABLE**, unchanged initial/final material ledgers and no effect or products. This does not establish chemical inertness.

## Quantities and limits

Species compositions, identities, charge and molar mass come exclusively from the shared catalogue. Every ledger amount is mmol. Form quantities use mL for liquid samples and mmol for solids, solution solutes and gases. Inputs must be finite numeric values ≥0.000001 in their form unit. At most six distinct forms are accepted; duplicate forms merge within finite trial stock. Solids are bounded at 100 mmol, solution solutes and gases at 10 mmol, liquid samples at 200 mL, and total stock-carrier plus liquid volume at 500 mL. Runs recalculate a trial; they do not create cumulative inventory.

All aqueous stocks represent 0.1 mol/L solute; a q-mmol selection contributes q/0.1 mL water. Strong electrolytes are initially represented as separated aqueous ions, including spectators. This carrier water is explicitly conserved. Approximate room-temperature densities: water 1 g/mL, ethanol 0.789 g/mL and hexane 0.659 g/mL. Approximate solution/liquid-mixture volumes are additive; dissolved-solid volume, contraction, the small amount of water created within an existing solution, and solid displacement do not change the volume readout. A pure-water ice or vapor endpoint has zero modeled liquid volume. For gas-only activated synthesis, the liquid water product establishes a positive liquid volume from its mass using the 1 g/mL water-density approximation. Salt recovery reports only the retained liquid-solvent volume. The balance includes every material in the modeled ledger, including evolved or removed gas, rather than predicting the weight of an open real vessel.

Temperatures are settings −10, 25 and 110 °C. Nonambient endpoints support only pure water. No reaction temperature rise, heat, duration or pressure is calculated. The pressure readout is always unavailable. Solvent fractions range from 0.05 to 1 and apply only to salt/water recovery at 25 °C. Otherwise these conditions produce unsupported results.

## Curated endpoints

| Model | Equation / calculation | Qualification |
| --- | --- | --- |
| Sodium chloride dissolution | NaCl(s) ⇌ Na⁺(aq) + Cl⁻(aq) | 25 °C capacity 36 g salt/100 g water. Finite excess remains solid. Full dissociation and ideal capacity endpoint; no activities. |
| Sucrose dissolution | C₁₂H₂₂O₁₁(s) → C₁₂H₂₂O₁₁(aq) | Preserves molecular identity. Restricted to ≤0.10 g sucrose/g water, deliberately far below saturation; no saturation or temperature curve predicted. |
| Water/ethanol | One liquid phase | Physical miscibility, no chemical product; contraction omitted. |
| Water/hexane | Two liquid phases | Mutual solubility neglected; lower-density hexane is shown above water. |
| Strong neutralization | H⁺ + OH⁻ → H₂O | Ideal complete stoichiometric endpoint at 25 °C. Sodium/chloride remain spectators; finite excess retained. |
| Bicarbonate gas | H⁺ + HCO₃⁻ → CO₂(g) + H₂O | Ideal acid-limited endpoint; all formed CO₂ assigned to gas ledger. Dissolved CO₂, bicarbonate/carbonate speciation and pH omitted. |
| Calcium carbonate | Ca²⁺ + CO₃²⁻ ⇌ CaCO₃(s) | Reduced **free-ion** Ksp model, 8.7×10⁻⁹ at 25 °C. This is explicitly not full carbonate chemistry. |
| Pure water | H₂O(l) → H₂O(s/l/g) | Nominal 1 atm equilibrium endpoints at −10/25/110 °C; no heating dynamics. H₂O identity retained. |
| Salt recovery | Dissolution first, then remove modeled solvent fraction and re-equilibrate | Removed water stays as H₂O(g) in the conserved ledger. Crystals/effect occur only when reduced capacity actually recovers dissolved salt; unsaturated cases report solvent recovery. This is a bookkeeping endpoint at fixed 25 °C, not a boiling or evaporation-rate prediction. |
| Activated molecular synthesis | 2 H₂(g) + O₂(g) → 2 H₂O(l) | Requires the virtual sealed vessel and activation flag. Abstract stoichiometric endpoint; no ignition, physical apparatus instructions, pressure, thermal state prediction or real-world procedure. Imported gases must first be available. |

For strong neutralization, let D=(acid mmol−base mmol)/(liquid mL), which numerically has mol/L units. Solve `[H⁺]−[OH⁻]=D` and `[H⁺][OH⁻]=10⁻¹⁴`; pH=−log₁₀[H⁺]. The numerically stable root handles excess acid, excess base and equal amounts. The pH readout is available only for this ideal strong acid/base supported system at 25 °C. Trace equilibrium ions used for pH are a diagnostic rather than new ledger materials; the material ledger uses the balanced stoichiometric endpoint. Activities and changing Kw are omitted.

For precipitation, a,b are initial free-ion mmol and V is liquid volume in mL. If `a*b/V² ≤ Ksp`, no solid is predicted. Otherwise the precipitated extent x solves `(a−x)(b−x)=Ksp*V²`, using the stable smaller quadratic root. Both residual ions, spectator Na⁺/Cl⁻, water and finite excess remain. Dilution can put the initial ion product below Ksp. Carbonate hydrolysis/protonation, calcium complexes, activity coefficients, atmospheric CO₂ and other solids are outside this model; reduced-model amounts must not be interpreted as precise real-solution yields.

`initial` and `final` are complete conserved ledgers. `products` reports new or changed states/species; recovery also reports salt recrystallized from the intermediate dissolved portion. `remaining` overlaps conserved starting material with final states and is informational, not an additional amount to add to `final`. `extent` is mmol net stoichiometric events, dissolved salt/sugar, recovered salt, or changed water according to the selected rule. For reduced Ksp, `limiting` identifies the smaller initial free-ion supply; it does not mean complete exhaustion. Physical mixing has no chemical limiting reagent. Conservation checks independently sum catalogue elemental compositions, charges and molar masses; tolerances are 10⁻⁷ mmol for element/charge residuals, with signed mass error in grams.

## Primary scientific references

- [OpenStax Chemistry 2e, 4.2 Classifying Chemical Reactions](https://openstax.org/books/chemistry-2e/pages/4-2-classifying-chemical-reactions): ionic/net equations, precipitation and acid/base classification.
- [OpenStax Chemistry 2e, 11.3 Solubility](https://openstax.org/books/chemistry-2e/pages/11-3-solubility): dissolution, miscibility and molecular interactions.
- [OpenStax Chemistry 2e, 14.2 pH and pOH](https://openstax.org/books/chemistry-2e/pages/14-2-ph-and-poh) and [14.3 Relative Strengths of Acids and Bases](https://openstax.org/books/chemistry-2e/pages/14-3-relative-strengths-of-acids-and-bases): ideal strong-ion pH and water autoionization.
- [OpenStax Chemistry 2e, 15.1 Precipitation and Dissolution](https://openstax.org/books/chemistry-2e/pages/15-1-precipitation-and-dissolution) and [Appendix J: Solubility Products](https://openstax.org/books/chemistry-2e/pages/j-solubility-products): Q versus Ksp and CaCO₃ Ksp=8.7×10⁻⁹.
- [PubChem Sodium Chloride, CID 5234](https://pubchem.ncbi.nlm.nih.gov/compound/5234): NaCl solubility entry 36 g/100 g water at 25 °C.
- [PubChem Ethanol, CID 702](https://pubchem.ncbi.nlm.nih.gov/compound/Ethanol) and [n-Hexane, CID 8058](https://pubchem.ncbi.nlm.nih.gov/compound/n-hexane): room-temperature density records underpin the rounded 0.789 and 0.659 g/mL constants. Source records are at approximately 20 °C; these fixed approximations are used at the 25 °C model setting without a temperature-density correction.

Source equations establish the qualified model basis, not real measured yields. The application intentionally provides no hazardous preparation or practical reaction instructions.
