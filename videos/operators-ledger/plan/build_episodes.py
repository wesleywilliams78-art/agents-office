"""Builds ../EPISODES.md, the 100-episode plan for The Operator's Ledger.
Edit the topic lists here (never the generated table by hand), then run:  python build_episodes.py
Order: modules rotate F, S, O, M, L, E, D, H, G, N, so every ten weeks covers the whole MBA once."""
import datetime as dt, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from wednesday_tools import W   # the Wednesday Toolkit, one per row

FIRST_MONDAY = dt.date(2026, 10, 26)   # Episode 01 goes out on this Monday
STATUS = {1: "Posted / scheduled", 2: "Posted / scheduled", 3: "Posted / scheduled", 4: "Rendered (v1)"}

# (MBA topic, the Ledger angle: what it means for an owner scaling sites, worked example in pounds or a concrete case)
M = {
 "F": ("Finance & accounting", [
  ("Unit economics and four-wall profit", "Site one's numbers don't predict site ten's", "£20k site keeps £4,800; £13k site loses £300"),
  ("Contribution margin and break-even", "The weekly sales each site needs before it pays for itself", "£7,800 fixed ÷ 57.7% = £13,520 a week"),
  ("Operating leverage", "Why a 20% sales dip can cut a site's profit by more than half", "Site 10's costs: £20k → £16k sales, profit £3,738 → £1,431"),
  ("Cash conversion cycle", "Why a profitable group runs out of cash at site five", "Pay staff weekly, suppliers in 30 days, fit-out up front"),
  ("Working capital", "The cash sitting in your walk-in and your supplier terms", "£6k of stock × 10 sites = £60k not in the bank"),
  ("Payback period and ROI", "How many weeks before a new site gives back its fit-out", "£250k fit-out ÷ £3,000 a week = 83 weeks"),
  ("NPV and the discount rate", "A ten-year lease is a ten-year decision, priced today", "£150k a year for 10 years is not £1.5m today"),
  ("EBITDA versus cash", "What lenders and buyers count, and what it hides", "Strong EBITDA, empty bank: capex and loan repayments"),
  ("Budgets and variance analysis", "Reading a site's weekly P&L in five minutes", "Labour 4 points over budget: rota or sales?"),
  ("Valuation multiples", "What your group is worth, and what moves the multiple", "Same EBITDA, 4× or 7×: the difference is repeatability"),
 ]),
 "S": ("Strategy", [
  ("Porter's Five Forces", "Run it on each site's trade area: every force is a line on the P&L", "Food 30%, labour 40%, rent 20%, the app's 30% cut"),
  ("Porter's generic strategies", "Stuck in the middle: premium rent, discount menu", "A £2.80 flat white on a high street paying premium rent"),
  ("SWOT turned into TOWS", "Turn a site review into four actions, not four lists", "Strength × opportunity = the move you make Monday"),
  ("PESTLE", "Wage rises, business rates and energy as each site's 12-month forecast", "A 6.7% wage rise on a 40% labour line"),
  ("The value chain", "Where a multi-site business actually adds margin", "Central kitchen prep versus every site prepping its own"),
  ("VRIO and the resource-based view", "What a rival can't copy: the GM, the lease, the recipe?", "Score each asset: valuable, rare, inimitable, organised"),
  ("The Ansoff matrix", "New site, new menu or new city: the growth risk ladder", "Same brand, same town is the lowest-risk growth"),
  ("The BCG matrix", "Your sites as a portfolio: stars, cash cows, dogs", "When the dog site should close, not be fixed"),
  ("Blue Ocean and the ERRC grid", "Remove what guests don't value to pay for what they do", "Cut the 40-dish menu to 15; fund faster service"),
  ("Core competence", "When site three stretches what you're actually good at", "A great café brand opening a restaurant"),
 ]),
 "O": ("Operations", [
  ("Little's Law", "Two numbers you can count at lunch tell you how long guests wait, and what walks out", "12 in the queue ÷ 2 served a minute = a 6-minute wait"),
  ("Theory of Constraints", "Find the one bottleneck that caps every site's sales", "One espresso machine caps a 60-seat café at lunch"),
  ("Capacity utilisation and yield", "The money in empty seats at 3pm", "60 seats × 20% full × 3 quiet hours"),
  ("Lean: the eight wastes", "The eight wastes, found in one kitchen shift", "Walking 2 km a shift to a badly placed fridge"),
  ("Standard work and SOPs", "Consistency across sites without the founder in the room", "Same flat white at site 1 and site 9"),
  ("Six Sigma and variation", "Why site seven's portions drift, and what it costs", "10g extra cheese × 400 covers × 52 weeks"),
  ("Inventory and par levels (EOQ)", "Ordering so you neither bin stock nor run out", "Waste 4% versus stockouts on a Saturday"),
  ("Service blueprinting", "Mapping the guest's visit front and back of house", "The 90 seconds between order and first contact"),
  ("Labour scheduling", "Rota to forecast covers, not to last week", "Two hours saved a day = £10k a year a site"),
  ("Supply chain resilience", "Single-supplier risk and the bullwhip effect", "One supplier short = ten sites short"),
 ]),
 "M": ("Marketing", [
  ("STP: segmentation, targeting, positioning", "Each site is for someone: say who", "Station site at 7am versus residential site at Saturday brunch"),
  ("The 7Ps of services", "People, process and physical evidence are the product", "The till queue is part of your brand"),
  ("Customer lifetime value", "What a regular is really worth to one site", "£6 × 5 visits a week × 48 weeks = £1,440"),
  ("CAC and payback", "Discounts and delivery apps as customer acquisition costs", "A £5 voucher that buys one visit, not a regular"),
  ("Price elasticity", "A 30p rise: who leaves, and does it matter?", "Lose 3% of covers, gain 8% margin"),
  ("Menu engineering", "Stars, plough horses, puzzles and dogs on your menu", "Move the star to the top-right of the menu"),
  ("Brand equity", "Why a known name lets site ten open busy", "Week-one sales: new name versus known name"),
  ("NPS and reviews", "Reviews as a free operations audit for every site", "Three reviews mention the wait: it's a process"),
  ("Customer journey and moments of truth", "The three moments that decide a return visit", "The first 10 seconds, the wait, the bill"),
  ("Channel strategy", "Dine-in, takeaway and delivery: margin by channel", "Same burger: £4 margin in, £1.20 on the app"),
 ]),
 "L": ("Leadership & organisational behaviour", [
  ("Span of control", "How many sites one ops manager can really run", "Six sites fine, eleven sites firefighting"),
  ("Situational leadership", "Leading a new GM differently from a veteran", "Direct for week one, delegate by month three"),
  ("Herzberg's hygiene factors", "Why a pay rise alone doesn't stop staff leaving", "Rotas posted late cost more than 20p an hour"),
  ("Tuckman's team stages", "Getting a new site's team from forming to performing", "Opening week is storming: plan for it"),
  ("RACI and decision rights", "What a GM can decide without calling you", "Comps up to £50, rota changes, supplier swaps"),
  ("Kotter's eight steps", "Rolling one change across twelve sites", "A new till system that site four ignores"),
  ("The five dysfunctions of a team", "The leadership team at five-plus sites", "Ops and finance agreeing in the room, not after"),
  ("Psychological safety", "Staff telling you the fridge is failing before it fails", "The £3k stock loss nobody mentioned"),
  ("Schein's three levels of culture", "Why site one's culture doesn't copy to site ten", "Values on the wall versus what gets praised"),
  ("Greiner's growth crises", "The founder-to-leader crisis every group hits", "From doing it yourself to designing how it's done"),
 ]),
 "E": ("Economics", [
  ("Opportunity cost", "What the founder's hour is actually worth", "An hour fixing a rota versus an hour on site five"),
  ("Economies of scale", "What gets cheaper at ten sites, and what doesn't", "Coffee beans down 12%, rent not at all"),
  ("Diseconomies of scale", "Why costs per site can rise as you grow", "Head office cost per site climbs past site eight"),
  ("Marginal cost and revenue", "Is the extra opening hour worth it?", "£180 of sales against £140 of extra cost"),
  ("The sunk cost fallacy", "Keeping a failing site because of what it cost", "The £200k already spent is gone either way"),
  ("Game theory and the price war", "Two cafés, one street, and the prisoner's dilemma", "Both cut 50p, both lose margin, nobody wins guests"),
  ("Supply, demand and dynamic pricing", "Happy hour as demand shaping, not discounting", "Fill 3pm without emptying 1pm"),
  ("Inflation and menu pricing", "Passing cost rises through without losing guests", "Food up 9%: price, portion or mix?"),
  ("Clustering and cannibalisation", "Opening near your own site: help or harm?", "Site two takes 15% of site one's sales"),
  ("Behavioural economics on the menu", "Anchors and decoys that lift spend honestly", "A £14 dish that makes £11 look fair"),
 ]),
 "D": ("Data & decision-making", [
  ("Decision trees and expected value", "Pricing the risk before you sign a lease", "60% chance of £4k a week, 40% chance of £1k"),
  ("Leading and lagging KPIs", "The numbers that warn you before the P&L does", "Repeat visits fall weeks before sales do"),
  ("The balanced scorecard", "One page per site across money, guests, process, people", "A profitable site with 90% staff turnover"),
  ("Statistics and noise", "Is this week's sales dip real or just weather?", "A £1,200 dip inside normal weekly swing"),
  ("Regression basics", "What actually drives a site's covers", "Rain, payday and the local event calendar"),
  ("Forecasting", "Weighting last year against last month", "Bank holiday Mondays need their own forecast"),
  ("Scenario planning", "Three futures for a new site before you commit", "Good, expected and bad: does it survive bad?"),
  ("Cohort analysis", "Do new guests come back, site by site?", "January's new guests: 40% back by March"),
  ("A/B testing", "Testing a menu change at two sites before twelve", "New price at site 3, old price at site 4"),
  ("Benchmarking like for like", "Comparing sites fairly when they aren't alike", "Sales per square foot, labour per cover"),
 ]),
 "H": ("People & HR", [
  ("The cost of staff turnover", "What one leaver really costs a site", "Recruiting, training and lost speed: £2,500+"),
  ("Job design and career ladders", "A visible route from kitchen porter to GM", "Five rungs, each with a skill and a pay step"),
  ("Incentives and agency theory", "Bonus on sales, profit or guests: what gets gamed", "A sales bonus that pushes discounts"),
  ("Training ROI (Kirkpatrick)", "Proving training pays, not just that it happened", "Upsell training: +£0.40 a cover"),
  ("Workforce planning", "Hiring for site six before site six exists", "The GM hired 12 weeks before opening"),
  ("Employer value proposition", "Why good staff choose your sites over the next door", "Rotas two weeks ahead, meals, a path up"),
  ("Performance management", "Fair, regular, simple reviews across sites", "Ten minutes a month beats one hour a year"),
  ("Succession planning", "The bench of GMs ready for the next opening", "One ready-now deputy per three sites"),
  ("Employment cost modelling", "The true hourly cost of a minimum-wage hour", "Add employer NI, pension and holiday pay: roughly +15–20%"),
  ("Engagement and eNPS", "Measuring how staff feel before they quit", "A two-question pulse every month"),
 ]),
 "G": ("Entrepreneurship & growth", [
  ("Lean startup and the MVP", "A pop-up before a lease", "Six weeks of pop-up data versus a ten-year lease"),
  ("Product-market fit", "Knowing site one works for the market, not just for you", "Repeat rate, not opening-week queues"),
  ("Replicability and the playbook test", "Can someone else open site four without you?", "The site-opening checklist as the real asset"),
  ("Franchise versus company-owned", "Who owns the risk, who keeps the margin", "8% royalty versus 100% of profit and risk"),
  ("The funding stack", "Debt, equity and landlord incentives for the next site", "A rent-free period is cheaper than equity"),
  ("Site selection and catchment", "Choosing streets with numbers, not instinct", "Footfall × conversion × spend"),
  ("Hub and spoke", "Central production feeding small sites", "One kitchen, five kiosks, lower rent"),
  ("Acquisitions", "Buying a competitor's site versus fitting out your own", "A going concern at 2× profit versus a blank shell"),
  ("Exit planning", "Building the group a buyer would pay for", "Clean numbers, a team that runs without you"),
  ("The business model canvas", "One page that shows how each site makes money", "Nine boxes, filled in for site one"),
 ]),
 "N": ("Negotiation, risk & governance", [
  ("BATNA", "Your walk-away before a lease negotiation", "The other two units you could take instead"),
  ("ZOPA and anchoring", "Negotiating supplier prices across sites", "Anchor with a ten-site volume, not one"),
  ("The risk matrix", "Likelihood × impact across a multi-site group", "One allergen error, ten sites' reputation"),
  ("The Swiss cheese model", "Why incidents get through every layer at once", "Label, training, check: three holes aligned"),
  ("Governance and advisory boards", "When a founder needs a board, and what it does", "A quarterly board that asks the hard questions"),
  ("Stakeholder mapping", "Power and interest: landlord, lender, council, team", "Who can stop site six from opening?"),
  ("Lease terms that bite", "Upward-only rent reviews and break clauses", "A 5-year break clause is an option worth paying for"),
  ("Compliance as a system", "Allergens and food safety the same at every site", "One matrix, one training, one audit"),
  ("ESG as cost and value", "Sustainability that pays: waste, energy, sourcing", "Food waste down 2 points = £20k a year at ten sites"),
  ("Business continuity", "The plan for when a site, supplier or system fails", "The till goes down at 12:30 on a Saturday"),
 ]),
}
ORDER = list("FSOMLEDHGN")

