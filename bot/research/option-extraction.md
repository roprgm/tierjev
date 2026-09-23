# Replacing the DeepSeek call with a small option-extraction model

`answer/options.ts` asks `deepseek/deepseek-v4.1-flash` to read an X thread and list the candidate
answers that appear in it; Jev then picks one. That step is span extraction, not reasoning: every
option the bot may reply with is already a substring of the thread. This note surveys the small models
that could do it locally, recommends an order to try them, and prices a distillation run.

Researched 2026-09-22. Prices and model versions move; each claim links to the page it came from.

## v1 scope

Only options that appear **literally** in the thread. No world knowledge. "Which day of the week?"
does not have to emit all seven days, that is v2. Target behaviour, English and Spanish:

| Input | Expected |
| --- | --- |
| `¿qué preferís, el día o la noche?` | `["el día", "la noche"]` |
| `¿sos team invierno o team verano?` | `["team invierno", "team verano"]` |
| `RANK THESE 4 👇 🇩🇪 Leroy Sané 🇸🇳 Sadio Mané 🇩🇿 Riyad Mahrez 🇧🇷 Willian` | the four names |
| `Which planet is tilted almost completely on its side? A) Neptune B) Uranus C) Saturn.` | `["Neptune", "Uranus", "Saturn"]` |
| a thread that asks nothing answerable from its own words | `[]` |

Inputs are noisy: `@handles`, `t.co` links, emoji, hashtags, line breaks, mixed languages, and the
thread arrives as the JSON `State` built by `answer/state.ts` (up to six parents cut to 280 characters
plus the whole summoning post, per `answer/thread.ts`).

**Every one of those expected outputs is a contiguous span of the input.** That single fact decides
most of the architecture questions below.

## What we are replacing, honestly

