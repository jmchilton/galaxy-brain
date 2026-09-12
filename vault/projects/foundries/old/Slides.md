

Slides:

* Skill - definition (20s)
* Limitations of skills
	* Source vs Package - https://galaxyproject.github.io/foundry-pattern/case/skills-package-not-source/
	* The Edge of Human Knowledge does not look like a Flat Markdown Files of a RAG (PHD comic - https://matt.might.net/articles/phd-school-in-pictures/)
* My thesis - the way to push on the edge of human knowledge is not to dump flat text files in a directory or populate a RAG with a bunch of facts.
* Pinecone Nexus
* RAG-Era Darling 
	* Compiling Skills 
	* The Foundries oldest commits contain all these design decisions and predate the announcement.
	* I'm not sure a rich/heavy runtime is wrong - it isn't the foundry approach though.



Explore the Workflow Foundry - and show how the patterns can be extracted and pulled into other foundries. 

For the results slide(s) - there is some open missing issue numbers, conclusions, etc.. I think this is all documented in the repo in one place or another but it might be hard to find. Have subagents help you out and then reassemble this. If anything is unclear mark with TODOs and I can help find it. 

<slide>

Upstream bug fixes including one merge - <list of the form org/name#num>. 

A green conda-forge recipe https://github.com/conda-forge/staged-recipes/pull/34367 - X local recipes - Y ready to be contributed upstream (license issues resolved, etc...). 

<new slide>

Clean-room paper based re-implementations of math: <repos>

Replication studies: <repos>

<new slide>

A Mold that implements a paper inside a reproducible environment - short description. 

Answers to open questions from survey papers: <bullet points>.

<new slide>

<Pushing boudnry image again> <split with text on other half:> Instead of building a mill, I feel like I'm pushing on the boundry!

<new slide>

I think this is a really nice set of ideas for pushing on a domain with agents. I feel like this is competent implementation of a pattern that allows you and an agent build up rich abstractions for interacting with a domain.

I don't think this is turn key solution or a one-size fits all infrastructure.

Knowledge about a domain and a description of actions over a domain should probably reflect the structured of the domain.
