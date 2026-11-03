# Franchise Entry Report, Issue 02 (Sweden): Stream 1, Market snapshot

Researched Sat 24 Oct 2026. Public sources only. Every figure below was read from the primary page, file or API on 24 Oct 2026 (statistics were pulled directly from the SCB, Eurostat and Riksbank open data interfaces, and PDFs were downloaded and read in full text). "Estimate" means derived by us, with the method shown. SEK = Swedish krona. Confidence: High = primary statistics or regulator; Medium = reputable press, association or industry-commissioned work; Thin = single weak source.

Machine-readable access note: SCB tables were read through the SCB open API (https://api.scb.se/OV0104/v1/doris/en/ssd/...). Public browser equivalents are on https://www.statistikdatabasen.scb.se/ . Eurostat tables were read through the Eurostat dissemination API (https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/...) and are on https://ec.europa.eu/eurostat/databrowser/ under the dataset code shown.

---

## 1. Population

- **Latest SCB figure: 10,621,103 residents, August 2026** (SCB monthly population, table "Population per month by region, age and sex", `BefolkManadCKM`, table updated 7 Oct 2026).
- **Trend vs end of previous year:** 10,605,529 at year-end 2025 (SCB, "Population by region, age and sex, year 2025", `FolkmangdDecCKM`, updated 24 Feb 2026). So +15,574 people, +0.15% in the first eight months of 2026. Same month a year earlier (Aug 2025): 10,605,098, so +16,005 (+0.15%) year on year. Estimate: both differences are our subtraction of SCB figures.
- Context: roughly 10.6 million customers, and growth has almost stalled (about 0.15% a year). Stockholm county alone is 2,498,257 (23.5% of the total, Aug 2026).
- Forward flag (not verified from the SCB page itself, from a search snippet only; do not print without checking): SCB's projection page says it expects a population fall in 2027 of nearly 30,000 because of emigration when EU temporary protection ends in March 2027. Page: https://www.scb.se/hitta-statistik/statistik-efter-amne/befolkning-och-levnadsforhallanden/befolkningens-sammansattning-och-utveckling/befolkningsframskrivningar/pong/statistiknyhet/sveriges-framtida-befolkning-2026-2070/ (not opened in full by us).
- Sources:
  - SCB monthly population: https://api.scb.se/OV0104/v1/doris/en/ssd/BE/BE0101/BE0101A/BefolkManadCKM
  - SCB year-end 2025: https://api.scb.se/OV0104/v1/doris/en/ssd/BE/BE0101/BE0101A/FolkmangdDecCKM
- **Confidence: High.** Note: SCB's monthly table is labelled "Population per month"; we have treated it as the month-end register count.

## 2. GDP per head

- **Eurostat, GDP at current market prices per inhabitant, 2025: Sweden EUR 56,250; EU27 EUR 41,770.** (2024: Sweden EUR 53,010; EU27 EUR 40,190. 2023: Sweden EUR 50,490; EU27 EUR 38,470.) Dataset `nama_10_pc`, unit CP_EUR_HAB, updated 22 Oct 2026. 2025 may still be provisional.
  - URL: https://ec.europa.eu/eurostat/databrowser/view/nama_10_pc/
- **Estimate: Sweden is about 135% of the EU27 average** (56,250 / 41,770 = 1.347). Method: simple division of the two Eurostat figures above.
- **Estimate of conversions** (method: EUR 56,250 converted at the Riksbank rates of 23 Oct 2026, section 6; a current rate applied to a 2025 value, so indicative only):
  - about SEK 626,000 (56,250 x 11.131)
  - about GBP 47,100 (56,250 x 11.131 / 13.29424)
  - about USD 62,960 (56,250 x 11.131 / 9.94461)
- Context: a Swedish consumer is about a third richer per head than the EU average, so read it as a "mature, affluent market" signal. (Norway's figure for comparison is in Issue 01.)
- **Confidence: High** for the Eurostat figures. Conversions are Estimates.

## 3. Food-service spend

Two measures, stated separately. Both are 2025 or later and both are official.

**(a) Household spend on restaurants and accommodation (COICOP 11), SCB national accounts.** Note that SCB's COICOP 11 now covers "restaurants and accommodation services", so it includes hotels and the like, not just restaurants.
- 2025: **SEK 234,632 million** (Estimate: sum of the four quarterly current-price figures 53,649 + 57,970 + 57,591 + 65,422 million). 2024 on the same basis: SEK 223,032 million. Nominal growth **+5.2%** (Estimate: simple ratio).
- First half 2026: SEK 117,602 million (56,326 + 61,276) versus SEK 111,619 million in H1 2025, **+5.4% nominal** (Estimate: simple ratio).
- **Volume growth, year on year, by quarter** (SCB, constant prices): Q1 2025 +0.1%, Q2 2025 -0.6%, Q3 2025 +3.4%, Q4 2025 +2.1%, Q1 2026 +1.4%, **Q2 2026 +2.5%**. For comparison, total household consumption volume was +2.3% in Q1 2026 and +3.2% in Q2 2026.
- Source: SCB table `NR0103ENS2010T02KvN` "Household consumption expenditure by purpose (COICOP), quarter", updated 28 Aug 2026. https://api.scb.se/OV0104/v1/doris/en/ssd/NR/NR0103/NR0103A/NR0103ENS2010T02KvN
- Context: Swedes spend roughly a quarter of a trillion crowns a year on eating and sleeping out, and after two flat years volumes turned up in H2 2025 and have kept rising.
- **Confidence: High** (the annual totals and the average growth are our Estimates from official quarterly data; SCB has not been checked for a published annual total).

**(b) Restaurant sector turnover (NACE 56, food and beverage service activities), SCB Structural Business Statistics.**
- Net turnover NACE 56: **SEK 160,701 million in 2024** (SEK 154,861 million in 2023; +3.8%, Estimate: ratio). NACE 56.1 (restaurants and mobile food service): SEK 147,790 million in 2024.
- 26,315 kind-of-activity units and 117,922 full-time-equivalent employees in NACE 56 in 2024 (24,754 units and 109,640 FTE in NACE 56.1).
- Source: SCB tables `NSERRFEngs07` (income statement, enterprise unit) and `NSEBasfaktaVEngs07N` (basic data, kind-of-activity unit), both "Year 2022 - 2024", updated 13 May 2026. https://api.scb.se/OV0104/v1/doris/en/ssd/NV/NV0109/NV0109P/
- Cross-check: the Konjunkturinstitutet (NIER) special study 127 quotes SCB for total restaurant sales of SEK 172 billion including VAT in 2023 (against about SEK 384 billion for grocery food and drink sales), and puts restaurant sales at about 31% of restaurant plus grocery food spend. (NIER, Specialstudie 127, 1 Sep 2026, section 1.) https://www.konj.se/media/br2b5jiv/specialstudie-127-det-kortsiktiga-genomslaget-pa-hamtmatspriserna.pdf
- **Latest turnover signal (monthly), Estimate:** Eurostat's services turnover index for NACE I56 (Sweden, calendar adjusted, value, 2021=100) is up year on year by +3.8% (Jan 2026), +2.8% (Feb), +4.6% (Mar), +5.4% (Apr), +5.3% (May), +5.0% (Jun 2026). Method: our ratio of the 2026 month to the same month of 2025 from Eurostat `sts_setu_m` (indic_bt NETTUR, unit I21, s_adj CA), table updated 21 Oct 2026; index levels 122.6/118.1, 120.2/116.9, 139.6/133.5, 149.9/142.2, 167.2/158.8, 163.9/156.1. This is value, so it includes price rises. https://ec.europa.eu/eurostat/databrowser/view/sts_setu_m/
- **Confidence: High.**

**Takeaway share (published, but no official statistic exists).**
- Infostat for Visita (web panel, 1,130 adults, published 21 Jan 2026): **51% of restaurant lunches are now eaten somewhere other than the restaurant**. https://newsroom.notified.com/visitapress/posts/pressreleases/restaurangkonsumtionen-vantas-oka-under-2026
- Visita (via Infostat 2024) in a May 2026 report: about half of meal orders are consumed outside the restaurant, as takeaway or delivery. The same report, written by Makrologik for Visita, notes there is **no public statistic on the takeaway share of restaurant turnover in value**, and assumes about one third of meal-related turnover is takeaway (an assumption: takeaway average bill taken as half of the dine-in bill, giving a 34.2% value share; a 2014 Skatteverket survey put it at 26% of total restaurant turnover including alcohol). Visita, "När momsen styr måltiden" (Makrologik), May 2026, footnote 49. https://visita.se/app/uploads/2026/06/Momsrapporten-260622.pdf
- **Confidence: Medium.** The order-share figure is a survey by an industry body's contractor; the value share is a modelled assumption in a lobbying report.

## 4. Franchise count

**Short answer: Sweden has no official statistical count of franchise systems or outlets; the numbers in circulation are association or consultancy claims.**

- **Association claim, early 2026:** Svenska Franchise Föreningen (Swedish Franchise Association), in its press release "Här är finalisterna till Svenska Franchisegalan 2026" (issued before the gala on 27 Mar 2026; the PDF carries no print date), describes franchising as a form that **"annually turns over more than SEK 300 billion and employs more than 150,000 people"**. https://mb.cision.com/Main/4736/4308147/3936067.pdf
  - Warning: this wording is boilerplate. The same figures ("close to 300 billion, close to 150,000 people", HUI, "just over 650 systems") appeared in the association's 2020 material, and a 24 Jan 2020 Realtid article (https://www.realtid.se/bors-finans/nordea-stottar-franschise/) carries the same SEK 300bn / 150,000 claim. Treat as an order of magnitude, not a 2026 measurement.
- **Systems and franchisees:** about **800 franchise systems, about 35,000 franchisees, about 150,000 employees, about SEK 292 billion a year**, credited by the Franchise Finder directory to "Svensk Franchise and HUI Research (Franchisebarometern 2025)". The page gives no year for the count. https://www.franchisefinder.se/om-franchising/statistik.html . We could not find the figure on the association's own site. The association's HUI page (https://svenskfranchise.se/om-oss/hui-rapporter-2) shows only: HUI 2017/18 about SEK 277bn and 144,000 employed; HUI 2018/19 about SEK 292bn and 150,000 employed (so the SEK 292bn is a 2018/19 HUI figure, now several years old).
- **Outlets:** not found (see gaps). The association's own "Franchising i Sverige 24/25" barometer (https://svenskfranchise.se/app/uploads/2025/05/Barometern-2025-digital-1.pdf) is a sentiment survey of 120 respondents (44% franchisees, 56% franchisors); hotels and restaurants were 14% of franchisee respondents and 16% of franchisor respondents. It is not a count.
- Association membership (svenskfranchise.se home page, 24 Oct 2026): 39 certified members, 28 members. https://svenskfranchise.se/
- Context: franchising is a sizeable and long-established model in Sweden (several hundred systems), but nobody keeps an official register, so any "number of franchise brands" has to be quoted with its source and flagged as an association/consultancy estimate.
- **Confidence: Thin to Medium.** Medium for "order of SEK 300bn and 150,000 people" as an association claim; Thin for "about 800 systems / 35,000 franchisees" (single secondary directory, undated).

## 5. Consumer spending trend (latest month)

- **Real household consumption growth** (SCB national accounts, household final consumption expenditure, constant prices, change on same quarter a year earlier): **Q2 2026 +3.2%**, Q1 2026 +2.3%, Q4 2025 +2.2%, Q3 2025 +2.3%. GDP growth Q2 2026: +3.8% year on year. SCB tables `NR0103ENS2010T01Kv` and `...T02KvN`, updated 28 Aug 2026. https://api.scb.se/OV0104/v1/doris/en/ssd/NR/NR0103/NR0103A/ . Confidence: High.
- **Consumer confidence** (Konjunkturinstitutet, NIER, Konjunkturbarometern, household confidence indicator, mean=100): **102.2 in September 2026** (survey 1 to 16 Sep, published 29 Sep 2026), up from 98.4 in August and 97.4 in July; highest since December 2021 and rated "normal". The October reading is not yet published (due at month end). https://www.konj.se/publikationer/konjunkturbarometern/2026-09-29-kraftigt-forbattrat-stamningslage-hos-hushallen . Confidence: High.
- **Inflation, September 2026** (SCB, published 14 Oct 2026): **CPI +1.1% year on year** (+0.3% in August); **CPIF +1.5%** (+0.7% in August). Tables `KPI2020M` and `KPIF2020`. https://api.scb.se/OV0104/v1/doris/en/ssd/PR/PR0101/ . Confidence: High.
- **Restaurant prices, September 2026** (SCB CPI, year on year): **COICOP 11 restaurants and accommodation services +2.2%** (weight 8.4% of the CPI basket, 84.01 per mille); **11.1 food and beverage serving services +2.6%**, of which full service +3.0% and limited service (fast-food/counter type) +2.3%; for contrast, **food and non-alcoholic beverages -6.6%** (food VAT cut). Month profile for limited service: +4.2% (April), +3.2% (May), +2.2% (June), +2.3% (September). Tables `KPI2020COICOP2M`, `KPI2020COICOPM`. Confidence: High. Observation only (not proven cause): limited-service price inflation slowed from about 4% before the takeaway VAT cut to about 2% afterwards.
- **Forecast (NIER, Konjunkturläget, 30 Sep 2026):** GDP +3.0% in 2026 and +2.4% in 2027; CPIF 1.6% (2026) and 2.6% (2027); CPI 0.9% (2026) and 3.0% (2027). NIER expects inflation above the Riksbank's 2% target in 2027 and says higher inflation and interest rates will slow household purchasing-power growth in 2027. https://www.konj.se/publikationer/konjunkturlaget/2026-09-30-inflationen-tydligt-over-inflationsmalet-nasta-ar/ and https://www.konj.se/en/publications/swedish-economy-report/2026-09-30-swedish-economy-report-september-2026/ . Confidence: High (forecast, not outturn).
- Context: Swedish households are coming out of a long squeeze; spending and mood have turned up in 2026, restaurant price inflation is running above headline inflation (2.2% vs 1.1%), and the next test is 2027, when rates and inflation are expected to rise.

## 6. Currency and policy rate

- **Exchange rates, Fri 23 Oct 2026** (Riksbank SWEA API, daily cross rates, latest observations): **SEK 13.2942 per GBP; SEK 11.1310 per EUR; SEK 9.9446 per USD.** Series `SEKGBPPMI`, `SEKEURPMI`, `SEKUSDPMI`. https://api.riksbank.se/swea/v1/Observations/Latest/SEKGBPPMI (replace the series code for EUR and USD). Public page: https://www.riksbank.se/en-gb/statistics/interest-rates-and-exchange-rates/ . Confidence: High. Rates move daily; refresh on the publication day.
  - Estimate for convenience: SEK 1 = about GBP 0.0752 (1 / 13.29424); SEK 100 = about GBP 7.52.
- **Riksbank policy rate: 1.75%** (series `SECBREPOEFF`, latest 23 Oct 2026). It was cut from 2.00% to 1.75% effective 1 Oct 2025 (Riksbank series history) and has been unchanged since.
- **Last decision:** the Executive Board met on 23 Sep 2026; the decision "policy rate unchanged at 1.75 per cent" was published 24 Sep 2026 and applies from 30 Sep 2026. https://www.riksbank.se/en-gb/monetary-policy/monetary-policy-report/2026/monetary-policy-decision-september-2026/
- **Next decision:** monetary policy meeting on 3 Nov 2026, **published 4 Nov 2026** (with a Monetary Policy Update and press conference); the one after is 15 Dec 2026, published 16 Dec 2026. Source: Riksbank calendar 2026. https://www.riksbank.se/en-gb/press-and-published/calendar/calendar-2026
- **Direction: up.** The Riksbank's September Monetary Policy Report says the policy rate "should be raised more than projected in the June forecast" and that, if the outlook is unchanged, "the increases in the policy rate will begin this year". Forecast path (Table 4): 1.75% in Q3 2026, 1.85% in Q4 2026, 2.38% in Q3 2027, 2.41% in Q3 2028. NIER (30 Sep 2026) expects a rise at the end of 2026 and a peak of 2.75% at the start of 2028. https://www.riksbank.se/globalassets/media/rapporter/ppr/penningpolitiska-rapporter-och-uppdateringar/engelska/2026/monetary-policy-report-september-2026.pdf . Confidence: High (forecast path is the Riksbank's projection, not a decision).
- Context for a brand: a weak-krona and rising-rate environment: royalty income paid in SEK is worth less in sterling, and local franchisees' financing costs are heading up from a low base.

## 7. How Sweden eats out

**(a) Frequency of eating out**
- **Infostat for Visita, published 21 Jan 2026, 1,130 people (randomly recruited web panel): 24% of Swedes eat restaurant food at least once a week; 55% at least once a month.** So 45% do so less than monthly. Visita's headline: restaurant consumption flat in 2025, expected to rise in 2026. https://newsroom.notified.com/visitapress/posts/pressreleases/restaurangkonsumtionen-vantas-oka-under-2026 . Fieldwork date not stated. Confidence: Medium (industry body, consumer panel).
- **Restaurangbarometern 2026, Norstat for Martin & Servera, published 13 Oct 2026, 1,000 people aged 18+: 62% visit restaurants and cafes "regularly"; 40% would eat out more often if their finances allowed; 60% say they have become more price-conscious when eating out in the past year.** https://www.mynewsdesk.com/se/martinservera/pressreleases/svenska-folket-aelskar-att-aeta-ute-men-drar-in-paa-restaurangbesoeken-naer-utgifterna-oekar-3472022 . Confidence: Medium (wholesaler-commissioned; "regularly" is undefined).
- Not comparable with each other (different definitions). Use the Visita weekly/monthly pair as the headline.
- Not found: YouGov "Dining out report 2025, Sweden" (21 Oct 2025) covers frequency by age and income but the figures are behind the YouGov download. https://yougov.com/reports/53181-dining-out-report-2025-schweden

**(b) Price level of restaurants and accommodation vs the EU (Eurostat price level index, EU27 = 100)**
- **Sweden 2025: restaurants and accommodation services 123.4** (2024: 117.9; 2023: 118.1). All household consumption 128.4 (2025); food 109.5 (2025). Eurostat `prc_ppp_ind_1` (COICOP 2018 basis), updated 9 Jul 2026. https://ec.europa.eu/eurostat/databrowser/view/prc_ppp_ind_1/
- Same line, 2025: **Norway 139.7**, Denmark 142.0, Finland 121.7, Germany 108.4.
- **Estimate: Sweden is about 23% above the EU average and about 12% cheaper than Norway** for eating and sleeping out (123.4 / 139.7 = 0.883). Method: ratio of the Eurostat indices.
- Note: the older COICOP 1999 vintage (`prc_ppp_ind`, updated July 2025) gave Sweden 116.7 for 2024; the newer vintage gives 117.9. Use the 2025 figure from the newer vintage and cite the dataset.
- Context: Sweden is a high-price market, but well below Norway (139.7) and Denmark (142.0) and only slightly above Finland (121.7), so a premium brand has less price headroom than in Norway.
- **Confidence: High.**

**(c) Regional concentration (SCB, accommodation and food service activities, NACE 55-56 combined, 2024)**
- Sweden: 35,870 local units, 158,990 employees, net turnover SEK 215,579 million. SCB table `NSEBasfaktaLVEngs07` (regional, local kind-of-activity unit, updated 13 May 2026; the regional table is only published for NACE 55-56 combined, not restaurants alone). https://api.scb.se/OV0104/v1/doris/en/ssd/NV/NV0109/NV0109P/NSEBasfaktaLVEngs07
- **Stockholm county: 9,378 units (26.1% of Sweden), 51,687 employees (32.5%), net turnover SEK 76,706 million (35.6%)**, versus 23.5% of the population (Aug 2026). Västra Götaland county (Gothenburg): 5,940 units, 26,889 employees, SEK 35,125 million (16.3% of turnover; 16.7% of population, Estimate: 1,780,988 / 10,621,103). Skåne county (Malmö): 4,792 units, 18,653 employees, SEK 23,953 million (11.1% of turnover).
- **Estimate, turnover per resident (2024 turnover divided by January 2025 population): Stockholm about SEK 31,000 per head; Sweden about SEK 20,400; Västra Götaland about SEK 19,800; Skåne about SEK 16,800.** Method: SCB net turnover (NACE 55-56, by location of the local unit) divided by SCB population in Jan 2025 (Stockholm county 2,474,076; Sweden 10,588,020; Västra Götaland 1,772,915; Skåne 1,428,980). Stockholm is inflated by hotels, business travel and tourists spending in the capital, so read it as "Stockholm is a destination as well as a city".
- Context: a third of all food-and-lodging turnover in the country is booked in Stockholm county, which holds under a quarter of the people; the top three counties together account for about 63% of turnover (35.6 + 16.3 + 11.1, Estimate). Entry usually means Stockholm first.
- **Confidence: High** (SCB), with the caveat that accommodation is included and turnover is attributed to the local unit.

## 8. Sector economics for the "So what"

**Restaurant margins (SCB Structural Business Statistics, NACE 56, enterprise unit, 2024):**
- Operating profit (before financial items): SEK 9,212 million on net turnover of SEK 160,701 million, so **an operating (EBIT) margin of 5.7% in 2024** (6.2% in 2023: 9,524 / 154,861). **Estimate: method = SCB operating profit / SCB net turnover.** NACE 56.1 (restaurants proper): 5.8% in 2024 (8,637 / 147,790), 6.2% in 2023. Tables `NSERRFEngs07`. https://api.scb.se/OV0104/v1/doris/en/ssd/NV/NV0109/NV0109P/NSERRFEngs07
- SCB's own published ratio, **operating margin before depreciation and write-downs (EBITDA-type): 8.1% in 2024 (8.4% in 2023); NACE 56.1: 8.3% (8.8% in 2023); NACE 56.2 catering: 5.1% (4.1% in 2023)**. Table `NSEBasfaktaVEngs07N`, kind-of-activity unit. Profit share of value added: 16.1% (2024). https://api.scb.se/OV0104/v1/doris/en/ssd/NV/NV0109/NV0109P/NSEBasfaktaVEngs07N
- Caution: profit after financial items for NACE 56 collapsed from SEK 7,925 million (2023) to SEK 1,677 million (2024) in the same table, which implies large financial costs or write-downs in 2024. Do not quote a net-profit margin without checking; the operating margin is the usable one.
- Visita (Makrologik, May 2026) adds that the median restaurant company spends about 36% of turnover on staff costs, three times the grocery sector. Medium confidence (industry-commissioned).
- Context: the average Swedish restaurant keeps about 6 crowns operating profit for every 100 crowns it sells. Thin margins mean a franchisee needs strong unit sales to cover royalties of the usual size.
- **Confidence: High** (official statistics; the margin ratio is our Estimate by division, SCB's EBITDA-type ratio is official).

**Takeaway VAT cut (confirmed from NIER and the government-backed analysis):**
- Since **1 Apr 2026, VAT on food was cut from 12% to 6%, temporarily until 31 Dec 2027.** Food sold for takeaway or delivery counts as food, so **takeaway meals are taxed at 6% while dine-in service stays at 12%.** Restaurants that do both must apply two rates (Visita/Makrologik: about 31,000 restaurant companies must run an extra VAT rate). NIER, Specialstudie 127, p.5, footnote 2. https://www.konj.se/media/br2b5jiv/specialstudie-127-det-kortsiktiga-genomslaget-pa-hamtmatspriserna.pdf
- **What it did to prices (NIER Specialstudie 127, 1 Sep 2026; author Simen Aannerud):** full pass-through would cut takeaway prices by about 5.4% (1.06/1.12 - 1). NIER collected menu prices from 72 chain restaurants (861 menu items; independent restaurants, 455 in the sample, could not be analysed) on 26-27 Mar 2026 and again on 29-30 Apr 2026, with Norwegian chains as a comparison group. Result: **"limited pass-through in the short run"**. More than 69% of the Swedish chain restaurants did not change their takeaway prices; where prices fell, most cuts were 1 to 3%. The headline estimate is a fall of just under 0.3% (about 5% of full pass-through, significant only at the 10% level), about 0.5% to 0.8% (10% to 14% of full pass-through) in the other specifications. NIER warns its restaurant data are lower quality than its grocery data and the figures are "indications". By contrast, NIER finds **full pass-through in grocery food prices** (SCB: food CPI -6.6% year on year in Sep 2026).
- **What it did to volume:** **Not found** from NIER or SCB. NIER says explicitly its study does not capture sales volumes, discounts or promotions. Indirect evidence only: household volume spend on restaurants and accommodation grew +1.4% (Q1 2026) and +2.5% (Q2 2026, first quarter after the cut); restaurant turnover (value) growth moved from about +3.7% year on year in Q1 (average of the three months) to about +5.2% in Q2 (Eurostat, Estimate above). This does not isolate the VAT effect. Modelled view from the industry: Visita/Makrologik estimates the VAT gap shifts meals from dine-in to takeaway and groceries, with a net negative effect on restaurants of about SEK 1.5 billion a year, and says restaurant demand responds to the VAT wedge. This is a modelled estimate in a report commissioned by Visita, a lobby for the sector (Medium/Thin). https://visita.se/app/uploads/2026/06/Momsrapporten-260622.pdf
- Context: the VAT cut made takeaway and supermarket ready meals relatively cheaper than eating in, but restaurants largely kept their takeaway prices and pocketed the gain in margin; food prices at the till fell, so the supermarket is the new competitor for the meal.
- **Confidence: High** for the rate change and for NIER's price finding (official agency, but a short one-month window and chains only); **Thin** for volume (no direct measure).

## 9. Delivery platforms (Foodora, Wolt, Uber Eats)

- **No dated market-share figure found from an official or independent survey.**
- **Closest proxy, Sensor Tower app analytics, Sweden, Q3 2025 (weekly active users, platforms not stated on the page):** foodora started the quarter at 348,000, fell to 251,000 in early August, and ended September at 315,000; Wolt rose from 85,900 to a peak of 108,000 by the end of September; Uber Eats went from 47,000 to 44,700. So foodora has about three times Wolt's active app users and about seven times Uber Eats'. Estimate: ratios 315 / 108 = 2.9 and 315 / 44.7 = 7.0, by our division. Q1 2025 (same source): foodora about 300,000, Wolt peak 144,000, Uber Eats 53,700 falling to 42,700. https://sensortower.com/blog/2025-q3-unified-top-5-food%20delivery%20services-units-se-63da96fbe1714cfff1c1e5a1 and https://sensortower.com/blog/2025-q1-unified-top-5-food%20delivery%20services-units-se-63da96fbe1714cfff1c1e5a1
- Caveats: third-party app-tracker estimate, weekly active users not orders, month-level timing only; the page text did not confirm platform scope and the source links carry a "country=US" parameter even though the URL slug is "se", so the Sweden labelling should be confirmed in the Sensor Tower interface before printing. Q4 2025 (Android only) is not comparable. **Confidence: Thin.**
- Unverified lead, not to be printed: a company-data aggregator (bolagsfakta.se, blocked on fetch) lists Foodora AB 2025 turnover of about SEK 2.26 billion with 330 employees. Check the Foodora AB annual report at Bolagsverket first.
- Context: foodora is the clear leader by app usage, Wolt second and growing, Uber Eats a small third. No source gives order volumes, so do not state "market share".

---

## Not found / gaps

1. **Franchise outlet count and Sweden's number of food-service franchise systems**: not found. No official register. Tried: SCB (no franchise variable), Svensk Franchise / Svenska Franchise Föreningen site and its HUI reports page (only 2017/18 and 2018/19 totals are shown on the page; the later Franchisebarometern PDFs show sentiment, not counts), the 24/25 barometer PDF, Franchise Finder, press releases, search for chain-level counts. The "about 800 systems / 35,000 franchisees" figure is a single undated directory page (Thin).
2. **Official year-by-year franchise turnover for 2024 or 2025**: not found. Only a repeated "more than SEK 300bn / 150,000 people" boilerplate (association claim).
3. **Volume effect of the takeaway VAT cut**: not found. NIER's study covers prices only and says it does not capture volumes. The only quantified effect on volumes found is the Visita-commissioned model.
4. **Independent restaurants' pass-through**: NIER says the data do not allow conclusions.
5. **Delivery platform market share or orders by platform**: not found (tried Sensor Tower, Delivery Hero group reporting, company databases, search for PostNord/Svensk Handel survey). Delivery Hero group figures do not break out Sweden. Wolt (DoorDash) and Uber Eats Sweden turnover not found. Bolagsfakta Foodora AB figure unverified (site blocked).
6. **YouGov "Dining out report 2025, Sweden"** frequency figures are paywalled/behind a download.
7. **NACE 56 regional split**: SCB's regional table only gives NACE 55-56 combined. Restaurant-only regional turnover not found (the accommodation share distorts Stockholm).
8. **Annual 2025 total for household restaurants and accommodation spend as a published SCB figure**: we summed four quarters; SCB quarterly data are the only series retrieved.
9. **Population projection for 2027** (SCB): seen in a search snippet only, SCB page not opened by us.
10. **Consumer confidence for October 2026**: due at the end of October (NIER Konjunkturbarometer), after the report is published on 30 Oct if it comes out on 29 Oct; check on the day.
11. **Riksbank rate decision of 4 Nov 2026** falls after the publication date; the report should state "next decision 4 Nov".
12. **Eurostat 2025 GDP per head** may be provisional; the SCB annual national accounts have not been checked for a SEK figure.
