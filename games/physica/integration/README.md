# Hidden Forge Arcade integration

The user approved this integration on 15 November 2026, replacing the earlier visible-card proposal. PHYSICA is accessible through the atom symbol beside ELEMENTAL’s flask in the footer. These are discoverable shortcuts, not password protection.

The active root registration is physica-register.js, loaded after Domino Disaster and before game summaries. It sets hidden:true and featured:false, matching ELEMENTAL. All card filters and featured collections exclude PHYSICA, and visible counts remain 39. Total registered entries are 41, including both hidden laboratories.

The existing footer stylesheet provides 44×44px targets, accessible names, keyboard focus, hover states and grouped responsive placement. The atom has a violet focus/hover accent; the chemistry flask retains cyan. Both use native relative links. No gallery card styles, runtime dependencies, deployment settings or ELEMENTAL files changed.

Original pixel artwork remains in ../assets for future use; no PHYSICA card is displayed. The obsolete visible-card patch and generator were removed to prevent accidentally exposing the lab. The registration copy here is a reference; the root file is active.

Validation: tests/physica-hidden-browser.cjs checks both hidden registrations, all archive filters, unchanged visible count, keyboard focus, 44px targets, no overflow, physics launch/stepping/return and chemistry launch at 1440px, 390px and 320px widths. Scientific and ELEMENTAL unit checks total 70 passing tests. See ../QA.md for build validation and limits.
