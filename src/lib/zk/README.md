# BlockMorph ZK module

The production app currently uses real issuer-signed capsules.

This directory is reserved for a future Noir/Barretenberg verifier integration. A production ZK mode must:

- prove private wallet metric thresholds against public campaign policy thresholds;
- verify proofs with a real verifier, not fixture data;
- clearly display `BLOCKMORPH_DEV_SKIP_ZK=true` as dev proof mode;
- never present skipped proofs as production ZK.
