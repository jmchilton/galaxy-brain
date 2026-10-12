# persistentToggle — batch 63

Both original cases and three assertions remain: default off, initial true, and false after toggle. These are default/toggle behavior checks, not a claimed persistence round trip. The real anonymous user-store/composable boundary remains.

An owned real Pinia is activated per case and disposed at completion. Existing runInTestScope owns the hashing/local-storage watchers and computed dependencies, stopping before store disposal. Instead of clearing all localStorage, the setup removes only the local-storage-salt key used by the real dependency and restores its previous value after scope/store cleanup. Anonymous setup does not write a per-user toggle key; no unrelated storage is changed.

Pristine/final shuffled seed630101 passes two cases. Covered source locations remain exact: four files/11 locations. Repository hooks, including ESLint and formatting, pass. Full client types belong to the integrated gate. No production, support or shared helper changes; existing scope/ownership guidance suffices.
