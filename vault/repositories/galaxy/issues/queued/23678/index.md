# galaxy#23678 — UI/Routing: Inconsistent and legacy URL routing for viewing Pages (/pages/view?id=... vs /published/page vs /u/<username>/p/<slug>)

[Issue](https://github.com/galaxyproject/galaxy/issues/23678)

Pages have no view route matching `/pages/editor?id=` — `/pages/view?id=`, `/pages/view/<id>` and `/page/view/<id>` 404, leaving `/published/page?id=` and `/u/<user>/p/<slug>` as undocumented alternatives (filed by nekrut); next: add a client view route that redirects to the canonical one.
