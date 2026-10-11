# Idea Research: Fill in receipt items from a photo

- **Slug**: split-the-bill
- **Created**: 2026-10-11
- **Evidence confidence (overall)**: medium for prior art (receipt scanning in bill-splitting apps is well established); low for demand and accuracy (no first-party data, few independent sources, mostly store listings and vendor blogs)
- **Research focus (from user)**: how other bill-splitting apps handle receipt scanning. Target platform: **Android**.
- **Method note**: Evidence comes from web search result summaries only. No pages were fetched directly: the available fetch tool cannot pin or verify the connected peer address, so the URL Trust Policy's connection-safety rule rules out fetches. Each claim below is only as good as the search summary it came from and should be re-checked against the live page before anyone relies on it.

## Users & Demand

- The stated pain is manual line-item entry for long dinner receipts. — [source: intake.md, pasted text] (confidence: low; one stated want, no observed behavior)
- Many bill-splitting apps sell receipt scanning as a headline or paid feature, which suggests vendors see demand for it. — [source: Splitwise, BillSplit, SplitScan, IOU and Tab listings below] (confidence: medium; this is indirect, based on supply rather than measured demand)
- A Splitwise reviewer wanted itemization built into the main app instead of the separate Plates app. That is one stated want for scan-and-itemize. — [source: Splitwise App Store listing via search summary] (confidence: low; a single review)
- No usage data, interviews or support tickets exist for this project: there are no users and no code yet. — [source: repository inspection; `.specify/memory/constitution.md` is an unfilled template] (confidence: high)

## Prior Art

**Internal**
- None. The repo holds only Spec Kit scaffolding, with no earlier specs or decisions. — [source: repository inspection]

**Competitors: how they handle receipt scanning**

| App | Approach | Monetization | Notes | Source |
|---|---|---|---|---|
| Splitwise | OCR scan plus itemization in the main app | **Splitwise Pro (paid)** | A reviewer says it works only on photos taken in the app, not existing photos. A separate free app, *Plates by Splitwise*, itemizes dinner bills for up to 10 people. | Splitwise App Store listing; thinkingcrayfish product study (search summary) |
| Tab | Upload a scanned receipt. Participants join with a code and tap to claim items, including splitting one item. Tax and tip are calculated automatically. | Not found | This is the closest match to "scan, then everyone claims their items". | lovemoney.com, ionos.com, fool.com roundups (some from 2019–2023, may be stale) |
| Tricount | Only **stores a photo** of the receipt for reference. Expenses are entered by hand, with no itemization. | Conflicting reports | This shows a credible alternative: attach a photo without OCR. | tricount.com use-case page; lovemoney.com |
| Settle Up | No receipt scanning confirmed | — | Gap: not verified. | lovemoney.com (search summary) |
| BillSplit (iOS) | AI extracts items, prices and quantities, then items are assigned to people | **Per-scan credits**: 1 credit per scan, 3 free at start | Manual entry works offline as a fallback. | App Store listing (search summary) |
| SplitNShare (iOS) | Reads items and totals from a photo. Per-person or shared items, per-person tax and tip. | Not found | — | App Store listing |
| ClearTab (iOS) | Scan, then tap member chips on each line. Computes the minimum number of transfers to settle up. | Not found | Tracks payments but never moves money. | appgoblin.info listing |
| TabSplits | Scan with the camera **or pick from the photo library** | Not found | Addresses the limitation reported for Splitwise. | mwm.ai listing |
| IOU (iOS) | Scans and itemizes | Paid app | A reviewer reported line-item and **decimal-placement errors**, later fixed by the developer. | App Store review (search summary) |
| SplitEven (Android) | Assign items to people or split shared items equally | Not found | Receipt scanning not confirmed. | alternativeto.net |
| SplitScan (iOS) | Turns a receipt photo into itemized lines | Not found | iPhone only. | App Store listing |

**Patterns across competitors** (synthesis of the table above; confidence: medium)
1. **Scan, review, then assign** is the dominant flow. Items are extracted, then each one is assigned to people, with support for sharing an item.
2. **Tax and tip** are almost always distributed in proportion to each person's items, after itemization.
3. **Monetization** often gates scanning behind a paywall: a Pro subscription, per-scan credits or a paid app. A comparison aggregator reports user complaints about aggressive paywalls on scanning (marlvel.ai; low reliability).
4. **Input source** varies. Some apps accept only in-app camera captures; others also accept gallery images.
5. **Manual entry fallback** stays in place even in apps that scan.
6. **Photo-only attachment** without OCR (Tricount) is a lower-cost alternative that exists in the market.

**On-device tech precedent on Android**
- ML Kit **Document Scanner API** (launched Feb 2024): Google Play services provides the UI and models, adding about 300 KB to app size, requiring API 21+, with **no camera permission needed**. Output is JPEG and/or PDF. — [source: Android Developers Blog 2024-02; developers.google.com ml-kit doc-scanner] (confidence: medium-high; official sources, via summary)
- ML Kit **Text Recognition v2** is on-device and supports Latin, Chinese, Devanagari, Japanese and Korean scripts. — [source: developers.google.com ml-kit text-recognition v2 overview and languages page] (confidence: medium-high)
- Text recognition returns raw text blocks and lines, not structured line items. Turning that into item, quantity and price rows needs extra parsing. — ASSUMPTION based on how OCR APIs work (confidence: medium)

