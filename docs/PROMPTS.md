# TalentLens AI — Prompt File

Repository: <https://github.com/rathna070-ai/HR_-AI-Assistance_with-Rag> (private)

This file contains:

1. **Development prompts** — every instruction given to the AI coding assistant (Claude Code) while building this project, in order, copied from the session transcripts.
2. **Runtime LLM prompts** — the system prompts the application itself sends to the Groq LLM, copied from the source code.
3. **Generated prompt** — the batch-ingestion prompt written during the project.

Notes on the development prompts:

- Text is verbatim, including typos. API keys are redacted (`gsk_****[redacted]`).
- Long pasted API responses, index JSON and resume text are replaced by a one-line note, so no candidate data is reproduced here.
- Editor notifications (which file was open) are removed. Repeated identical prompts are listed once.
- The phase-wise instruction documents referenced by several prompts (ingestion, retrieval and frontend phase guides) were supplied as files; their content is reflected in `Resume_Ingestion_Architecture_Phasewise.md` and `docs/TalentLens_AI_Phasewise_Implementation.pdf`.

---

## 1. Development prompts

### Ingestion pipeline — Phases 1–4 (upload, extraction, cleaning)

*2026-09-27*

**1.** `2026-09-27 05:39 UTC`

> start implement phase by phase .
> one phase at a time should be implemented and after implemented one phase i am expecting the request body and expected 
> response to test  in postman
> 
> Once I tested in postman ,after my approval ,proceed for next phase 
> 
> [STRICT] DO NOT PROCEED TO NEXT PHASE UNTIL I APPROVE 
> [STRICT]DO NOT HALLUCINATE AND GO WITH THE PHASE WISE IMPLEMENTATION FILE ALONE"

**2.** `2026-09-27 05:51 UTC`

hot can i test in post man give me steps

**3.** `2026-09-27 05:55 UTC`

proceed with phase 2

**4.** `2026-09-27 06:02 UTC`

getting 

> {
>     "success": false,
>     "message": "Unexpected field. Send the PDF in form-data field 'file'"
> }

 this error refer screenshot attached

**5.** `2026-09-27 06:05 UTC`

> {
>     "success": false,
>     "message": "Only PDF allowed"
> }

 getting this error even when pfdf is uploaded

**6.** `2026-09-27 06:05 UTC`

now its successfule 

