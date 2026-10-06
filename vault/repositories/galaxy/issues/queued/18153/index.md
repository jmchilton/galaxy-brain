# galaxy#18153 — Object store selection is available to anon users (but only works partially?)

[Issue](https://github.com/galaxyproject/galaxy/issues/18153)

Anonymous users see "Preferred Storage Location" and can select an object store, but the API returns null and the UI half-breaks (mvdbeek, Sentry); next: decide whether anon users get selection and hide or fix accordingly.
