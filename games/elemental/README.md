# ELEMENTAL v0.1 — Atomic Foundations

Standalone chemistry learning lab for Forge Arcade. Built and checked 8 November 2026. Registered locally under Experiments alongside Beat Foundry, as subsequently requested. Publication was subsequently authorized by the user on 8 November 2026.

## Play

Serve the repository over HTTP and open `/games/elemental/index.html`. The current workspace preview is `http://127.0.0.1:8428/games/elemental/`. Native ES modules/data fetches need an HTTP server; opening `index.html` with `file://` is unsupported. No runtime CDN, package installation or backend is required. The two pinned Three.js files are already bundled under `vendor/package/build/`, with their MIT licence and integrity manifest.

### The laboratory

- **Periodic table:** all 118 recognized elements in conventional/detached-f-block or responsive list layout. Search name/symbol/Z, filter by classification, select, compare, inspect configuration and optional properties. Blue-to-mint heatmaps show van der Waals radius, Pauling electronegativity and first ionization energy. Nonmatches are dimmed to keep table shape; missing values are explicitly striped/uncoloured. Full weights and uncertainties are available in the scientific notes, rather than truncating long values on tiny tiles.
- **Atom explorer:** select an element, verified isotope or unverified integer composition and charge. Z=p, A=p+n and Q=p−e are enforced. Shell occupancy bars and orbital/spin boxes are labelled educational simplifications, not classical electron trajectories. Main-group ion examples include Na⁺, Cl⁻, Mg²⁺, Ca²⁺ and O²⁻. Unsupported ions expose counts without inventing an electron configuration. Ion notation does not guarantee an isolated gas-phase ion is bound.
- **Molecule builder:** add H/C/N/O/F/Cl/S/P atoms, select numbered atoms, connect or change single/double/triple bonds, remove bonds, delete atoms, set explicit lone pairs/unpaired electrons and net charge, undo/reset. Maximum 24 atoms, 36 bonds and 50 undo entries. Hydrogens are explicit. Formal charge is valence electrons − nonbonding electrons − sum of bond orders. Assigned and expected valence-electron totals are shown.
- **Inspection:** locally bundled Three.js ball-and-stick models, labels, smooth drag rotation, wheel/pinch zoom, zoom buttons and camera reset. Arrow keys rotate a focused view. Geometry for nine reference graphs uses rounded experimental NIST Cartesian coordinates. Unrecognized graphs receive a schematic layout, explicitly not an energy/geometry prediction. Colours and sphere sizes are display conventions. SVG inspection remains available without WebGL and during context loss; data/editor/validation remain functional.
- **Discoveries:** twelve sequential challenges cover proton identity, neutral carbon, H-1/H-2 isotopes, sodium ions, electron configuration, H₂, H₂O, CO₂, NH₃, CH₄, O₂/N₂ bond order and ethene identification. Hints, scientific explanations, replay and same-origin local progress (`elemental.progress.v1`) are included. Challenge molecule checks use the same graph/electron validator as the sandbox. Example loading is available as a learning aid; there is no score grinding.

## Scientific domain and provenance

Primary snapshots are retained under `src/data/sources/`, plus the original PubChem JSON. `src/data/manifest.json` records source URLs, access dates, units, corrections and SHA-256 hashes. `vendor/manifest.json` pins Three.js 0.180.0, its package integrity and individual file hashes. Package SHA-512 was checked against npm registry metadata.

