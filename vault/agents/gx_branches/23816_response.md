In regards to just using compiled TypeScript to validate these things. Certainly there are cases when we have an updated and accurate schema for the tools and we could build a new model to do that but static validation is STILL useful and these declarative tests are especially useful because we could apply them to either approach.

The reasons we STILL should do this static validation versus TypeScript compilation (all written in my own human words checked by two agents).
- Missing tools won't have a schema.
- 
