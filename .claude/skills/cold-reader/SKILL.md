---
name: cold-reader
description: Use on a finished document someone else will read without you in the room: a client SOP, proposal, Franchise Entry Report, newsletter, handover or brief. Propose it with a yes/no first. A fresh subagent that has seen only the document answers the questions a real reader would ask; wrong or guessed answers show the gaps. Not for drafts, code, posts or captions, or anything Wesley wrote only for himself.
---
# Cold reader

Idea from anthropics/skills `doc-coauthoring` (Reader Testing stage); written fresh for this repo. See `../THIRD-PARTY.md`. This tests whether a finished document works for a reader who has none of our context. `doubt-driven-development` judges a decision; `lead-review` checks our rules; this checks the reader's experience.

**Rule: the reader gets the document and nothing else. No chat, no Brain, no files, no hint of what it is for.**

## Steps
1. **Predict.** Write 5 to 8 questions this reader would really ask of the document: what it says to do, a number, a name, a date, what happens next, what to do when something goes wrong. Take them from who it is for (say the client's role, not the topic). Include at least one answer that must be found in the text, and one that should not be answerable at all.
2. **Read.** Start one fresh `general-purpose` subagent, told to use no tools. Pass the full document text and the questions. Prompt, verbatim:
   > You are the intended reader of this document and know nothing else. Answer each question from the document alone. For each: your answer; which part of the document you used; anything ambiguous or missing; anything you had to assume. If the document does not say, write "not stated". Then list contradictions, undefined terms, and what the document assumes the reader already knows.
3. **Compare.** Check each answer against what the document is meant to say. Mark: *right*, *wrong* (misread), *guessed* (the reader filled a gap), *not stated* (should be there), *not stated and correct* (the trap question).
4. **Fix.** Change the document where the reader was wrong or guessed, or where a needed answer was "not stated". Do not pad: fix the one sentence, define the one term. Where the right answer is a fact only Wesley has, ask him as a yes/no or a single question, never invent it.
5. **Stop** after one fix round plus one re-read of the changed parts, or when the answers are right and nothing new comes up. Never more than two reads.

## Rules
- Never put the document anywhere outside this machine: the subagent is the only reader.
- Do not pass your intent, the brief or the Brain. The reader's confusion is the finding.
- Do not run it on the same unchanged document twice.
- Do not run it from a routine or inside a subagent; flag it for Wesley instead.
- Say in the reply: the questions asked, which came back wrong, guessed or not stated, and what you changed.