Before picking a model, the size of the prize. DeepSeek V4.1 Flash on the AI Gateway is
[$0.15 / 1M input and $0.60 / 1M output](https://vercel.com/ai-gateway/models/deepseek-v4.1-flash).
A `State` of six 280-character parents plus a summons plus the 230-token instruction block is roughly
600-1,600 input tokens and 40-120 output tokens, so **one extraction call costs about $0.0001-$0.0003**.

The `bot/README.md` cost section puts X's own billing at roughly $0.02 for a short thread and $0.055 at
the depth limit. **The model call is around 1% of what the bot already pays per mention.** At 1,000
mentions a day the DeepSeek line is about $68/year; the same work inside the existing Vercel function at
500 ms of active CPU would be about $7.60/year
([$0.128/Active-CPU-hour + $0.0106/GB-hr in `iad1`](https://vercel.com/docs/functions/usage-and-pricing)).
A €5.99/month Hetzner box ([CX23](https://www.hetzner.com/cloud/cost-optimized/)) costs *more* per year
than the API it would replace, at that volume.

So the money argument is weak. The arguments that do hold:

1. **Literalness becomes structural.** `INSTRUCTIONS` asks the model to "Only list options that
   literally appear in the thread", and `dedupe()` in `answer/options.ts` only trims and lowercases.
   Nothing checks membership in the thread. A span model returns character offsets, so
   `text[start:end] === option` by construction and the prompt constraint stops being a hope.
2. **Latency.** The call has a 15 s timeout today. A 287M encoder on CPU is a sub-second forward pass
   with no network hop, and no tail risk from a third-party endpoint.
3. **Determinism and ownership.** `deepseek-v4.1-flash` can change under the bot; a pinned checkpoint
   cannot. Failures today fall back to `answer/words.ts`, which is much worse than the model.

Frame the project as *quality and latency*, with cost as a rounding error, or the payback maths will
disappoint.

## Candidate models

Disk sizes are the actual weight files as reported by the Hugging Face API on 2026-09-22, not card
estimates. "Zero-shot fit" is my judgement from the model's design and published numbers; nothing here
has been run against the five target cases.

### Span extractors (the right shape for this task)

| Model | Params | Disk | Licence | Languages | Zero-shot fit | CPU latency | Link |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `fastino/gliner2.5-multi-v1` | 287M | 1.15 GB fp32 | Apache-2.0 | multilingual (mDeBERTa-v3-base) | **best bet**, since labels take free-text descriptions, returns char spans, trainable | 130-208 ms for classification, hardware unstated | [HF](https://huggingface.co/fastino/gliner2.5-multi-v1) |
| `fastino/gliner2.5-small-v1` | 74M | 296 MB fp32 | Apache-2.0 | English only | same API, but no Spanish | as above | [HF](https://huggingface.co/fastino/gliner2.5-small-v1) |
| `knowledgator/gliner-x-small` | 300M | 1.20 GB fp32 / **173 MB INT8 ONNX** | Apache-2.0 | 21 incl. `es` | good; mT5 encoder, beats `gliner_multi-v2.1` on 7 of 8 multilingual NER sets | not published | [HF](https://huggingface.co/knowledgator/gliner-x-small) |
| `knowledgator/gliner-x-base` | 494M | 1.98 GB fp32 / 303 MB INT8 ONNX | Apache-2.0 | 21 incl. `es` | same, stronger | not published | [HF](https://huggingface.co/knowledgator/gliner-x-base) |
| `urchade/gliner_multi-v2.1` | 289M | 1.16 GB fp32 / 349 MB INT8 ONNX | Apache-2.0 | multilingual | the 2024 baseline; superseded | not published | [HF](https://huggingface.co/urchade/gliner_multi-v2.1) · [ONNX](https://huggingface.co/onnx-community/gliner_multi-v2.1) |
| `knowledgator/gliner-multitask-v1.0` | not stated | 3.64 GB | Apache-2.0 | English | has an explicit QA mode (SQuAD 2.0 F1 0.713) but English-only | not published | [HF](https://huggingface.co/knowledgator/gliner-multitask-v1.0) |
| `knowledgator/UTC-DeBERTa-small-v2` | 141M | not stated | Apache-2.0 | English | prompt-driven token classification, but unmaintained since 2024-05 and ~16 downloads/month | not published | [HF](https://huggingface.co/knowledgator/UTC-DeBERTa-small-v2) |
| `numind/NuNER_Zero` | not stated | 1.80 GB | MIT | English | GLiNER-family zero-shot NER, English only | not published | [HF](https://huggingface.co/numind/NuNER_Zero) |

### Schema-driven generative extractors

| Model | Params | Disk | Licence | Languages | Zero-shot fit | Link |
| --- | --- | --- | --- | --- | --- | --- |
| `numind/NuExtract-2.0-2B` | 2.0B | 4.42 GB | MIT | multilingual | has a **`verbatim-string`** field type aimed exactly at "copy it as written"; too big for CPU-in-a-function | [HF](https://huggingface.co/numind/NuExtract-2.0-2B) |
| `numind/NuExtract-1.5-tiny` | 494M | 988 MB bf16 | MIT | multilingual | the only small NuExtract; template-driven, would need a fine-tune | [HF](https://huggingface.co/numind/NuExtract-1.5-tiny) |
| `Universal-NER/UniNER-7B-*` | 7B | not stated | **CC BY-NC 4.0, research only** | English | **disqualified**, non-commercial and 7B | [HF](https://huggingface.co/Universal-NER/UniNER-7B-type) · [paper](https://arxiv.org/abs/2308.03279) |

### Small decoders and seq2seq (generate the JSON list)

| Model | Params | Disk | Licence | Languages | Notes | Link |
| --- | --- | --- | --- | --- | --- | --- |
| `Qwen/Qwen3.5-0.8B` | 0.8B | not stated | Apache-2.0 | **201** | best licence/size/multilingual trade-off among decoders; non-thinking by default | [HF](https://huggingface.co/Qwen/Qwen3.5-0.8B) |
| `Qwen/Qwen3-0.6B` | 0.6B (0.44B non-emb) | 1.50 GB bf16; [Q4_K_M GGUF 397 MB](https://huggingface.co/unsloth/Qwen3-0.6B-GGUF/tree/main) | Apache-2.0 | 100+ | safest tooling story; `enable_thinking=False` | [HF](https://huggingface.co/Qwen/Qwen3-0.6B) |
| `google/gemma-3-270m-it` | 268M | 536 MB | **Gemma terms, not OSI** | 140+ (family) | Google positions it explicitly as a fine-tuning target: "its true power is unlocked through fine-tuning" | [HF](https://huggingface.co/google/gemma-3-270m-it) · [blog](https://developers.googleblog.com/en/introducing-gemma-3-270m/) |
| `google/functiongemma-270m-it` | 270M | not stated | Gemma terms | multilingual vocab | a 270M Gemma already post-trained to emit structured calls, a better starting checkpoint than the raw 270M | [HF](https://huggingface.co/google/functiongemma-270m-it) |
| `google/t5gemma-2-270m-270m` | 786M | 1.57 GB bf16 | Gemma terms | 140+ | encoder-decoder, a natural extraction shape, but framed as a research release | [HF](https://huggingface.co/google/t5gemma-2-270m-270m) · [paper](https://arxiv.org/abs/2512.14856) |
| `meta-llama/Llama-3.2-1B-Instruct` | 1.23B | not stated | Llama 3.2 Community | 8 official | re-read the AUP's EU clause before relying on it | [HF](https://huggingface.co/meta-llama/Llama-3.2-1B-Instruct) |
| `HuggingFaceTB/SmolLM2-360M-Instruct` | 362M | 724 MB | Apache-2.0 | **English only** | card: "SmolLM2 models primarily understand and generate content in English", which rules it out | [HF](https://huggingface.co/HuggingFaceTB/SmolLM2-360M-Instruct) |
| `google/mt5-small` | 300M | 1.20 GB fp32 | Apache-2.0 | 101 | not instruction-tuned; "has to be fine-tuned before it is useable" | [HF](https://huggingface.co/google/mt5-small) |
| `google/byt5-small` | 300M | not stated | Apache-2.0 | 100+ | byte-level, so emoji/accents/`t.co` cannot break tokenization; under random-case corruption mT5 lost 25.7 points and ByT5 lost 1.5, but ByT5 is 1.5-2.6x slower per word-level task | [HF](https://huggingface.co/google/byt5-small) · [paper](https://arxiv.org/abs/2105.13626) |
| `google/flan-t5-base` | ~0.2B | not stated | Apache-2.0 | card lists 60 incl. Spanish | the language list means "present in the finetuning mixture", not "validated for Spanish", and no non-English benchmark is published | [HF](https://huggingface.co/google/flan-t5-base) |
| `bigscience/mt0-small` | 300M | not stated | Apache-2.0 | 101 | the instruction-tuned mT5, "capable of following human instructions in dozens of languages zero-shot" | [HF](https://huggingface.co/bigscience/mt0-small) |

Gemma terms are [not OSI](https://ai.google.dev/gemma/terms): Google "reserves the right to restrict
(remotely or otherwise) usage", and the restrictions must be propagated downstream with a notice file.
That is survivable for a hobby bot but it is a real difference from Apache-2.0.

### Fine-tuning backbones, if none of the above is used off the shelf

If GLiNER is abandoned and a plain BIO token-classifier is trained instead, these are the backbones
worth considering. Disk figures are the weight file as reported by the HF API; note that the DeBERTa-v3
repos still ship only `pytorch_model.bin`, no safetensors.

| Backbone | Params | Disk | Licence | Languages | Ctx | Link |
| --- | --- | --- | --- | --- | --- | --- |
| `microsoft/mdeberta-v3-base` | 86M backbone + 190M emb | 1.33 GB | MIT | CC100, ~100 | 512 | [HF](https://huggingface.co/microsoft/mdeberta-v3-base) |
| `jhu-clsp/mmBERT-small` | 140M (42M non-emb) | 564 MB | MIT | 1833 | 8192 | [HF](https://huggingface.co/jhu-clsp/mmBERT-small) |
| `jhu-clsp/mmBERT-base` | 307M (110M non-emb) | 1.23 GB | MIT | 1833 | 8192 | [HF](https://huggingface.co/jhu-clsp/mmBERT-base) |
| `BSC-LT/MrBERT-es` | 150M | not stated | Apache-2.0 | **es + en** | 8192 | [HF](https://huggingface.co/BSC-LT/MrBERT-es) |
| `EuroBERT/EuroBERT-210m` | 310M | not stated | Apache-2.0 | 15 incl. `es` | 8192 | [HF](https://huggingface.co/EuroBERT/EuroBERT-210m) |
| `FacebookAI/xlm-roberta-base` | 279M | 1.12 GB | MIT | 100 | 512 | [HF](https://huggingface.co/FacebookAI/xlm-roberta-base) |
| `pysentimiento/robertuito-base-uncased` | 109M | 435 MB | MIT (source repo; **HF card declares none**) | Spanish **Twitter** | 512 | [HF](https://huggingface.co/pysentimiento/robertuito-base-uncased) · [paper](https://arxiv.org/abs/2111.09453) |
| `answerdotai/ModernBERT-base` | 150M | 599 MB | Apache-2.0 | **en + code only** | 8192 | [HF](https://huggingface.co/answerdotai/ModernBERT-base) |

Three things to know here:

- **ModernBERT is English-only.** There is no official multilingual ModernBERT from Answer.AI. The
  ModernBERT-architecture multilingual model is **mmBERT**, from JHU-CLSP
  ([paper](https://arxiv.org/abs/2509.06888), [repo](https://github.com/JHU-CLSP/mmBERT)), which claims
  "+2.4 on XTREME" and "2-4x faster inference" vs XLM-R, though I found no measured throughput table
  backing the speed claim.
- **mDeBERTa is the strongest cheap multilingual encoder for Spanish at this size**, and its own card
  gives the number: XNLI Spanish **84.4 vs XLM-R-base 80.7**
  ([card](https://huggingface.co/microsoft/mdeberta-v3-base)). It is also the encoder inside both
  `gliner2.5-multi-v1` and `urchade/gliner_multi-v2.1` (backbone confirmed in that model's
  `gliner_config.json`, `max_len` 384), which is a good sign for the family.
- **`PlanTL-GOB-ES/roberta-base-bne` is dead.** The repo now contains only `.gitattributes` and
  `README.md`, `config.json` 404s, and the successor `BSC-LT/roberta-base-bne` does not exist. Do not
  plan around it; `BSC-LT/MrBERT-es` and `BSC-LT/mRoBERTa` are the live replacements.

## The rule-based baseline: harder than it looks, for an unexpected reason

The linguistics is sound. Universal Dependencies gives coordination as `conj` (conjunct) and `cc`
(coordinating conjunction), spaCy exposes both in the English *and* Spanish pipelines plus a
[`Token.conjuncts`](https://spacy.io/api/token) property, and Spanish `noun_chunks` is implemented, which
is exactly what widens a conjunct head `día` into the full noun phrase `el día`. Accuracy is there too:
Stanza reports Spanish AnCora **UAS 93.09 / LAS 91.30**
([performance](https://stanfordnlp.github.io/stanza/performance.html)).

The problem is that **no dependency parser runs in-process in JavaScript**. `wink-nlp` has no parser and
no Spanish model; `compromise` states outright that dependency parsing "requires understanding the syntax
tree... which we don't currently do"; the `spacy`/`spacy-nlp` npm packages are Python sidecars last
published in 2018-2019; spaCy has no official WASM build (its
[install docs](https://spacy.io/usage) list only CPython on Unix/macOS/Windows). Transformers.js supports
`token-classification` but has no dependency-parsing task at all.

And the licences are worse than the engineering. **Every Spanish spaCy pipeline is GPL-3.0** (because of
UD Spanish AnCora) while the English ones are MIT. Compare the published `meta.json` for
[`es_core_news_sm`](https://raw.githubusercontent.com/explosion/spacy-models/master/meta/es_core_news_sm-3.8.0.json)
(12 MB, GPL-3.0, UAS .9020 / LAS .8658) against
[`en_core_web_sm`](https://raw.githubusercontent.com/explosion/spacy-models/master/meta/en_core_web_sm-3.8.0.json)
(12 MB, MIT). UDPipe is worse still: code is MPL-2.0 but the
[models are CC BY-NC-SA](https://ufal.mff.cuni.cz/udpipe/2/models), the REST API's terms require
"explicit written permission of the authors" for any commercial exploitation and reserve the right to
reuse submitted data, so you would be shipping user posts to a third party under a non-commercial
licence. Stanza is cleanly Apache-2.0 but is Python, and its own paper puts it
[10.3x slower than spaCy on CPU](https://arxiv.org/abs/2003.07082).

spaCy's published CPU throughput, for reference, on 10,000 Reddit comments
([facts & figures](https://spacy.io/usage/facts-figures); **hardware not stated on the page**, though a
maintainer names `g4dn.2xlarge` in [a discussion](https://github.com/explosion/spacy/discussions/9624)):
spaCy `en_core_web_lg` 10,014 words/sec, Stanza `en_ewt` 878, UDPipe 1,101. UDPipe's own site puts
UDPipe 2 at "60 words/sec using 1 CPU thread".

**This reframes the whole comparison.** It is not "free parser vs paid model". It is "a Python sidecar
with a GPL-3.0 Spanish model, or a model that runs in-process in the Node function you already deploy".
That argues *for* the model side. It also means the free baseline in step 1 below should be a
hand-written splitter in TypeScript, not a parser.

## Multi-span QA: no checkpoint to download

The closest published task shape is **MultiSpanQA** (NAACL 2022,
[paper](https://aclanthology.org/2022.naacl-main.90/), [repo](https://github.com/haonan-li/MultiSpanQA),
data **CC BY-SA 4.0** per the [leaderboard](https://multi-span.github.io/)): ~6,000 multi-span questions
(~19,000 expanded), derived from Natural Questions, English only, in exactly the format wanted:
`question` and `context` as tokens plus a BIO `label`, and a `structure` field whose classes
include **`Conjunction`**, i.e. the coordinated multi-span cases are already isolated.

But the checkpoints are not usable:

- The only HF model tagged `dataset:MultiSpanQA` is
  [`ivabojic/deberta-v3-base_MultiSpanQA`](https://huggingface.co/ivabojic/deberta-v3-base_MultiSpanQA).
  MIT, English, **0 downloads**, and the repo has a 2.3 GB `pytorch_model.bin` with **no `config.json`
  and no tokenizer**. A research artifact, not a model.
- **LIQUID** (AAAI 2023, [paper](https://arxiv.org/abs/2302.01691)) releases synthetic *datasets* only,
  no checkpoints. **TASE** (EMNLP 2020, [repo](https://github.com/eladsegal/tag-based-multi-span-extraction))
  ships two RoBERTa-large DROP checkpoints via Google Drive with no licence stated, on AllenNLP, effectively
  unmaintained. **SpanQualifier** (Apache-2.0) releases no checkpoints.
- Quoref ([CC BY 4.0](https://huggingface.co/datasets/allenai/quoref)) and DROP
  ([CC BY-SA 4.0](https://huggingface.co/datasets/ucinlp/drop)) have ~30 HF models between them, but all
  are **single-span** QA heads or generative T5s. Nothing multi-span.

Tagger baselines on MultiSpanQA, for calibration (EM-F1 / PM-F1, from the repo): BERT-base 59.25/76.11,
RoBERTa-base 64.23/80.27, RoBERTa-large 68.81/84.39; leaderboard top is LIQUID RoBERTa-large ensemble at
73.13/83.36. A 300M model getting ~65 EM-F1 on *English Wikipedia* multi-span QA is the right order of
magnitude to expect before any domain fine-tune.

There is **no Spanish or multilingual multi-span QA dataset at all.** The only non-English one is CLEAN
(Chinese, [paper](https://arxiv.org/abs/2402.09923)). Spanish QA is all single-span: SQAC
([CC BY-SA 4.0](https://huggingface.co/datasets/PlanTL-GOB-ES/SQAC)), XQuAD
([CC BY-SA 4.0](https://huggingface.co/datasets/google/xquad)), MLQA. So the Spanish path is cross-lingual
transfer from a multilingual encoder, or your own data.

## Zero-shot viability

### The GLiNER trick, and why it is not obviously a trick

GLiNER takes a list of entity labels at inference time and scores spans against them, so you can ask for
labels that are not entity types at all. GLiNER2.5 goes further and lets each label carry a free-text
description ([model card](https://huggingface.co/fastino/gliner2.5-multi-v1)):

```python
from gliner2 import AutoExtractor

model = AutoExtractor.from_pretrained("fastino/gliner2.5-multi-v1")
result = model.extract_entities(
    "¿qué preferís, el día o la noche?",
    {"opción": "cada una de las alternativas entre las que la pregunta pide elegir"},
    include_spans=True,
)
```

`pip install "gliner2[local]"` needs Python 3.10 or newer and runs on CPU, CUDA or MPS, so this is
testable on the Mac today with no cloud at all ([GitHub](https://github.com/fastino-ai/GLiNER2)).

Two properties make it fit better than the label-hack framing suggests:

- **Character offsets.** `include_spans=True` returns `start`/`end` such that
  `text[start:end] == entity["text"]`, so "literally in the thread" is enforced by the return type.
- **Token boundaries land where we need them.** GLiNER's word splitter is the regex
  `\w+(?:[-_]\w+)*|\S`
  ([`gliner/data_processing/tokenizer.py`](https://github.com/urchade/GLiNER/blob/main/gliner/data_processing/tokenizer.py)),
  so `?`, `¿`, `)` and each emoji are separate tokens. `la noche` is expressible without the trailing
  `?`; `Neptune` is expressible without the `A)`. All five target outputs are reachable as token spans.

Evidence that abstract, relational labels work at all: `knowledgator/gliner-multitask-v1.0` does
extractive QA by prepending the question and asking for the single label `answer`, and reports
**SQuAD 2.0 P 0.601 / R 0.875 / F1 0.713**
([card](https://huggingface.co/knowledgator/gliner-multitask-v1.0)). That is a lower bound on how far
the trick goes, but that checkpoint is English-only.

### Expected failure modes on the five cases

| Case | What I expect to break |
| --- | --- |
| `el día` / `la noche` | Boundary drift: the model returns `día` and `noche` without the article, or `noche?`. Cosmetic for Jev (it picks a key) but the reply text changes. |
| `team invierno` | Multi-word spans that are not named entities are exactly where NER pretraining is weakest; likely splits into `invierno` / `verano`. |
| The four footballers | Should be the **easiest** case, since they are person names, squarely in distribution. Risk is the flag emoji being absorbed into the span. |
| `A) Neptune B) Uranus` | The letters. GLiNER may return `A) Neptune`, or return the letters as separate "options". This is the case most likely to need the fine-tune. |
| Nothing answerable → `[]` | The hardest. Zero-shot GLiNER has no notion of "this text asks no question"; at any threshold it will propose *something*. Expect false positives, and expect a fine-tune with explicit negatives (`{"entities": {"option": []}}`) to be the fix. |

The non-obvious risk is not precision, it is **recall symmetry**: for `A or B` the bot needs *both* or
neither. A model that reliably finds one of the two is useless here in a way that an F1 score will hide.
Measure exact-set match, not just span F1.

### Cheapest path to a first measurement

No cloud, no training, and it uses data the bot already has:

1. `bun run bot:answers 1000 > threads.jsonl` dumps the stored `AnswerRecord`s, each of which already
   carries `thread: Post[]` **and** the `options` DeepSeek produced (`bot/x/answers.ts`).
2. `pip install "gliner2[local]"` on the Mac; run `extract_entities` over the same threads with a
   handful of label/description phrasings (`option`/`opción`/`choice`/`alternative`).
3. Score exact-set match against the DeepSeek options, after filtering the DeepSeek list to entries that
   actually occur in the thread text (that filter alone will tell you how often the current model invents
   options, worth knowing on its own).

That is a few hours and $0, and it decides whether the fine-tune is needed or merely nice.

The hosted shortcut is weaker than it looks: `urchade/gliner_multiv2.1` on Spaces is currently in
`RUNTIME_ERROR`, `tomaarsen/gliner_medium-v2.1` is running but English-only, and Fastino's own hosted
API has **no published pricing**. `fastino.ai/pricing` 404s and the site offers only a waitlist.

## Recommendation for v1

**Try these in this order.**

### 1. A hand-written splitter in TypeScript, first, because it is free

Before any model: extend the existing `answer/words.ts` machinery into a deterministic option splitter
over the summoning post. Disjunction connectors (`o`/`u`/`or`), enumerations (newlines, bullets, numbered
and lettered labels `A)` `1.`), emoji separators, and comma lists that end in `o`/`or`. The
`A) Neptune B) Uranus C) Saturn` case is a regex and the flag-emoji list is a split. It costs nothing,
adds no latency, has no cold start, and it gives the eval harness a floor that every model must beat.
If it gets 60% exact-set match, the bar for a 287M model just became much higher and much more honest.

Hand-written rather than a dependency parser, deliberately: as the section above shows, no parser runs
in-process in JS, and the Spanish spaCy models are GPL-3.0 while UDPipe's are CC BY-NC-SA. A regex
splitter in `bot/answer/` has none of those problems and is the only genuinely free option.

### 2. `fastino/gliner2.5-multi-v1`, zero-shot, then fine-tuned

It is the only candidate that is simultaneously multilingual, Apache-2.0, ~287M, span-returning,
actively maintained (`gliner2` 2.0.0 published 2026-08-24, checkpoint last modified 2026-09-20), and
**fine-tunable through the same library** (`pip install gliner2[train]`, with LoRA adapters documented).
Zero-shot first because it is an afternoon; fine-tune second because the training data is nearly free
(next section).

### 3. `knowledgator/gliner-x-small` as the serving-size alternative

If the fine-tuned 2.5-multi is too heavy to ship, `gliner-x-small` publishes a **173 MB INT8 ONNX** file
and an mT5 encoder with Spanish explicitly on the card, and it beats `gliner_multi-v2.1` on seven of
eight multilingual NER benchmarks in its own table. Its training data,
[`knowledgator/gliner-multilingual-synthetic`](https://huggingface.co/datasets/knowledgator/gliner-multilingual-synthetic),
was itself LLM-annotated FineWeb-2, the same recipe proposed below.

### 4. `Qwen/Qwen3-0.6B` + LoRA + grammar-constrained decoding, only if spans genuinely cannot express the task

Keep this in reserve. It is the fallback if evaluation shows the answer often is *not* a contiguous span
(for example if v2's world knowledge arrives sooner than expected). It costs a GGUF download, a
llama.cpp server and a JSON schema, and it reintroduces the hallucination problem that the span model
solves for free.

**What I would not do:** NuExtract 2.0 (2B is too big for the Vercel budget), UniversalNER
(non-commercial), SmolLM2 (English-only), and any plan whose first step is training from scratch.

## Distillation plan

### The dataset is already being collected

`bot/x/answers.ts` writes an `AnswerRecord` per handled mention holding `thread: Post[]`, the `options`
list, `source`, Jev's choice and the probabilities, capped at `MAX_RECORDS = 1_000` with a 30-day TTL on
the per-id keys. GLiNER2's training format is one JSONL line per example:

```jsonl
{"input": "¿qué preferís, el día o la noche?", "output": {"entities": {"option": ["el día", "la noche"]}}}
{"input": "buenas noches a todos", "output": {"entities": {"option": []}}}
```

([format reference](https://github.com/fastino-ai/GLiNER2/blob/main/tutorial/8-train_data.md); empty
entity lists are explicitly valid negatives.) That is *the same shape* as what the bot logs. **Step zero
of this plan is a one-line change to stop throwing the data away.** Raise `MAX_RECORDS`, or add a
periodic dump to blob storage. Every mention answered between now and the training run is a free
gold-ish example, and the conversion is a filter that drops any option not found verbatim in the thread.

### Building the rest

Target **15,000-25,000 examples**, 50/50 English and Spanish. For reference, GLiNER2 itself was trained
on 254,334 examples for 5 epochs ([paper §B.1](https://arxiv.org/html/2507.18546v1)); a single-label
fine-tune on top of a pretrained checkpoint needs one to two orders of magnitude less.

Three sources, in descending order of realism:

1. **Real X posts with polls, free ground truth.** X API v2 exposes poll options through
   `?expansions=attachments.poll_ids&poll.fields=options`, where each option carries a `label`
   ([data dictionary](https://docs.x.com/x-api/fundamentals/data-dictionary)). Mine posts with polls,
   keep only the ones where every label appears verbatim in the post text, and you have real, noisy,
   correctly-labelled examples in both languages. The ones where labels *do not* appear in the text are
   worth keeping separately, since they are the v2 (world-knowledge) test set. Budget for X's pay-per-use
   billing; this is the one data source with a real cost.
2. **Teacher labelling of real threads.** Run a stronger model than production DeepSeek over mined
   threads. On the AI Gateway, 20,000 examples at ~1,000 in / ~60 out tokens costs
   **$1.48 with `openai/gpt-5-nano`** ($0.05/$0.40), **$3.72 with `deepseek-v4.1-flash`**,
   **$13.60 with `google/gemini-3-flash`** ($0.50/$3.00) or **$26 with `anthropic/claude-haiku-4.5`**
   ([gateway model prices](https://vercel.com/ai-gateway/models)). Use two teachers and keep only
   examples where they agree, then hand-check a few hundred; the disagreements are the interesting cases.
   The GLiNER repo ships a
   [synthetic data generation notebook](https://github.com/urchade/GLiNER/blob/main/examples/synthetic_data_generation.ipynb)
   for exactly this loop.
3. **Templated synthesis for the noise budget.** Generate the cases the wild will not supply evenly:
   lettered and numbered labels (`A)`, `1.`, `a-`), emoji-separated lists, flag-prefixed name lists,
   `@handle` and `t.co` noise, hashtags, line breaks, mixed EN/ES in one thread, three- and four-way
   disjunctions, and, most importantly, **30-40% negatives** that must yield `[]` (greetings, replies,
   statements, questions that need outside knowledge). Negatives are the failure mode most likely to
   embarrass the bot, and templates are the only cheap way to get enough of them.

Four published datasets can seed the work without replacing it. All are English, so they only help the
English half:

| Dataset | What it gives | Licence | Link |
| --- | --- | --- | --- |
| **Webis Comparative Questions 2022** | **the nearest published relative**: 3,500 comparative questions labelled *at token level* with their comparison objects, so "Which is better, X or Y?" → `[X, Y]` | not stated | [Zenodo](https://zenodo.org/records/7213397) · [repo](https://github.com/webis-de/WSDM-22) |
| **MIMICS** (CIKM 2020) | 450K+ Bing queries, each with a clarifying question and **up to five candidate answers**, the same schema as ours | MIT | [paper](https://arxiv.org/abs/2006.10174) · [repo](https://github.com/microsoft/MIMICS) |
| **MultiSpanQA** | BIO-tagged multi-span answers with a `Conjunction` structure class isolating the coordinated cases | CC BY-SA 4.0 | [leaderboard](https://multi-span.github.io/) |
| **MASSIVE** | 1M utterances, 51 languages, **parallel EN/ES**, realistic short multilingual utterances, best used as negatives and as templates | not stated | [HF](https://huggingface.co/datasets/AmazonScience/massive) |

Start from Webis Comparative Questions: it is already token-level, already "X or Y", and 3,500 examples
is enough to sanity-check the label format before spending anything on a teacher. Then MIMICS for the
list-of-candidates pattern. None of them is this task and none has a Spanish half, so treat them as input
distribution and format templates, not as labels.

### Which base to fine-tune, and why

**Recommendation: `fastino/gliner2.5-multi-v1`, full fine-tune (or LoRA) on a single `option` label.**

The reasoning, against the two alternatives:

- **vs. a bare encoder token-classifier** (mDeBERTa-v3-base + BIO tags). Same backbone, same inference
  cost, but you throw away the span-extraction pretraining and the label-description mechanism, and you
  give up the option of re-prompting with a second label later without retraining. Take the head start.
- **vs. a small decoder with LoRA** (Qwen3-0.6B, Gemma 3 270M). A decoder has to *generate* text that
  you then have to verify is a substring, reintroducing exactly the hallucination the span model
  eliminates. It is 2-5x the parameters, needs a grammar or schema at decode time, and its latency scales
  with the number of options. The only thing it buys is v2's world knowledge, which is out of scope.
- **vs. seq2seq** (mT5/ByT5/T5Gemma 2). Same generation objection, plus mT5 and ByT5 are not
  instruction-tuned so you are training the output format from scratch. ByT5 is the one I would revisit
  *if and only if* the eval shows tokenizer damage from emoji and accents is the dominant error mode.
  Its noise-robustness numbers are strong, at 1.5-2.6x the inference cost.

Hyperparameters to start from, taken from GLiNER2's own paper: AdamW, 5 epochs, lr 1e-5 for the encoder
backbone and 2e-5 for the task layers, weight decay 0.01, gradient clipping 1.0, 1,000 warmup steps
([Table 5](https://arxiv.org/html/2507.18546v1)). GLiNER v1's config suggests the same shape
(`lr_encoder: 1e-5`, `lr_others: 5e-5`, batch 8, cosine schedule,
[training docs](https://urchade.github.io/GLiNER/training.html)).

### Compute and dollars

20,000 examples x 3 epochs at batch 16 is ~3,750 optimizer steps on a 287M encoder with 512-token
inputs. At a conservative 3 steps/second that is **~0.35 GPU-hours**; the run is small enough that
data prep will dominate the wall clock.

| Where | GPU | $/hr (checked 2026-09-22) | One run | 5 iterations |
| --- | --- | --- | --- | --- |
| Google Colab free | T4 | $0 | $0 | $0 |
| [Vast.ai](https://vast.ai/pricing) | L4 (30-day median) | ~$0.25 | ~$0.09 | ~$0.45 |
| [RunPod](https://www.runpod.io/pricing) Community | L4 24GB | $0.44 | ~$0.15 | ~$0.77 |
| [Modal](https://modal.com/pricing) | L4 | $0.80 (from $0.000222/s) | ~$0.28 | ~$1.40 |
| [Modal](https://modal.com/pricing) | A100 40GB | $2.10 (from $0.000583/s) | ~$0.27 | ~$1.35 |
| [Lambda](https://lambda.ai/pricing) | A10 24GB | $1.29 | ~$0.35 | ~$1.75 |

**Total for the whole distillation path: roughly $5 to $40.** Teacher labelling costs $1.50 to $26, the
GPU under $2 for several runs, plus whatever X charges for mining. The GPU is not the cost. The teacher
is, and the teacher is cheap. Modal's Starter plan also includes [$30 of free compute per month](https://modal.com/pricing),
and GLiNER ships a [fine-tuning Colab](https://colab.research.google.com/drive/1HNKd74cmfS9tGvWrKeIjSxBt01QQS7bq)
that runs on the free T4, so the realistic GPU spend is $0.

Do not use a managed fine-tuning service for this. [Together's](https://www.together.ai/pricing)
SFT is $0.34-0.38 per 1M tokens for the 0.8B-9B bucket with a **$4.00 job minimum**, which is more than
the raw GPU and only covers models in their catalogue. GLiNER is not one.

### Local hardware, on the Mac

A 287M encoder fine-tune is within reach of an Apple Silicon machine, but with caveats. GLiNER2 is
PyTorch, so that means the **MPS** backend, and HF's own guidance is blunt: "MPS doesn't support all
PyTorch operations yet" (set `PYTORCH_ENABLE_MPS_FALLBACK=1`), the whole model must fit in unified
memory because `device_map="auto"` cannot offload, and variable-length inputs grow the graph cache "on
every new shape and can eventually exhaust unified memory"
([perf_train_special](https://github.com/huggingface/transformers/blob/main/docs/source/en/perf_train_special.md)).
The last point bites here specifically, because thread lengths vary a lot. Pad to a fixed 512 to avoid
it.

**MLX is not an option for this model.** `mlx-lm` does support LoRA and QLoRA
([LORA.md](https://github.com/ml-explore/mlx-lm/blob/main/mlx_lm/LORA.md)), but it targets decoder LLM
families (Mistral, Llama, Phi-2, Mixtral, Qwen2, Gemma, OLMo), not GLiNER's custom span head. MLX only
enters the picture if recommendation #4 (Qwen3-0.6B + LoRA) is taken.

Practical answer: run the zero-shot evaluation and dataset prep on the Mac, and do the actual training
run on a free Colab T4 or a $0.15 RunPod L4. At these prices, fighting MPS is the expensive option.

### Evaluation

- **Primary metric: exact-set match.** The predicted set of options, lowercased and NFC-normalised,
  equals the gold set. This is the metric that matches what the bot does, because Jev is handed the whole
  set and `answer/question.ts` keys options by their lowercase form. Report it separately for the
  positive cases and for the `[]` cases; a model that never returns `[]` can still look decent on a mixed
  average.
- **Secondary: span-level precision/recall/F1**, to see whether failures are boundary drift (fixable by
  post-processing) or missing options (not).
- **Tertiary: literalness rate.** The fraction of returned options that are verbatim substrings of the
  thread. Should be 1.00 for a span model by construction; run it anyway, it catches bugs, and run it on
  DeepSeek's logged output to quantify today's hallucination rate.
- **Held-out set: 500-1,000 threads**, hand-checked, stratified: ~40% Spanish, ~40% English, ~20% mixed
  or other; ~35% negatives; and at least 50 each of the lettered-MCQ, emoji-list and multi-word-phrase
  patterns. Hand-check it. A teacher-labelled test set measures agreement with the teacher, not quality.
- **Baselines to beat, in order:** the rule-based splitter, `answer/words.ts` (today's fallback), and
  `deepseek-v4.1-flash` with the current `INSTRUCTIONS` prompt. Run all four through the same harness.
  The honest success criterion is "matches DeepSeek's exact-set match within a point or two, at 1/20th the
  latency, with literalness at 1.00", not "beats DeepSeek".
- **End-to-end check:** the metric that actually matters is whether the bot's *reply* changes. Replay
  logged threads through `answerThread` with each extractor and diff the final replies; option-set
  differences that Jev resolves to the same answer are noise.

## Serving it cheaply

### Can a transformer run inside a Vercel function? Yes, now.

This changed recently and it is the single most useful fact in this note. The standard Vercel Function
bundle limit is **250 MB uncompressed**, which is not enough. The `onnxruntime-node` npm tarball alone
unpacks to **~301 MB** ([registry](https://registry.npmjs.org/onnxruntime-node/latest), v1.30.0) before
any weights. But **Large Functions (Beta) raise that to 5 GB**, and Vercel's own wording is
["Use them for workloads that ship large dependencies, model files, or binaries"](https://vercel.com/docs/functions/limitations#large-functions-beta).

The conditions, verbatim from that page:

- Large functions **require Fluid compute with Active CPU**; Fluid is
  [default for new projects since 2025-04-23](https://vercel.com/docs/fluid-compute).
- Existing projects opt in with the `VERCEL_SUPPORT_LARGE_FUNCTIONS=1` environment variable.
- Supported on `nodejs`, `bun` and `python`. Not supported with Secure Compute or Static IPs.
- Only functions exceeding the standard limit take the large path; everything else is unaffected.

Other limits that matter: **Hobby is 2 GB / 1 vCPU and cannot be changed**; Pro can go to 4 GB / 2 vCPU
([memory limits](https://vercel.com/docs/functions/limitations#memory-size-limits)). Max duration is
300 s on Hobby, far more than needed. Since this is a Next.js app, `includeFiles` in `vercel.json` does
**not** apply; use
[`outputFileTracingIncludes`](https://nextjs.org/docs/app/api-reference/config/next-config-js/output),
whose own documented example is shipping native binaries
(`node_modules/sharp/**/*`, `node_modules/aws-crt/dist/bin/**/*`).

The **Edge runtime is not an option**: 1 MB gzipped on Hobby, 2 MB on Pro, no filesystem, and
`WebAssembly.compile` from a buffer is disabled
([edge limits](https://vercel.com/docs/functions/runtimes/edge#code-size-limit)).

So the realistic in-app path is: export the fine-tuned model to ONNX, quantise to INT8, ship it with
`@huggingface/transformers` (Transformers.js v3, which runs server-side in Node on `onnxruntime-node`
and lists `token-classification` among its tasks, [docs](https://huggingface.co/docs/transformers.js/en/index)),
inside a large function.

**The real cost is the cold start, not the bundle.** A 170-350 MB model has to be read and the ONNX
session initialised on every cold container. Vercel publishes no number for this; it has to be measured.
Mitigations: Fluid keeps containers warm between invocations, and X mention traffic is bursty, so the
first mention of a quiet period pays and the rest do not. If measured cold starts are bad, the bot's
existing DeepSeek path is a good fallback. Keep both and choose by a flag.

Two wrinkles for the GLiNER path specifically:

- **GLiNER is not a stock `token-classification` head.** It has a custom span-scoring architecture, so
  Transformers.js will not just run it from a pipeline. The pre/post-processing has to be ported, which
  is what [`Knowledgator/GLiNER.js`](https://github.com/Knowledgator/GLiNER.js) (npm `gliner`, MIT) did.
  But that package is at **0.0.19, last published 2025-03-02**, and pins the deprecated
  `@xenova/transformers@2.17.2` plus `onnxruntime-web` (WASM, slower than `onnxruntime-node`). Budget
  for either forking it or writing the ~100 lines of span decoding against `@huggingface/transformers`.
- **INT8 on DeBERTa backbones loses accuracy.** GLiNER's own docs: int8 is "intended for models
  fine-tuned with quantization-aware training (QAT); stock DeBERTa-based models lose accuracy with int8"
  ([usage docs](https://urchade.github.io/GLiNER/usage.html)). Measure INT8 against fp16 on the held-out
  set before shipping it; `gliner-x-small`'s mT5 encoder may fare better than the DeBERTa ones.

### Export and quantisation

```bash
pip install "optimum[onnx]"
optimum-cli export onnx --model ./my-finetuned-gliner --task token-classification out/
optimum-cli onnxruntime quantize --onnx_model out/ --avx512_vnni -o out-int8/
```

ONNX Runtime's guidance is that **dynamic** quantization is the right choice for transformers ("it is
recommended to use dynamic quantization for RNNs and transformer-based models"), S8S8 with QDQ is the
default, and `reduce_range` is unnecessary on VNNI hardware
([ORT quantization docs](https://onnxruntime.ai/docs/performance/model-optimizations/quantization.html),
[Optimum export](https://huggingface.co/docs/optimum/en/exporters/onnx/usage_guides/export_a_model),
[Optimum quantization](https://huggingface.co/docs/optimum/en/onnxruntime/usage_guides/quantization)).

### CPU latency: what is actually published

No one publishes a CPU latency number for GLiNER-class **entity extraction**. The nearest primary
sources:

| Source | Hardware | Setup | Number |
| --- | --- | --- | --- |
| [GLiNER2 paper, Table 4](https://arxiv.org/html/2507.18546v1) | "CPU", unspecified | text *classification*, 5 to 50 labels | **130 ms at 5 labels, 208 ms at 50**; 2.62x faster than the GPT-4o API (358-463 ms) |
| [HF Optimum blog, 2022](https://huggingface.co/blog/optimum-inference) | AWS m5.xlarge, 2 physical cores | RoBERTa-base QA, seq 128, batch 1 | 117.6 ms fp32 ONNX down to **64.9 ms** optimised INT8 (1.81x), F1 82.15 down to 81.83 |
| [HF Infinity case study, 2022](https://huggingface.co/blog/infinity-cpu-performance) | AWS c6i (Ice Lake), 2 cores, batch 1 | DistilBERT classification, end to end | seq 32: **7-13 ms**; seq 64: 10-18 ms |
| [Microsoft ORT blog, 2021](https://opensource.microsoft.com/blog/2021/03/01/optimizing-bert-model-for-intel-cpu-cores-using-onnx-runtime-default-execution-provider/) | 11th-gen Intel Core, VNNI | BERT-12 / DistilBERT INT8 | "up to 2.9x" / "up to 3.3x", **ratios only, no absolute ms** |

All of those are vendor benchmarks on hardware that is not a Vercel function, and the 2021-2022 ones are
four years old. Treat **200-800 ms on 1 vCPU** as the planning assumption for a 287M encoder on a
~150-token thread, and measure before believing it.

### If it does not fit in the function

| Option | Price (checked 2026-09-22) | Verdict |
| --- | --- | --- |
| [Modal](https://modal.com/pricing) | CPU $0.047/core-hr, memory $0.0080/GiB-hr, [~1 s container boot](https://modal.com/docs/guide/cold-start), 60 s default scaledown, $30/mo free on Starter | **Best off-Vercel option.** Scale-to-zero that actually works, and the free tier covers this bot outright. |
| [HF Inference Endpoints](https://huggingface.co/docs/inference-endpoints/en/pricing) | CPU from **$0.033/hr** (1 vCPU / 2 GB, aws intel-spr x1); billed by the minute | Cheap, but their own docs warn scale-up "can take a few minutes... scaling from 0 to 1 based on a request is typically not recommended if your application needs to be responsive", and idle-to-zero defaults to 1 hour. Would mean running it always-on at ~$24/month, more than the API it replaces. |
| [Replicate](https://replicate.com/pricing) | CPU $0.000025-0.0001/s ($0.09-$0.36/hr) | Private models bill setup **and idle** time, and cold boots "can take several minutes". Wrong shape for bursty low traffic. |
| Always-on box | [Hetzner CX23](https://www.hetzner.com/cloud/cost-optimized/) €5.99/mo (2 vCPU, 4 GB); [Fly.io](https://fly.io/docs/about/pricing/) shared-cpu-1x 2 GB $11.11/mo; [Render](https://render.com/pricing) 2 GB $25/mo | Costs more per year than the DeepSeek calls at anything under ~1,000 mentions/day. Only worth it for the latency guarantee. |

Note the Hetzner caveat: the cost-optimized CX/CAX line was showing a "not available" badge on
2026-09-22; the CPX line (CPX12, 2 GB, €11.99/mo) was orderable.

## Open questions and risks

- **The premise may not survive contact.** Nobody has run any of this against the five target cases. The
  zero-shot GLiNER numbers quoted here are for NER and classification, not for "which options is this
  question offering". The first measurement could show a large gap that only the fine-tune closes, or
  that the rule-based splitter closes for free.
- **Empty-list detection is the weak point.** A span model has no natural way to say "this asks nothing".
  This is the failure that would make the bot reply to threads it should ignore. It needs deliberate
  negative sampling and a tuned threshold, and it deserves its own metric.
- **Multi-word non-entity phrases** (`team invierno`, `el día`) are out of distribution for NER
  pretraining in a way that person names are not. Expect the article/determiner boundary to be the most
  common error.
- **Spanish evidence is indirect.** `gliner2.5-multi-v1` is built on mDeBERTa-v3-base, whose card lists
  `es`, but the GLiNER2 paper's training data is described as English sources (law, PubMed, Wikipedia,
  arXiv, news) and **the model card publishes no per-language benchmark and no explicit language list**
  beyond the tag `multilingual`. The older `urchade/gliner_multi-v2.1` is the same story: trained on the
  English Pile-NER set, so its multilingual ability is cross-lingual transfer from the backbone, and
  Spanish is not named on its card either. `gliner-x-small` *does* name Spanish, but its benchmark table
  has Danish, German, English, Portuguese, Swedish and Chinese, with **no Spanish row**. I could not
  find a primary source measuring any of these on Spanish. If the eval exposes a Spanish gap, the domain-specific
  fallback is [`pysentimiento/robertuito-base-uncased`](https://huggingface.co/pysentimiento/robertuito-base-uncased)
  (109M, Spanish Twitter, MIT in its source repo though the HF card declares no licence) as a BIO-tagger
  backbone, trained on the exact register the bot sees.
- **The `gliner2.5-multi-v1` card contradicts itself on size**, claiming "~594 MB (FP16)" while the
  repository's `model.safetensors` is 1,149,461,028 bytes of F32. The 594 MB figure is what FP16 *would*
  be; the download is twice that.
- **GLiNER2's CPU latency table measures classification, not extraction**, and does not name the
  hardware. I found no primary extraction-latency number for any GLiNER model.
- **"Option extraction" is an unclaimed academic gap, and that cuts both ways.** There is no dataset,
  benchmark or paper for poll-option extraction or MCQ option parsing; HF searches for `option-extraction`
  and `poll-option` return empty; the Twitter-poll literature reads the API's structured poll object and
  never parses options from text. There is no dataset for parsing alternative/disjunctive questions in any
  language. The nearest work, [Funakura & Mineshima (PACLIC 2023)](https://arxiv.org/abs/2312.14737),
  covers polar and wh-questions only, and [Cruz-Blandón et al. (LAW XIII 2019)](https://arxiv.org/abs/1908.09921)
  names disjunctive questions as a class in an EN/ES/NL annotation scheme but publishes no corpus URL I
  could find. Coordination-boundary extraction is a mature line of work
  ([CoRec, EMNLP 2023](https://aclanthology.org/2023.emnlp-main.934/) is the best starting point, no
  syntactic parser needed) but every system is evaluated on PTB/OntoNotes/GENIA, i.e. **English only**,
  and CoRec's own limitations section says it "works mostly for languages with limited morphology, like
  English". The upside: there is nothing to be beaten by. The downside: no off-the-shelf number will tell
  you whether a model is good at this. Only your own eval set will, so build it first.
- **Models are known to be worse at disjunction than conjunction.** [CARETS](https://arxiv.org/abs/2203.07613)
  reports LXMERT at 81% on conjunctive questions versus **62% on disjunctive** ones. That is a different
  modality and an old model, but it is the only quantified signal I found that "A or B" is specifically
  hard, and "A or B" is the single most common shape of the bot's input.
- **`onnxruntime-node`'s ~301 MB is the multi-platform tarball.** The Linux-x64-only footprint inside a
  Vercel function will be smaller, but Vercel publishes nothing about ML native addons, and the ~301 MB
  is the number to design around until measured.
- **Vercel Large Functions are Beta.** The 5 GB limit, the `VERCEL_SUPPORT_LARGE_FUNCTIONS` opt-in and
  the Fluid/Active-CPU requirement could all change. Keep the DeepSeek path behind a flag.
- **Replicate does not publish how training jobs are billed.** Neither its pricing nor its billing page
  says it. Vast.ai has no list price at all (marketplace, host-set, per-second), so every Vast number
  here is a snapshot, not a quote.
- **Cold-start cost is unmeasured and could dominate.** Everything above assumes the model is loaded.
  For a bot that may go hours between mentions, the load time may be the whole latency story.
- **v2 (world knowledge) will not reuse this model.** "Which day of the week?" → all seven days is a
  generation task. If v2 is close, some of the span-model investment is throwaway. Worth deciding now
  rather than after the fine-tune.
