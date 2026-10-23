Launchers for Galaxy reviews records; format in [LAUNCHERS.md](../../../agents/_shared/LAUNCHERS.md).

## 💬 Respond to review
status: active
agent_dir: gx_reviews
name: rr-{name}
profile: Sonnet (medium)

Respond to galaxyproject/galaxy#{name}. This is launch is my approval to run the action outlined in the relevant initial_response_action.md file - which may include opening pull requests, creating issues, push commits to the target PR branch, and posting comments.

## ✂️ Trim findings
status: active
agent_dir: gx_reviews
name: tf-{name}

Trim the findings for galaxyproject/galaxy#{name} following ../_shared/PROCESS_TRIM_FINDINGS.md. The review record is {record}.

## 💭 New session
agent_dir: gx_reviews
name: rv-{name}

Let's talk about galaxyproject/galaxy#{name}. The review record is {record}.

## 🔎 Review
status: untracked
agent_dir: gx_reviews
name: rv-{name}

Launch a review of galaxyproject/galaxy#{name}
