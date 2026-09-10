We have a pair of problems here that I would like to address.

Problem A: The only review quality admins lean is on is "is this repository in the IUC?".

Talking to real admins this is a real thing. Trying to install tools from repositories outside of the IUC - the expectation is that it is less mature and less likely to work. We've done all this work to de-centralize tool building just to land back up with a mono repository. This doesn't scale in terms of people's review time. There needs to convey IUC-like authority and/or portions there of (the tool will work with Pulsar, the tool has working dependencies, the tool seems secure, etc..) for other repositories and tools in the tool shed.

Problem B: We are working on an agentic-driven maturation pipeline for tools. We need a way to published tools that pass more gates and more checks before humans get involved. We need to track these checks and publish them.

These two problems are obviously related and could likely be solved better in parallel than alone.
