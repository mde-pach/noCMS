# noCMS — Product Brief

A standalone statement of the problem. It describes **what needs to exist and why**, in the
language of the person who will use it. It deliberately contains **no architecture, no
component model, no library choices, and no reference to any previous attempt** — those are
answers, and the point of this document is to state the question cleanly enough that a good
answer can be found again from scratch.

---

## 1. Who this is for

Someone who wants a real website of their own — a portfolio, a small business site, a
project site, a personal site, a blog.

They are not a professional web developer. They are also not helpless: they will read a
short explanation, follow a guided setup, and learn one or two new concepts if there is a
reason to. What they will not do is open a terminal, learn git, or maintain a server.

A second audience matters almost as much: the developer who sets a site up *for* someone
else — a friend, a client, a small organisation — and then wants to stop being the
bottleneck for every copy change.

## 2. The problem

Today, that person picks from three bad options.

**Rent a website builder.** Squarespace, Wix, Webflow, Framer. They work, they look good,
and the editing experience is genuinely excellent. But the site is not theirs. It lives in
someone else's database, in a format only that company can read. The bill never stops. If
the price triples or the company pivots, there is no way out that preserves the site.

**Own a CMS.** WordPress and its descendants. Now they own the site, and also a hosting
bill, a security surface, a plugin ecosystem, an update treadmill, and — inevitably — a
developer on call.

**Own the files.** A static site: content in text files, a build step, free hosting. This is
the only option with no rent, no lock-in, and no maintenance. It is also the only option
where "change the headline on the homepage" requires a code editor, a build, and a
deployment. The people who most need cheap, durable, ownable websites are exactly the people
this excludes.

There is a fourth category that gets close: tools that put an admin panel next to a
file-based site. They solve *access* — you can edit from a browser — but not *authoring*.
You fill in labelled fields in a sidebar and hope the result looks right. You cannot lay out
a page, arrange sections, or change how the site looks. It is data entry, not design.

**The gap: nobody offers visual, on-the-page editing of a website you completely own, for
free, with no company in the middle.**

## 3. What we are building

A website builder where:

- the editing experience is **visual and direct** — you click the thing on the page and
  change it;
- the site itself is **plain files the owner holds**, readable and editable by hand and by
  ordinary tools;
- there is **no service to sign up for, pay for, or depend on** — including ours.

It is software people adopt, not a platform they join. Free, open source, permanently. There
is no paid tier, no marketplace, and no hosted product to protect. That is a design
constraint, not just a licence choice: it rules out any answer that requires us to run
something at scale.

## 4. What it must let someone do

Stated as outcomes, in the user's words.

1. **Get live.** Go from nothing to a real website at a real URL, in one sitting, without
   leaving the browser and without asking anyone for help.
2. **Edit in place.** Change a headline by clicking the headline and typing. See the result
   as it will actually appear, not as an approximation.
3. **Build pages.** Add, remove, reorder and configure good-looking, ready-made sections —
   a hero, a feature grid, a pricing table, a contact block — and end up with something that
   looks designed, not assembled.
4. **Own the look.** Change the colours, typography and spacing of the whole site at once,
   and see it change immediately. Have a dark mode. Not have to touch every page.
5. **Grow the site.** Add pages, choose their URLs, edit the menu, and manage repeating
   content (posts, projects, products) without repeating themselves.
6. **Add images.** Upload, place, and have them load fast, without thinking about formats or
   sizes.
7. **Publish deliberately.** Work without it being live, understand what changed in plain
   language, publish when ready, share a preview with someone first, and undo a publish
   they regret.
8. **Be found.** The published site must be fast, accessible, correctly marked up for search
   and social sharing, and searchable by visitors.
9. **Leave whenever.** The site is theirs in a form that outlives us: hostable elsewhere,
   editable by hand, with a full history. If this project disappears tomorrow, every site
   built with it keeps working and stays editable.
10. **Go deeper without leaving.** A developer can edit the underlying files directly, add
    their own sections, and use normal professional tooling — on the *same* site, at the
    same time, without a migration or a second system.

Point 10 is not a nice-to-have. **The same site must be workable at several depths** —
someone changing a sentence, someone adjusting the brand, someone writing code — and a
change made at any depth must be visible and safe at every other. Nobody should be forced up
to a harder level to do something reasonable, and nobody should be blocked from dropping
down to a more powerful one.

