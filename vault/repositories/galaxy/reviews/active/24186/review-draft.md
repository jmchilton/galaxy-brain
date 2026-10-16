The migration looks consistent with `GCheckbox`'s model and event contracts. Boolean consumers use `update:modelValue`, the selection maps and input hooks are preserved, and sharing/embed controls retain their layout. The history tests now exercise actual inputs, including purge/confirmation behavior.

All 87 focused tests passed locally across 11 files, including five additional interaction probes for sharing actions, embed output, pending object sharing and permission synchronization. Formatting and diff checks pass. I inspected the supplied before/after images; a fresh interactive browser session was unavailable here. No blocking findings.

Risk is low: this is a reversible component migration with no new API or persistent contract. I noted that the declared dependency #24184 is now merged upstream; local tests used this PR's exact head, while the supplied screenshots include that dependency.
