# topics/admin/faqs/admin-testing.md — 26.2, text review

GTN `45d4932d33`. Ansible/admin FAQ, no Galaxy UI.

- `admin-os-compat-stale`: "last tested on Centos 7 and Ubuntu 18.04" and "both are running CentOS 7". Both releases are EOL, and the `ansible-galaxy` tutorial this is snippeted into asks for Ubuntu 20.04-22.04 in its requirements. Drop the stale versions (or match the tutorial), and drop the claim about what usegalaxy.* run.
