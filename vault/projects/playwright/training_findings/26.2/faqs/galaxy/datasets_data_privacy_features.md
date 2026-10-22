# faqs/galaxy/datasets_data_privacy_features.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `galaxy_ui_driver` `e4bca1128c1` (`faq_server.sh main`). A new user's
pasted dataset; its Permissions tab; Make History Private; the new-histories switch off and on. No
tutorial embeds it.

## GTN

- Intro and step 1 (`privacy-default-private`, version): 26.2 makes new users' data private by
  default (`new_user_dataset_access_role_default_private` flips to true; false in 26.0/26.1). A new
  dataset's **access** is already the user's private role, so "remain private and unlisted ...
  invisible until you publish a link" is wrong both ways: private data isn't reachable by a link,
  and public-by-link data isn't private.
- Step 1 (`privacy-dataset-access-step`, main): "Search for the name of the user to grant
  permission" does nothing next to your private role — the FAQ's own note says so — and on public
  data it makes the dataset accessible only to that user (access needs every listed role). "two input tab" is garbled and the button is **Save**. To share with
  someone, share the history (Share & Manage Access), which offers to fix permissions.
- Step 2 (`privacy-make-private-location`, main, 26.1 too): the history menu is ☰, not a gear, and
  Make Private is **Share & Manage Access** > **Make Private** tab > **Make History Private**.
- Step 3: "Click **user** button" (`masthead-user-menu-2`). The page is a **Make new datasets
  private** switch that saves on toggle; the role form and **Save Permissions** sit behind "Show
  advanced options."; there is no "cofest" icon (`privacy-new-histories-switch`, main).
- All three gifs 404: galaxyproject.org moved them to `/images/learn/privacy-features/`. They show
  the pre-2019 UI, so link fixes alone won't help (`privacy-gif-links`).

## Galaxy

- 26.2's private-by-default flip is a big behaviour change for training: other sharing/publishing
  FAQs may assume public-by-link data. Raised with John.
- Gap: nothing tested the new-histories switch or the dataset Permissions tab. Added
  `test_new_datasets_private_switch` (`e4bca1128c1`, a fresh user): off gives a new history's
  dataset no access role, on gives the private role, shown on the Permissions tab. Adds
  `user_preferences_set_new_datasets_private`, `edit_dataset_permission_roles`,
  `preferences.dataset_permissions`, `new_datasets_private_input`/`_label` (by the switch's
  `name="check-button"`; a test id would be cleaner) and `edit_dataset_attributes.permissions_tab`,
  `permission_field`, `permission_roles`. Green under Playwright and Selenium. Make History Private
  was already used by `test_sharing_private_history_default_permission`.
- gxui: `dataset-permissions HID`, `history-make-private`, `preferences-new-datasets-private
  [--off]` (tip `fa8cfda6c7c`).
