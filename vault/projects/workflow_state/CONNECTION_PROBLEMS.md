# IWC Connection Validation Failures

2 workflows out of 120 have invalid connections. @jmchilton validated these manually by importing the workflows into usegalaxy.org and inspecting them in the workflow editor.

## 1. VGP hi-c-contact-map: `list` fed to `list:paired` subworkflow input

**Path:** `workflows/VGP-assembly-v2/hi-c-contact-map-for-assembly-manual-curation/hi-c-map-for-assembly-manual-curation.ga`

```
step 14 (data_collection_input)          step 24 (subworkflow)
  label: "PacBio reads"                    inner step 0 (data_collection_input)
  collection_type: list                      collection_type: list:paired
         |                                          ^
         +--- output -----> 0:Input dataset collection
                    list ≠ list:paired  ← INVALID
```

**Diagnosis:** The workflow input declares `collection_type: "list"` but the subworkflow's inner input expects `list:paired`. A flat list cannot satisfy a paired requirement — the inner paired structure is missing.

## 2. VGP kmer-profiling: `list` fed to `list:paired` subworkflow input

**Path:** `workflows/VGP-assembly-v2/kmer-profiling-hifi-VGP1/kmer-profiling-hifi-VGP1.ga`

```
step 2 (data_collection_input)           step 7 (subworkflow)
  label: "Collection of Pacbio Data"       inner step 0 (data_collection_input)
  collection_type: list                      collection_type: list:paired
         |                                          ^
         +--- output -----> 0:Input dataset collection
                    list ≠ list:paired  ← INVALID
```

**Diagnosis:** Same issue as #1. Outer input is `list`, inner subworkflow expects `list:paired`. Should be `list:paired` on the outer input.