## Market & Context

- **What users do today**: type items by hand, split the total evenly, attach a photo only (Tricount), or use a separate scanning app (Plates). — [source: Tricount and Splitwise entries above] (confidence: medium)
- **Cost of doing nothing**: if scanning stays manual-only, a feature that competitors commonly offer would be missing. How much this affects adoption is unknown. — ASSUMPTION (confidence: low)
- **Vision LLMs vs OCR**: vendor and industry blogs claim vision LLMs beat traditional OCR on messy or low-quality receipts. One benchmark reports about 97% extraction success for a frontier model. Line items reportedly score lower, around 95–97%, than totals and vendor names (99%+). — [source: beancount.io 2026-07; research.aimultiple.com; invoicedataextraction.com] (confidence: low-medium; vendor and blog sources, metrics not comparable)
- **Hallucination risk**: LLMs may fill in smudged or torn areas with plausible guesses instead of flagging them. For splitting money, silent errors are worse than visible OCR failures. — [source: beancount.io] (confidence: medium)
- **Cost and latency**: in one SROIE benchmark, a document VLM tied a traditional OCR engine on character error rate but was much slower and more expensive. It measured header fields only, not line items. — [source: imagetotable.ai 2026] (confidence: low-medium)

## Data & Constraints

- **Platform**: Android only (per user). — [source: user input]
- **On-device OCR accuracy on Android**: older (2018-era) third-party tests found poor results on low-resolution receipts, character confusion, problems with vertical text, and weaker accuracy on Android than iOS on a low-end device. For example, one benchmark reported a 20% success rate on Android against 42% on iOS. **These predate Text Recognition v2 and may not reflect current accuracy.** — [source: tsh.io; fritz.ai / heartbeat.comet.ml DeltaML] (confidence: low; outdated)
- A small Indonesian thesis reports 83.3% text recognition on a receipt-archiving app, with unclear methodology. — [source: telkomuniversity.ac.id abstract] (confidence: low)
- **Error modes that matter for money**: decimal placement, misread digits, and line items merged or split incorrectly. These were reported for IOU and in ML Kit tests. — [source: IOU review; tsh.io] (confidence: medium)
- **Privacy**: receipts can contain merchant location, partial card numbers and time of visit. On-device processing keeps the image local; a cloud OCR or LLM sends the image to a third party, which would need disclosure in the Play Store data-safety section. — ASSUMPTION (confidence: medium; Play data-safety requirements not verified in this research)
- **Cloud costs**: per-scan API cost is a recurring expense and probably explains why competitors use credits or paywalls. — ASSUMPTION drawn from BillSplit's credit model (confidence: medium)
- **Receipt variety**: languages, currencies, decimal separators (`,` vs `.`), service charge and tax lines, and discounts. — ASSUMPTION; target locales unknown (confidence: medium)

## Evidence Against the Idea

- **Accuracy may not beat typing on hard receipts.** If users must check and fix every line anyway, the time saved shrinks. On-device OCR on Android has documented accuracy problems, though with old data, and line items are the hardest fields even for LLM extraction. — [source: tsh.io; fritz.ai; invoicedataextraction.com]
- **Silent errors cost money and trust.** Decimal and digit misreads (IOU), or LLM hallucination, can quietly charge someone the wrong amount. — [source: IOU review; beancount.io]
- **Recurring cost or privacy exposure if done in the cloud.** Competitors that charge per scan or behind a Pro tier suggest the cost is real. — [source: BillSplit, Splitwise listings]
- **The market is crowded.** Many apps already scan receipts, so this is table stakes rather than a differentiator. — [source: competitor table]
- **Cheaper alternatives exist.** Attaching a photo without extraction (Tricount), or faster manual entry, might cover much of the pain. — [source: tricount.com]
- **No demand data.** The only signal is one stated pain point. — [source: intake.md]

## Clarifications (2026-10-11, from owner interview)

- **Purpose**: personal or portfolio Android app, possibly published free later. No revenue or paywall. — [source: owner]
- **v1 receipts**: Malaysia only, MYR, Latin script. Chinese item names are not promised: prices and quantities are read, and the user types the name. Handwritten bills are out of scope for scanning. — [source: owner]
- **Images**: receipt photos never leave the device; cloud reading (Option C) is out of scope for now. — [source: owner]
- **Order of work**: manual item entry, assignment and splitting first, then Option A, then Option B only if the receipt test passes. — [source: owner]
- **Charges split**: service charge, SST and rounding adjustment are shared in proportion to each person's item subtotal. The total check tolerates ±5 sen. — [source: owner]
- **Receipt test (gate for Option B)**: 20 real Malaysian restaurant receipts of mixed types (mamak, chain, café, Chinese restaurant; short and long). Pass requires at least 80% of line items read with the correct price, and a median check-and-fix time below the median manual typing time. — [source: owner] Status: **not yet run**.
- **Malaysian F&B service tax is 6%**: the general service tax rose to 8% on 2024-03-01, but F&B was excluded. — [source: trykintsugi.com; orbitax.com] (confidence: medium-high)
- **A 10% service charge is commonly added, with SST applied on top** (food → +10% service charge → SST). — [source: themoneybees.co] (confidence: medium; single source)
- **Receipts often show a "Rounding Adj" line**: totals are rounded to the nearest 5 sen. — ASSUMPTION from general knowledge; not sourced in this research (confidence: medium)

