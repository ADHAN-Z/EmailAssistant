# Email Extraction Evaluation

This folder helps validate CV claims such as:

- Processed 1000+ emails
- 90% task extraction accuracy

## 1) Create a labeled dataset

Copy the template and fill it with manually labeled emails:

- Source template: `evaluation/email-extraction-dataset.example.json`
- Working dataset: `evaluation/email-extraction-dataset.json`

Each row must include:

- `id`: unique id
- `emailContent`: full email body (subject + content)
- `expected.isActionable`: whether the email should produce actionable tasks
- `expected.taskTitles`: expected task titles (one or many)

## 2) Run the evaluator

Set `OPENAI_API_KEY`, then run:

```bash
npm run eval:email-extraction
```

You can point to another dataset with:

```bash
EVAL_DATASET_PATH=./evaluation/my-dataset.json npm run eval:email-extraction
```

## 3) Read the generated report

Reports are written to:

- `artifacts/evaluation/email-extraction-report-latest.json`
- `artifacts/evaluation/email-extraction-report-<timestamp>.json`

Main metrics:

- Actionable classification: accuracy, precision, recall, F1
- Task extraction: extractionAccuracy, precision, recall, F1

### Metric definitions

- Actionable accuracy:
  - `(TP + TN) / (TP + TN + FP + FN)`
- Task extraction accuracy:
  - `matched expected task titles / total expected task titles`

## 4) For your CV statement

To support "1000+ emails with 90% task extraction accuracy":

1. Use logs or DB evidence to prove total processed emails >= 1000.
2. Use this evaluator report to prove extraction accuracy >= 0.90 on a labeled set.
3. Keep a dated report artifact for auditability.