| Dataset | Source / access | Interpretation |
|---|---|---|
| 118 element configurations/classifications/properties | [PubChem periodic-table JSON](https://pubchem.ncbi.nlm.nih.gov/rest/pug/periodictable/JSON), 7 Nov 2026; endpoint documented by the [IUPAC FAIR Cookbook](https://iupac.github.io/WFChemCookbook/datasources/pubchem_ptable.html) | Numeric summaries are compiled, not newly measured here. Radius is van der Waals / pm; electronegativity is Pauling; first ionization eV; density g/cm³; phase-change values K. Summary endpoint does not supply all uncertainties, pressure/temperature conditions or source-specific qualifiers. These are not universal state-independent constants. |
| Standard atomic weights | [CIAAW 2024 definitive table](https://ciaaw.org/atomic-weights.htm), 8 Nov 2026 | Relative/dimensionless weights preserve interval and last-digit-uncertainty notation. A standard-weight interval is not an isotope mass number. |
| Radioelement display masses | [CIAAW radioactive elements / NUBASE2020 compilation](https://ciaaw.org/radioactive-elements.htm), 8 Nov 2026 | One bracketed representative mass number, not an invented standard atomic weight. Tc uses [97]; the source also lists the comparably long-lived Tc-98. |
| Curated isotope stability | [IAEA LiveChart API](https://nds.iaea.org/relnsd/v0/data?fields=ground_states&nuclides=3h), 8 Nov 2026 | Nineteen source records: H-1/2/3, C-12/13/14, N-14/15, O-16/17/18, Ne-20/21/22, Cl-35/37, Na-23, Mg-24, Ca-40. Proton/neutron counts and STABLE/radioactive flags come from the API. Natural abundances are intentionally omitted; missing in this curated snapshot does not mean absent in nature or unknown to science. |
| Molecular geometries | [NIST CCCBDB SRD 101](https://cccbdb.nist.gov/), snapshots 8 Nov 2026 | H₂ (CAS 1333740), O₂ (7782447), N₂ (7727379), water (7732185), CO₂ (124389), ammonia (7664417), methane (74828), ethene (74851), ethyne (74862). Exact per-molecule links are in `molecules.json`. Coordinates are rounded experimental references in Å. Lewis bond orders/lone-pair assignments are curated educational models, not a quantum calculation. |

### Documented discrepancies and approximations

1. The PubChem snapshot retains lawrencium’s older 6d¹ assignment. The [NIST ground-state record](https://physics.nist.gov/cgi-bin/Elements/elInfo.pl?element=103) gives [Rn]5f¹⁴7s²7p¹. `normalize.cjs` applies that documented override; the NIST snapshot and regression are retained.
2. “Calculated” configurations, as well as Z≥104 configurations, are conservatively labelled predictions. A compiled source record is not treated as proof of experimental observation.
3. Only the nine curated molecular graphs can be **SUPPORTED**. Consistent unfamiliar structures are **MODEL WARNING**, not declared impossible. Incorrect endpoints, duplicates, duet/octet-domain violations or electron bookkeeping errors are **INVALID WITHIN MODEL**. No universal fixed-valence claim is made. Radicals, resonance, expanded valence, coordination, energetics and stability need broader models.
4. The O=O paired Lewis drawing does not show oxygen’s two unpaired electrons in its triplet ground state, and cannot explain paramagnetism. This caveat appears in its validation and bond-order lesson.
5. Formula generation uses Hill ordering: C then H then alphabetic others when carbon is present; otherwise alphabetic. Ammonia’s conventional NH₃ and Hill H₃N are both shown. Ethene’s molecular C₂H₄ and empirical CH₂ are distinguished.
6. Principal-shell counts and Hund/Pauli box diagrams summarize configurations; they are not full relativistic or quantum wavefunctions. Atom/camera display layout is not molecular dynamics. No reaction or synthesis predictions are offered.

No hazardous laboratory instructions, synthesis procedures, reactions or future-milestone chemistry were implemented.

## Tests and verification

See [VERIFICATION.md](VERIFICATION.md) for exact outcomes and limits. Pure checks: `node --test games/elemental/tests/*.test.mjs`. Browser checks: `node games/elemental/tests/browser.cjs`, with Playwright available or `FORGE_PLAYWRIGHT` set to its installation; the test expects the repository served on port 8428. Chrome path is configured for this Windows workspace. No runtime dependencies are downloaded by the test page.

Rebuild normalized data from checked-in snapshots with `node games/elemental/scripts/normalize.cjs`. `scripts/isotopes.cjs` and `scripts/acquire.cjs` retrieve primary snapshots when explicitly refreshing data; review access dates and any source changes before regenerating. `scripts/provenance.cjs` updates hashes. A source correction must remain explicit and tested. Do not silently replace missing values with estimates.

## Forge Arcade placement — applied locally

`registration.js` contains the requested title, Simulations category and description. `card-art.svg` is distinctive 960×540 molecular/table artwork. The local root registration now places Elemental in Experiments, matching Beat Foundry; this overrides the original proposed Simulations category. Existing entries and deployment settings remain unchanged.

Integration pattern (already applied locally; publication remains unapproved):

1. Copy the prepared metadata into a normal root `elemental-register.js` using `GAMES.push(...)`, then the existing count/featured/render refresh pattern (see `the-last-lighthouse-register.js`). Add its classic script after `app.js` and other registrations in the root index. Do not load the prepared ES-module export as a classic script.
2. The existing native gallery link automatically opens `games/elemental/index.html`. The lab already includes a relative Forge Arcade link.
3. Add `elemental` to `CARD_THUMBNAILS`, copy the SVG to `assets/thumbnails/elemental.svg`. If matching the current detailed pixel-art gallery policy, prepare a 960×540 WebP rendition and add `elemental` to `PIXEL_CARD_IDS` plus the artwork manifest. Do not add a nonexistent WebP source. The supplied SVG is ready as a source/fallback.
4. Update count-dependent registry/art/browser expectations from the actual current registry (currently 37) and verify the Simulations filter and navigation. Run all tests and `node build.mjs` before publication. Deploy only on explicit authorization, then repeat public browser checks.

Progress is origin-bound and optional. There is no workspace/cloud save or cross-origin migration; deleting atoms or resetting the workspace never clears another game’s storage.