## Gaps & Open Questions

> Locales, image handling, monetization, build order and gallery input are resolved or deferred by the Clarifications above. Gallery input is deferred to the Option B spec. Still open: on-device accuracy (pending the receipt test) and Play data-safety (moot while images stay on the device).

- [NEEDS CLARIFICATION: Target receipt locales, languages and currencies — this decides whether Latin-only on-device OCR is enough]
- [NEEDS CLARIFICATION: Is sending receipt images to a cloud service acceptable (privacy, cost, offline use)?]
- [NEEDS CLARIFICATION: Free or monetized? Competitors often charge for scanning]
- [NEEDS CLARIFICATION: Does the core app (manual item entry and assignment) exist or get built first? This idea depends on it]
- [NEEDS CLARIFICATION: Current Text Recognition v2 accuracy on real restaurant receipts — needs a small labeled test set; no reliable public line-item benchmark was found]
- [NEEDS CLARIFICATION: Accept gallery images as well as the camera?]
- [NEEDS CLARIFICATION: Settle Up and Tab's current scanning behavior, and Splitwise Pro's current pricing — not confirmed]
- [NEEDS CLARIFICATION: Play Store data-safety and disclosure requirements if images leave the device — not researched]

## Sources

All sources come from web search result summaries; none were fetched directly. Policy branch for each: `auto-refused: fetch not attempted — fetch mechanism cannot pin or verify the connected peer address; search-summary only`.

- https://apps.apple.com/app/splitwise-bill-splitter/id458023433 (host: apps.apple.com)
- https://thinkingcrayfish.substack.com/p/product-study-splitwise (host: thinkingcrayfish.substack.com)
- https://apps.apple.com/sa/app/billsplit-split-bill/id6746359329 (host: apps.apple.com)
- https://apps.apple.com/py/app/splitnshare-bill-splitter/id6745573409 (host: apps.apple.com)
- https://appgoblin.info/apps/6777948632 (host: appgoblin.info)
- https://mwm.ai/apps/tabsplits/6767791387 (host: mwm.ai)
- https://alternativeto.net/software/spliteven/about (host: alternativeto.net)
- https://apps.apple.com/app/iou-easily-split-your-tab/id1589968294 (host: apps.apple.com)
- https://marlvel.ai/apps/billsplitter-ai-scan-split/vs (host: marlvel.ai)
- https://apps.apple.com/us/app/-/id6758058491 (host: apps.apple.com)
- https://www.lovemoney.com/news/85624/best-free-bill-splitting-apps-tricount-splid-settle-up-acasa-splitwise (host: www.lovemoney.com)
- https://www.ionos.com/digitalguide/online-marketing/web-analytics/best-bill-splitting-apps.md (host: www.ionos.com)
- https://fool.com/the-ascent/personal-finance/articles/these-mobile-apps-make-it-easy-to-split-bills-and-expenses-with-friends/ (host: fool.com)
- https://tricount.com/expense-tracker-use-cases/restaurant-bills (host: tricount.com)
- https://android-developers.googleblog.com/2024/02/ml-kit-document-scanner-api.html (host: android-developers.googleblog.com)
- https://developers.google.com/ml-kit/vision/doc-scanner/android (host: developers.google.com)
- https://developers.google.com/ml-kit/vision/text-recognition/v2/languages (host: developers.google.com)
- https://tsh.io/blog/simple-ocr-implementation-on-android-with-googles-ml-kit (host: tsh.io)
- https://fritz.ai/choose-the-right-on-device-text-recognition-sdk-on-android-using-deltaml-9b4b3e409b6e (host: fritz.ai)
- https://openlibrary.telkomuniversity.ac.id/pustaka/files/154348/abstract/aplikasi-pengarsipan-struk-belanja-dengan-pengenalan-teks.pdf (host: openlibrary.telkomuniversity.ac.id)
- https://beancount.io/blog/2026/07/10/ai-receipt-scanning-expense-apps-ocr-hallucination-guide (host: beancount.io)
- https://research.aimultiple.com/receipt-ocr (host: research.aimultiple.com)
- https://invoicedataextraction.com/blog/invoice-ocr-accuracy-developer-guide (host: invoicedataextraction.com)
- https://imagetotable.ai/references/doctr-vs-surya2-receipt-benchmark (host: imagetotable.ai)
- https://trykintsugi.com/sales-tax-guides/apac/malaysia (host: trykintsugi.com)
- https://orbitax.com/news/country/article/Malaysia-Publishes-Order-and-R-55056 (host: orbitax.com)
- https://themoneybees.co/blog/malaysia-goods-and-services-tax (host: themoneybees.co)
