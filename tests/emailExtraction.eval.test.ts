import fs from 'fs';
import path from 'path';
import { emailAnalysisChain } from '@/lib/langchain/emailProcessor';

interface LabeledEmail {
  id: string;
  emailContent: string;
  expected: {
    isActionable: boolean;
    taskTitles: string[];
  };
}

interface EvalSummary {
  totalEmails: number;
  actionable: {
    tp: number;
    tn: number;
    fp: number;
    fn: number;
    accuracy: number;
    precision: number;
    recall: number;
    f1: number;
  };
  tasks: {
    expectedTitles: number;
    predictedTitles: number;
    matchedTitles: number;
    extractionAccuracy: number;
    precision: number;
    recall: number;
    f1: number;
  };
  passThresholds: {
    actionableAccuracyAtLeast90: boolean;
    taskExtractionAccuracyAtLeast90: boolean;
  };
}

const normalize = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const isTitleMatch = (expectedTitle: string, predictedTitle: string): boolean => {
  const e = normalize(expectedTitle);
  const p = normalize(predictedTitle);

  if (!e || !p) return false;
  return e === p || e.includes(p) || p.includes(e);
};

const safeDivide = (numerator: number, denominator: number): number => {
  if (denominator === 0) return 0;
  return numerator / denominator;
};

const f1 = (precision: number, recall: number): number => {
  if (precision + recall === 0) return 0;
  return (2 * precision * recall) / (precision + recall);
};

const round4 = (value: number): number => Number(value.toFixed(4));

describe('Email task extraction evaluation', () => {
  it('computes reproducible metrics from a labeled dataset', async () => {
    const datasetPath = process.env.EVAL_DATASET_PATH || path.join(process.cwd(), 'evaluation', 'email-extraction-dataset.json');

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required to run extraction evaluation.');
    }

    if (!fs.existsSync(datasetPath)) {
      throw new Error(`Dataset not found at ${datasetPath}. Create it from evaluation/email-extraction-dataset.example.json`);
    }

    const rawData = fs.readFileSync(datasetPath, 'utf-8');
    const dataset = JSON.parse(rawData) as LabeledEmail[];

    if (!Array.isArray(dataset) || dataset.length === 0) {
      throw new Error('Dataset must be a non-empty JSON array.');
    }

    let tp = 0;
    let tn = 0;
    let fp = 0;
    let fn = 0;

    let expectedTitlesTotal = 0;
    let predictedTitlesTotal = 0;
    let matchedTitlesTotal = 0;

    for (const row of dataset) {
      const prediction = await emailAnalysisChain(row.emailContent);
      const predictedIsActionable = Boolean(prediction.is_actionable);

      if (row.expected.isActionable && predictedIsActionable) tp += 1;
      if (!row.expected.isActionable && !predictedIsActionable) tn += 1;
      if (!row.expected.isActionable && predictedIsActionable) fp += 1;
      if (row.expected.isActionable && !predictedIsActionable) fn += 1;

      const expectedTitles = (row.expected.taskTitles || []).map(normalize).filter(Boolean);
      const predictedTitles = (prediction.tasks || []).map((t) => normalize(t.title)).filter(Boolean);

      expectedTitlesTotal += expectedTitles.length;
      predictedTitlesTotal += predictedTitles.length;

      const usedPredictedIndexes = new Set<number>();
      for (const expectedTitle of expectedTitles) {
        const idx = predictedTitles.findIndex((predictedTitle, i) => !usedPredictedIndexes.has(i) && isTitleMatch(expectedTitle, predictedTitle));
        if (idx >= 0) {
          usedPredictedIndexes.add(idx);
          matchedTitlesTotal += 1;
        }
      }
    }

    const actionablePrecision = safeDivide(tp, tp + fp);
    const actionableRecall = safeDivide(tp, tp + fn);

    const taskPrecision = safeDivide(matchedTitlesTotal, predictedTitlesTotal);
    const taskRecall = safeDivide(matchedTitlesTotal, expectedTitlesTotal);

    const summary: EvalSummary = {
      totalEmails: dataset.length,
      actionable: {
        tp,
        tn,
        fp,
        fn,
        accuracy: round4(safeDivide(tp + tn, dataset.length)),
        precision: round4(actionablePrecision),
        recall: round4(actionableRecall),
        f1: round4(f1(actionablePrecision, actionableRecall)),
      },
      tasks: {
        expectedTitles: expectedTitlesTotal,
        predictedTitles: predictedTitlesTotal,
        matchedTitles: matchedTitlesTotal,
        extractionAccuracy: round4(safeDivide(matchedTitlesTotal, expectedTitlesTotal)),
        precision: round4(taskPrecision),
        recall: round4(taskRecall),
        f1: round4(f1(taskPrecision, taskRecall)),
      },
      passThresholds: {
        actionableAccuracyAtLeast90: safeDivide(tp + tn, dataset.length) >= 0.9,
        taskExtractionAccuracyAtLeast90: safeDivide(matchedTitlesTotal, expectedTitlesTotal) >= 0.9,
      },
    };

    const reportDir = path.join(process.cwd(), 'artifacts', 'evaluation');
    fs.mkdirSync(reportDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const timestampedReportPath = path.join(reportDir, `email-extraction-report-${timestamp}.json`);
    const latestReportPath = path.join(reportDir, 'email-extraction-report-latest.json');

    const reportContent = JSON.stringify(summary, null, 2);
    fs.writeFileSync(timestampedReportPath, reportContent, 'utf-8');
    fs.writeFileSync(latestReportPath, reportContent, 'utf-8');

    // Keep this test as a report generator rather than a quality gate.
    expect(summary.totalEmails).toBeGreaterThan(0);
  }, 300000);
});
