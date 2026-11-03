For the supported environments/servers - can you get everything committed, pushed, and sync'd up on both servers please? Try to do relevant small commits on both ends and take care of merging the content.

Once merged, run `make pull-screenshots`, check the plan, then `make pull-screenshots ARGS=--apply` to bring remote screenshots (gitignored) to this machine.