rows, idx = [], {k: 0 for k in ORDER}
for n in range(1, 101):
    k = ORDER[(n - 1) % 10]
    topic, angle, example = M[k][1][idx[k]]
    free, gated, kw = W[k][idx[k]]; idx[k] += 1
    date = FIRST_MONDAY + dt.timedelta(weeks=n - 1)
    rows.append(f"| {n:02d} | {date:%a %d %b %Y} | {M[k][0]} | **{topic}** | {angle} | {example} | {free} | {gated} | **{kw}** | {STATUS.get(n, 'Planned')} |")

intro = """# The Operator's Ledger — 100-episode plan

**The consistency anchor for the series.** One explainer every Monday from WRW Hospitality. Each episode takes a concept taught on an MBA and makes it useful to owners, operators and founders scaling a multi-site business. The aim is not to explain the theory; it's to show why it matters to someone opening their next site.

**The USP, every episode:**
1. **Textbook to operator.** State what the framework is in one line. Then move it down to one site, one P&L line or one decision an owner actually faces.
2. **One worked example in pounds.** Every number is reconciled, and labelled "Illustrative figures, weekly" unless it is sourced.
3. **It builds on the last.** Reuse SITE 1 and SITE 10, Athena, and earlier episodes' numbers where they fit, so the series compounds.
4. **One question for Monday,** something the viewer can check in their own business that week.
5. **Never generic.** If the episode could run on any business channel unchanged, it isn't finished.

**The weekly rhythm:** Monday, the episode (WRW Hospitality page, reposted by Wesley). **Wednesday, The Operator's Toolkit** (from Wesley's personal profile, pointing back to Monday's episode): the row's tool, complete for **one site**. People who comment the **keyword** get the **multi-site version** through a short form (the pattern is `wednesday/w01-breakeven/`). Friday, the country report (WRW Hospitality page).

**How to use this file:**
- Episodes run in order unless Wesley moves one. To change a topic, angle or order, edit `plan/build_episodes.py` and re-run it; never edit the table by hand.
- Before scripting an episode, read its row here, then the `operators-ledger-episode` skill in the brain (`Agents Office/skills/operators-ledger-episode/`).
- Mark status as episodes move: Planned → Scripted → In production → Rendered → Published.
- Modules rotate in the order Finance, Strategy, Operations, Marketing, Leadership, Economics, Data, People, Growth, Negotiation and risk. So every ten weeks covers the whole MBA once.

| # | Monday | Module | MBA topic | The Ledger angle | Worked example | Wednesday tool (free, one site) | Gated (multi-site) | Keyword | Status |
|---|---|---|---|---|---|---|---|---|---|
"""
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "EPISODES.md")
open(out, "w", encoding="utf-8").write(intro + "\n".join(rows) + "\n")
# the office agents read brain notes, not the repo: keep a generated copy in the brain
BRAIN_NOTE = os.path.join("C:/Users/Wesley/Agents Office Brain", "40-Marketing", "operators-ledger-episodes.md")
if os.path.isdir(os.path.dirname(BRAIN_NOTE)):
    head = "<!-- Generated from agents-office/videos/operators-ledger/plan/build_episodes.py. Edit there, not here. -->\n"
    note = intro.replace("`plan/build_episodes.py`", "`videos/operators-ledger/plan/build_episodes.py` in the agents-office repo")
    open(BRAIN_NOTE, "w", encoding="utf-8").write(head + note + "\n".join(rows) + "\n")
    print("wrote", BRAIN_NOTE)
print("wrote", os.path.abspath(out), len(rows), "episodes; last:", rows[-1][:60])
