# Filtered findings — #24261

- default P3 4 (input-group font multipliers / font comment): not actionable. The `0.875` / `1.25` factors reproduce Bootstrap's `$font-size-sm` / `$font-size-lg` from Galaxy's `$font-size-base`, as the comment says, so the field matches the group's buttons. `overrides.scss`'s `input[type="text"]` (0,1,1) does beat `.g-form-input` for the medium font, but it sets the same values (0.85rem / 1.5), so nothing renders differently.
- gx_test_challenger P3 2 (split the four-case state test into `it.each`): a test-style preference. Each case already has its own named variable and assertions, so a failure line identifies the case. Dropped as proportionate to PR size.
- GSelect-side alignment from default P3 1 (focus ring blue-500/offset 1, small/large radius on GSelect): this re-litigates the PR's stated decision that GSelect's output does not change. It is kept only as follow-up scope inside verified P3 3.
