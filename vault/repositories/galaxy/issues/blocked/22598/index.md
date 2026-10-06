# galaxy#22598 — Toolshed does not allow viewing of repo tip/contents

[Issue](https://github.com/galaxyproject/galaxy/issues/22598)

Toolshed repo contents and changelog were disabled for anonymous users after bot traffic overwhelmed the server, so tool XML can no longer be browsed without logging in; blocked on: an infrastructure decision rather than code — mvdbeek notes rate limiting alone does not help against botnets, natefoo suggests either dedicated TS routes for the content worth exposing anonymously or a CDN/captcha DDoS mitigation. Not ours to pick up unilaterally.