> {
>     "success": true,
>     "message": "Resume uploaded successfully",
>     "data": {
>         "fileName": "Vidya QA Resume (1).pdf",
>         "storedFileName": "1790489133871-959537077-Vidya_QA_Resume__1_.pdf",
>         "filePath": "D:\\workspace\\hr app agent\\uploads\\1790489133871-959537077-Vidya_QA_Resume__1_.pdf",
>         "mimeType": "application/octet-stream",
>         "size": 112792
>     }

**7.** `2026-09-27 06:11 UTC`

phase 3 proceed

**8.** `2026-09-27 06:12 UTC`

groqe api key  gsk_****[redacted]

**9.** `2026-09-27 06:13 UTC`

> *[pasted JSON (API response / index definition), 5,296 characters — omitted]*

**10.** `2026-09-27 06:14 UTC`

Phase 4: text cleaning. proceed

**11.** `2026-09-27 06:21 UTC`

u ttest and tell me in post man

### Ingestion pipeline — next phases

*2026-09-29*

**12.** `2026-09-29 09:49 UTC`

implement the next 5 phases and let me know

**13.** `2026-09-29 09:49 UTC`

implement the next 5 phases and let me know for the hr app agent

**14.** `2026-09-29 11:28 UTC`

whaat is pending now

### Batch ingestion and ingestion Phases 14–16

*2026-09-29 – 2026-10-01*

**15.** `2026-09-29 11:31 UTC`

1. Add the resume folder containing the resume files to the existing workspace.2.  write a prompt to implement a batch ingestion workflow for resumes.
3. Configure the workflow to process resumes in batches of 5 or 10 files per run.
4. Validate the ingestion process by testing multiple batches and verifying that all resumes are successfully ingested.

**16.** `2026-09-30 05:39 UTC`

in the bulk injustion implamented  how can i test it give me steps

**17.** `2026-09-30 06:12 UTC`

hoe to test via  api postman

**18.** `2026-09-30 06:18 UTC`

how to run the whole remume folder for in jestion

**19.** `2026-09-30 06:19 UTC`

how to injest 5 file in a batch in a folder show steps

**20.** `2026-09-30 07:20 UTC`

command  git bash to idebntifiy changed files and push ?

**21.** `2026-10-01 05:30 UTC`

implement till phase 16

**22.** `2026-10-01 05:41 UTC`

what are the remaining phases and what the complete once

**23.** `2026-10-01 05:41 UTC`

implement Phase 14–16 sections in the architecture doc;

**24.** `2026-10-01 05:42 UTC`

implamen tit

**25.** `2026-10-01 05:48 UTC`

impleement it

**26.** `2026-10-01 05:50 UTC`

restart server

**27.** `2026-10-01 05:52 UTC`

so far what is implemented and and how to test it via post man api

### Documentation and questions

*2026-10-03*

**28.** `2026-10-03 03:13 UTC`

tell me how the multiple file ingestion was implemented in detailed explain the step by step process in a flow and picture represention in a .md file

**29.** `2026-10-03 03:57 UTC`

in which collection the resume is ingeusted and stored in mango db

**30.** `2026-10-03 04:02 UTC`

what is query embedding

### Retrieval pipeline — Phases 1–18, Postman collections, GitHub

*2026-10-03*

**31.** `2026-10-03 04:31 UTC`

> "Analyze my existing workspace and I have completed ingestion pipeline already and implement the retrieval pipeline phase by phase
> one phase at a time and after I approve proceed for next phase
> 
> [STRICT] DO NOT HALLUCINATE AND DONT PROCEED TO NEXT PHASE UNTIL I APPROVE
> 
> After implementing each phase i am expecting request body ,response body to test in postman."

also here is the index from db Vector index: resume_vector and Bm25 index: 	
resume_bm25

**32.** `2026-10-03 04:35 UTC`

implement till phase 5 and show me the list of all issues that are open and need fixinfg [STRICT] DO NOT HALLUCINATE AND DONT PROCEED TO PHASE 6 UNTIL I APPROVE

**33.** `2026-10-03 04:38 UTC`

show me the correct BM25 json that need to be in the index for  mango db'

**34.** `2026-10-03 04:39 UTC`

show in json like this 

> *[pasted JSON (API response / index definition), 1,979 characters — omitted]*

**35.** `2026-10-03 04:40 UTC`

is the above bm25 json the correct without any missmatched ?

**36.** `2026-10-03 04:41 UTC`

check the retrival archicture.md file as well and give the correct json for the bm 25 index

**37.** `2026-10-03 04:42 UTC`

make sure both ore in sync

**38.** `2026-10-03 04:45 UTC`

approved and add the vector index and bm25 index in env files

**39.** `2026-10-03 04:49 UTC`

groq api key: gsk_****[redacted]

**40.** `2026-10-03 04:50 UTC`

what are remaiing phased and what are completed what u want from me

**41.** `2026-10-03 04:51 UTC`

llm model :openai/gpt-oss-120b approved for phase 6 to 10

**42.** `2026-10-03 04:59 UTC`

list  all the issue in a table with issue, impactt and fix  also showw steps how to test the retrival implementer so far in api

**43.** `2026-10-03 05:01 UTC`

for issie one showw the correct json that  need to be added to the bm25 in mango db

**44.** `2026-10-03 05:04 UTC`

fix all the bbelow 

> 4	Missing parsed fields: name null in 39 resumes, totalExperience in 39, company in 35, role in 21	Results show null names, and every experience filter leaves out the 39 resumes without experience	Improve the algorithm parser, or switch ingestion to the LLM parser (USE_LLM_PARSER=true) and re-ingest
> 20	Wrong parsed names, e.g. "Mtititititi Ktitititi" and "Opentext LoadRunner"	Wrong names in results and in LLM summaries	Same as #4
> 5	13 scanned PDFs and 19 .doc/.docx files can't be ingested	32 candidates can never be found	Add OCR for scanned PDFs and a Word text extractor
> 21	Few AI-focused resumes in your data (top vector score about 0.82, compared with about 0.90 for QA queries)	The doc's example queries return weak matches	Not a code fix: add relevant resumes, or test with QA-type queries
> 3	The doc's expected candidate "Rajesh Mohan Kumar" never appeared in results	The Phase 18 end-to-end check can't pass as written	Check whether that resume is in resumes/. If not, ingest it or change the test to a candidate you have

**45.** `2026-10-03 05:17 UTC`

now show how to check in api

**46.** `2026-10-03 05:19 UTC`

now show how to check in postman api in table phase to check, request link, request body and sample response

**47.** `2026-10-03 05:24 UTC`

now show how to check in postman api in table phase to check, request link, request body

**48.** `2026-10-03 05:26 UTC`

instead of base url give http://localhost:3000. and show the request detail ad if its get ot post too

**49.** `2026-10-03 05:27 UTC`

create a  postman collection  in down;oadablkww that i can import in post man and check this

**50.** `2026-10-03 05:37 UTC`

what are the pending phases

**51.** `2026-10-03 05:38 UTC`

implement all thhe rwemaining phases and update the postman collection to veriy the same also list the issues along with fix

**52.** `2026-10-03 05:41 UTC`

here is the groque key from different account wher the token linkit is fully avaliable gsk_****[redacted]

**53.** `2026-10-03 05:43 UTC`

here is the groque key from different account wher the token linkit is fully avaliable gsk_****[redacted]

use the above api ky for llm fall back

now proceed with implementing all the remaiingphase and updating the post man collection to check

**54.** `2026-10-03 05:56 UTC`

push and commit to this git hub repo https://github.com/rathna070-ai/HR_-AI-Assistance_with-Rag

**55.** `2026-10-03 05:58 UTC`

I'll check what would be published: real candidate names, emails or phone numbers from your resumes must not end up in a public repo. need not chech this

**56.** `2026-10-03 06:01 UTC`

create a sepreate post collection for verifyinfg ingestion and sepreate one for retrival phase wise mased on their respective.md file and remove all the other irrellvent collections

**57.** `2026-10-03 06:07 UTC`

give the correct json with sample resume ids 

> {
>   "query": "Senior QA automation engineer with Selenium, Java and API testing",
>   "candidates": [
>     { "resumeId": "{{resumeId1}}", "snippet": "Automation tester with Selenium, Java, TestNG and RestAssured API testing, 5 years" },
>     { "resumeId": "{{resumeId2}}", "snippet": "Manual tester, 2 years, functional and regression testing" }
>   ],
>   "topK": 10
> }

**58.** `2026-10-03 06:08 UTC`

genertae the josn in the above formate with resume id and give

### Repository visibility and push

*2026-10-03 – 2026-10-04*

**59.** `2026-10-03 06:19 UTC`

change the repo to private from public

**60.** `2026-10-04 03:39 UTC`

push to github

**61.** `2026-10-04 04:01 UTC`

made this repo to private now push to git hub

### Frontend web app — Phases 1–15

*2026-10-04*

**62.** `2026-10-04 04:21 UTC`

> one phase at a time and after I approve proceed for next phase
> 
> [STRICT] DO NOT HALLUCINATE AND DONT PROCEED TO NEXT PHASE UNTIL I APPROVE

**63.** `2026-10-04 04:28 UTC`

implement all the phases and let me know

**64.** `2026-10-04 05:22 UTC`

which phase are we in how much commpleted how much pending show in table format

**65.** `2026-10-04 05:24 UTC`

complete the pending items

**66.** `2026-10-04 05:37 UTC`

push all to git

**67.** `2026-10-04 05:39 UTC`

add a permission rule to allow git push in your Claude Code settings (for example via /permissions), how to do this

**68.** `2026-10-04 05:40 UTC`

> {
>   "permissions": {
>     "allow": [
>       "Bash(git push:*)"
>     ]
>   }
> }

create and so this D:\workspace\hr app agent\.claude\settings.local.json

**69.** `2026-10-04 05:42 UTC`

now push to git

### Rebrand to TalentLens AI and UX changes

*2026-10-04*

**70.** `2026-10-04 05:45 UTC`

change name to TalentLens AI adding the logo as well is attached here the font and color detauls 

> | Purpose | Color | Hex |
> |---|---|---|
> | **Primary** | Deep Navy | `#0B1F3A` |
> | **Primary Accent** | Electric Blue | `#2563EB` |
> | **AI Accent** | Indigo/Purple | `#6366F1` |
> | **Success / Match** | Emerald | `#10B981` |
> | **Background** | Soft Blue-White | `#F8FAFC` |
> | **Cards** | White | `#FFFFFF` |
> | **Main Text** | Slate | `#0F172A` |
> | **Secondary Text** | Gray | `#64748B` |
> | **Borders** | Light Slate | `#E2E8F0` |

**71.** `2026-10-04 06:01 UTC`

restart both front and backend servers

**72.** `2026-10-04 06:07 UTC`

add a read me on how to use this and how it works link new the app name at the bottom. also move the clear chat buttom near the send icon  and also increase the size of the search type on the top right corner and highlight in blue

**73.** `2026-10-04 06:13 UTC`

yes

**74.** `2026-10-04 06:22 UTC`

> A form field element should have an id or name attribute
> A form field element has neither an id nor a name attribute. This might stop the browser from correctly autofilling the form.
> 
> To fix this issue, add a unique id or name attribute to a form field. This isn’t strictly needed, but still recommended even if you have an autocomplete attribute on the same element.
> 
> 1 resource
> Violating node

 fis this console issue

**75.** `2026-10-04 06:38 UTC`

restart the server

### AI Search enhancements (re-ranking, de-duplication, summaries)

*2026-10-07*

**76.** `2026-10-07 03:39 UTC`

plan for these 

> Enhance the existing Resume RAG application by implementing the following features:
> 
> 
> - Re-ranking of retrieved resumes
> - Deduplication of repeated results
> - Summarization of the final results
> - Complete end-to-end pipeline integration
> - Display all relevant results clearly on the UI

- Responsive design
- Loading, success, validation, and error messages

**77.** `2026-10-07 03:43 UTC`

update the archicture.md file with the updated details

**78.** `2026-10-07 03:47 UTC`

now implement it

**79.** `2026-10-07 04:22 UTC`

push changes to git and restart servers

### Submission deliverables

*2026-10-07*

**80.** `2026-10-07 06:00 UTC`

generate the below for this repo
- Phase-wise implementation file in pdf formate
- Prompt file in .md format
- Screenshots of the application each search with results and ingestion os sample resumea and screenshot of other featureas with details discription for each screebbhot and final results in pdf formate
- GitHub repository link

---

## 2. Runtime LLM prompts (used by the application)

All calls go to Groq chat completions (`GROQ_MODEL`, default `openai/gpt-oss-120b`) with temperature 0 and `reasoning_effort: "low"`; `GROQ_API_KEY_FALLBACK` is used when the primary key is rate-limited. The user message is JSON built from the data shown under each prompt.

### 2.1 Resume parsing (ingestion) — `src/services/LLMResumeParser.ts` (prompt version 3)

User message: the cleaned resume text. Output: JSON object (`response_format: json_object`).

```text
You extract structured data from resume text.
Reply with one JSON object and nothing else, using exactly these keys:
{
  "isResume": boolean,              // false if the document is not a resume or CV (offer letter, job description, ID card, certificate)
  "name": string | null,            // the candidate's personal name from the resume header; never a tool, company, job title or section heading
  "email": string | null,
  "phone": string | null,           // digits only, without country code
  "location": string | null,        // current city only, e.g. "Chennai"
  "skills": string[],               // technical and professional skills, canonical spelling
  "company": string | null,         // current or most recent employer
  "role": string | null,            // current or most recent job title
  "jobTitles": string[],            // all job titles held, most recent first
  "education": string | null,       // highest degree with specialisation, e.g. "B.E Computer Science"
  "totalExperience": number | null, // total years of work experience, one decimal place; 0 for students and freshers with no work experience
  "experienceSummary": string | null // 1 to 2 sentences summarizing the work experience, using only facts from the resume
}
Use null (or [] for lists) when the resume does not contain the value. Never guess.
Write experienceSummary without gendered pronouns: use the candidate's name or "the candidate", and never infer gender, age or other personal traits.
```

### 2.2 Re-ranking — `src/modules/retrieval/services/LLMService.ts` (`RERANK_PROMPT`)

User message: `{ query, candidates: [{ resumeId, name, role, company, skills, snippet }] }` (snippet = first 600 characters of the resume). Email and phone are never sent.

```text
You rank resume candidates for a recruiter's search query.
Use only the candidate data provided. Do not assume skills or experience that are not stated.
Reply with one JSON object and nothing else:
{
  "results": [
    { "resumeId": string, "relevanceScore": number, "reason": string }
  ]
}
- Order results from best to worst match.
- relevanceScore is between 0 and 1.
- reason is one sentence explaining the match, based only on the candidate data, without gendered pronouns.
- Judge only skills, roles and experience; never use name, gender, age or other personal traits.
- Use only resumeId values from the input. Include each candidate at most once. Never invent candidates.
```

### 2.3 Shortlist summary (AI Search) — `LLMService.ts` (`SHORTLIST_PROMPT`)

Used by `POST /v1/search/summaries`. One call returns the overall summary and one summary per candidate.

```text
You summarize a shortlist of candidates for a recruiter's search query.
Use only the candidate data provided. Never add skills, employers or experience that are not stated.
Refer to candidates by name or as "the candidate", never with gendered pronouns, and do not infer gender, age or other personal traits.
Judge only skills, roles and experience.
Reply with one JSON object and nothing else:
{
  "overall": string,
  "candidates": [ { "resumeId": string, "summary": string } ]
}
- overall: 2 to 4 sentences on who fits the query best and why, and any gaps common to the shortlist. Plain text.
- candidates: one entry per input candidate, 2 to 3 sentences each on how well that candidate fits the query, including gaps. Plain text.
- Use only resumeId values from the input, each at most once. Never invent candidates.
```

### 2.4 Single-candidate fit summary — `LLMService.ts` (`summaryPrompt`)

Used by `POST /v1/search/summarize` and by `POST /v1/search` with `summarize: true`. `${...}` parts are filled from the request:

```text
You summarize how well a candidate fits a recruiter's search query.
Use only the candidate data provided. Never add skills, employers or experience that are not stated.
Refer to the candidate by name or as "the candidate", never with gendered pronouns, and do not infer gender, age or other personal traits.
Write ${SUMMARY_LIMITS[style]}, at most ${Math.floor(maxTokens * 0.75)} words, as plain text without headings or lists.
```

with

```text
short: "2 to 3 sentences",
  detailed: "one paragraph covering strengths, relevant experience and gaps",
```

### 2.5 Metadata extraction — `LLMService.ts` (`METADATA_PROMPT`)

```text
You extract search metadata from resume text.
Reply with one JSON object and nothing else, using exactly these keys:
{
  "jobTitles": string[],              // job titles held, most recent first
  "skills": string[],                 // technical and professional skills, canonical spelling
  "totalExperience": number | null,   // total years of work experience, one decimal place
  "experienceSummary": string | null  // 1 to 2 sentences summarizing the work experience
}
Use null (or []) when the resume does not contain the value. Never guess.
```

---

## 3. Generated prompt

- [`prompts/batch-ingestion-prompt.md`](../prompts/batch-ingestion-prompt.md) — prompt written (development prompt 15) to implement batch ingestion of resumes in batches of 5 or 10. The resulting design is documented in [`Batch_Ingestion_Flow.md`](../Batch_Ingestion_Flow.md).