## 5. Constraints that shape any solution

These are requirements, not preferences.

- **Free to run, for everyone.** No cost to the site owner and no cost to the project. Any
  answer that needs us to operate servers proportional to the number of sites is wrong.
- **Nothing central to depend on.** If the project's infrastructure goes dark, existing
  sites must keep serving *and* keep being editable — at worst through a documented fallback.
  Anything we do run must be stateless, optional, and replaceable by the owner.
- **The files are the truth.** The site's content and design live in a format a human can
  read, a diff can show, and another tool can consume. Not a proprietary blob, not an opaque
  tree.
- **Editing feels immediate.** Typing, rearranging and re-theming must respond instantly.
  Waiting for a build in order to see a colour change is disqualifying.
- **What you see is what ships.** The editing view and the published page must not be able
  to disagree. This has to be guaranteed by the design, not by testing for drift.
- **One owner.** The person editing is the person who owns the site. No shared accounts, no
  anonymous editing, no multi-tenancy.
- **Onboarding is part of the product.** The setup path is where this succeeds or fails.
  Whatever technical concepts the owner is exposed to must be *explained*, once, in plain
  language — not hidden behind magic that breaks later.

## 6. Given

Decided by the project owner; treat as input, not conclusion.

- The published site is a **static site**, hosted free on **GitHub Pages**, built by
  **GitHub Actions**, with the site's own **git repository as its storage**. Git history is
  the version history.
- **Astro** is the build framework.

Everything else — how editing works, what the page format is, how the editor reaches the
repository, how design is expressed, how it is extended — is open.

## 7. Out of scope

Deliberate omissions, so they don't get designed for by accident:

- A hosted service, a dashboard, an account system, or anything multi-tenant.
- Payment, checkout, or e-commerce on the free path.
- Real-time multi-person collaborative editing.
- Non-developers authoring arbitrary custom components from scratch. They compose from a
  library; extending the library is a developer activity.
- Anything that obliges the owner to sign up for, or pay, a third-party service.

## 8. Hard problems any design must answer

These are the genuine sharp edges of the need. They are listed as open questions on purpose;
there are several defensible answers to each.

1. **A free static host has no server.** Contact forms, comments, gated content, anything
   personalised, and anything that reacts to a visitor have no obvious home. What is offered,
   what is honestly deferred, and what does a self-hosted upgrade path look like?
2. **A repository is a poor place for large media.** Video and big downloads don't belong in
   git. What is the story for images versus everything else?
3. **A free repository is public.** Drafts, unpublished edits and full history are visible to
   anyone. What does "draft" honestly mean under that condition, and which features must not
   assume privacy?
4. **Signing in from a page with no backend.** Authorising the editor to write to the owner's
   repository, securely, without operating a session service.
5. **Onboarding crosses a concept the audience has never met.** The setup involves accounts,
   repositories and hosting. Making that a teaching moment rather than a wall is a core
   design problem, not a wizard to bolt on at the end.
6. **A visual editor and a static build are naturally two different renderers**, and two
   renderers drift. Something in the design has to make them one, structurally.
7. **The section library is the product's first impression.** A visual builder with mediocre
   building blocks is a mediocre visual builder, regardless of how good the machinery is.

## 9. What success looks like

> A person who has never used GitHub, working alone in a browser, creates a website, builds
> three pages with real sections and their own colours, publishes it to a URL they can send
> to someone, and comes back a month later to change the copy — without ever opening a
> terminal or a code editor.

And, on the other side:

> A developer clones that same site, opens it in their editor, adds a custom section, pushes,
> and the owner sees it in their library the next time they edit — with nothing migrated and
> nothing broken.

---

## Note for whoever picks this up

There is an earlier attempt at this idea in a separate repository. **Do not read it as
input.** It contains a settled architecture, a numbered invariant list, a decision log and a
package layout that together encode one specific answer to the questions in §8 — an answer
arrived at under different assumptions and a different build framework. Reading it does not
inform the design; it substitutes for it.

The task is to answer §4–§8 from first principles, on the given in §6, preferring to
assemble existing well-maintained tools over building new machinery. If the earlier work is
worth revisiting, do it *after* an independent design exists, as a comparison.
