# Visual Fixtures

This directory defines the local fixture convention for development and testing. No real product images are included in Phase 2.

Example layout:

```text
fixtures/
  unit-0001/
    image-01.jpg
    image-02.jpg
    requirements.json
```

`requirements.json` should contain the explicit applicability and sourced requirement configuration for that unit. Image references must be stable paths or storage references that are supplied to the provider; the model must not invent them.

Real evaluation images must be captured independently and held out from development fixtures. The synthetic `data/prep_sample.csv` is not ground truth and must not be used as an evaluation label source.
