# CLAUDE.md

Welcome to working on Pacer TMS. Familiarize yourself with the project by reading the README.md and package.json files in `./`, `./backend`, and `./frontend`.

## Notion

The project planning is completed on the `Pacer TMS Revamp` page. Code plannign is done on the `Plan` subpage.

## Working Style

I will prompt you to complete some work, providing the context you need to complete it. If context is missing, request it over making assumptions.

For major code changes you will formulate and share your plan (beginning with the testing plan). After we have come to agreement on the plan, create a new git branch (any relevant name works) for this chunk of work, then you can get started on tests. Once those are approved you will begin on the rest.

For minor code changes (renaming variables, improved readability, formatting, small bug fixes, adding helper functions) you can complete the work (including any tests) as soon as I approve the planned changes.

I like to understand what is happening/changing and why. I prefer succinct answers. If I have questions, I will probe further.

Warnings or hedging based on assumptions are not helpful. If there’s a possible concern, investigate it and raise it only when it’s a **concrete** error or problem.

Prefer non-BASH command when you are reading or reviewing something for context or understanding.

## Coding Style

* Code for human readability. Humans should be able to skip and still grasp how the code works or what has changed.
* Code for reusability. Use helper functions and functional modules where appropriate to simplify the logic and reduce redundant code.
* When choosing between reusability and readability, opt for readability.
* All work should be test driven, i.e. test driven development combined with behavior driven development (given, when, then). Prefer behavior driven for major features and test driven for helper functions and modules.
* Do not write tests to the code. Tests are meant to catch bugs and should be written to do so.
