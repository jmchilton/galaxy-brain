# Draft GitHub issue for the TopoQA authors — edge-coordinate observation

**Status: DRAFT for your review. Nothing has been sent.** This is a courtesy reproducibility report to the
TopoQA authors (Han et al.) about the `(x, y, y)` edge-coordinate construction we hit while
reproducing their benchmark. Do not send as-is without a read.

**Suggested channel:** A GitHub issue on `github.com/yubingapril/TopoQA`. Issues are enabled, no
existing issue covers this observation, and the current default branch still exhibits the behavior.
Email to the corresponding authors remains an alternative if private contact is preferred.

**Before sending, decide:** (1) whether to offer the per-decoy comparison output; (2) whether to use
John's name or a project/team identity on the issue.

**Numbers are from an independent reproduction of the released code and checkpoint at commit
`118f1e11d9594cc4c1ca99ea6eee0409b3c3df5e`, using the DProQ benchmark archive from Zenodo record
`6569837`. Metrics were independently recomputed under the paper's top-1 ranking-loss definition.**

---

## Proposed GitHub issue

### Title

Clarify repeated y coordinate in all-atom edge-distance calculation

### Body

Thank you for TopoQA and for releasing the inference code and checkpoint — it made an independent
reproduction straightforward. I independently reproduced the published benchmark results using:

- Commit: `118f1e11d9594cc4c1ca99ea6eee0409b3c3df5e`
- Checkpoint: `model/topoqa.ckpt`
- Checkpoint SHA256: `78e17eae9b4bbaabc7e97b2525f06f20050967c2bfdca614f5d2c2550798e3ab`
- DProQ benchmark archive: Zenodo record `6569837`

The released artifacts reproduce the paper's ranking losses:

| test set | reproduced | paper |
|---|---:|---:|
| DBM55-AF2 | 0.0694 | 0.069 |
| HAF2-12, excluding 7ALA | 0.1103 | 0.110 |

I noticed that
[`get_pointcloud_type`](https://github.com/yubingapril/TopoQA/blob/118f1e11d9594cc4c1ca99ea6eee0409b3c3df5e/src/utils.py#L87-L98)
uses the y coordinate for both the second and third components of the atom coordinates, producing
`(x, y, y)` rather than `(x, y, z)`.

The paper describes these inputs as 3D atomic point clouds and the edge features as counts of
pairwise atomic distances, so I wanted to clarify whether the released coordinate behavior is
intentional.

As an inference-time sensitivity check, I changed only the third component to z and reran scoring
with the same checkpoint:

| test set | released behavior | corrected-coordinate inference |
|---|---:|---:|
| DBM55-AF2 | 0.0694 | 0.0767 |
| HAF2, 13 targets | 0.1195 | 0.1534 |
| HAF2-12, excluding 7ALA | 0.1103 | 0.1471 |

These corrected-coordinate values should not be interpreted as the performance of a retrained
corrected model. If the checkpoint was trained with `(x, y, y)`, changing only inference creates a
training/inference mismatch.

Could you clarify:

1. Was the released checkpoint trained with the current `(x, y, y)` behavior?
2. Is this intentional for checkpoint compatibility, or a coordinate-index typo?
3. If it is a typo, would it make sense to document the legacy behavior or provide a corrected,
   retrained checkpoint?

I can share the per-decoy comparison output if useful.
