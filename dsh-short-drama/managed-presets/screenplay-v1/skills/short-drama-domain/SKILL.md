---
name: short-drama-domain
description: Short-drama project object map and task routing. Use when the user works with screenplay artifacts, episode scenes, continuity, diagnosis, revision, or delivery. This skill provides operational vocabulary and questions, not a mandatory writing style.
---

# Short-drama domain map

Use this skill as a map of the short-drama workspace. Project facts come from
the bound project and its formal artifacts. The user owns creative direction.
This skill can suggest questions and relevant artifacts, but it cannot decide
the story, override the user, or grant file permissions.

Load only the reference needed for the current task:

- `references/project-objects.md` for artifact and workflow vocabulary;
- `references/creative-decisions.md` for questions that should be returned to
  the user instead of guessed;
- `references/review-lenses.md` for optional signal-channel-B review lenses.

Read a reference with the domain tool `read_skill_reference` using this Skill's
exact name and a relative path. The reference is optional context, not a
project fact, and its suggestions never override an explicit user decision.
