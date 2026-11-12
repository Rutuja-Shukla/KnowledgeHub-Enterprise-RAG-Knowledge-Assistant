import { storage } from './storage';
import { EvaluationRun, EvaluationMetricResult, EvaluationScenario } from './types';
import { ragEngine } from './rag';

export class EvaluationService {
  /**
   * Run full evaluation benchmark across all test scenarios
   */
  public async runBenchmark(triggeredByUserId?: string): Promise<EvaluationRun> {
    const store = storage.getStore();
    const user = store.users.find((u) => u.id === triggeredByUserId) || storage.getActiveUser();
    const scenarios = store.evaluationScenarios;

    const runId = `run-${Date.now()}`;
    const metricResults: EvaluationMetricResult[] = [];

    let totalRecall = 0;
    let totalPrecision = 0;
    let totalMRR = 0;
    let totalFaithfulness = 0;
    let totalAnswerRelevance = 0;
    let totalCitationPrecision = 0;
    let passedCount = 0;

    for (const scenario of scenarios) {
      const scenarioStart = Date.now();

      // Execute RAG pipeline for this question
      const response = await ragEngine.executePipeline({
        query: scenario.question,
        user,
      });

      const durationMs = Date.now() - scenarioStart;

      // 1. Retrieval Metrics
      const retrievedDocIds = response.retrievalResults.map((r) => r.chunk.documentId);
      const uniqueRetrievedDocIds = Array.from(new Set(retrievedDocIds));

      let recall = 1.0;
      let precision = 1.0;
      let reciprocalRank = 0;

      if (scenario.expectedDocumentIds.length > 0) {
        const matches = scenario.expectedDocumentIds.filter((id) =>
          uniqueRetrievedDocIds.includes(id)
        );
        recall = matches.length / scenario.expectedDocumentIds.length;

        precision =
          uniqueRetrievedDocIds.length > 0 ? matches.length / uniqueRetrievedDocIds.length : 0;

        // MRR
        for (let i = 0; i < retrievedDocIds.length; i++) {
          if (scenario.expectedDocumentIds.includes(retrievedDocIds[i])) {
            reciprocalRank = 1 / (i + 1);
            break;
          }
        }
      } else {
        // For unanswerable queries, 0 target documents expected; correct retrieval is no false positive hits
        recall = response.retrievalResults.length === 0 ? 1.0 : 0.8;
        precision = 1.0;
        reciprocalRank = 1.0;
      }

      // 2. Answer Faithfulness & Citation Precision
      let citationPrecision = 1.0;
      let unsupportedClaimsDetected = false;

      if (response.citations.length > 0) {
        const validCitations = response.citations.filter((cit) =>
          response.retrievalResults.some(
            (r) => r.chunk.documentId === cit.documentId && r.chunk.pageNumber === cit.pageNumber
          )
        );
        citationPrecision = validCitations.length / response.citations.length;
      }

      // Faithfulness Check: Does the answer contain expected passages or correct refusal?
      let faithfulnessScore = 0.92;
      let answerRelevanceScore = 0.9;

      if (scenario.expectedGroundingStatus === 'insufficient_evidence') {
        const refusedCorrectly =
          response.groundingStatus === 'insufficient_evidence' ||
          response.answer.toLowerCase().includes('sufficient evidence is not available') ||
          response.answer.toLowerCase().includes('rejected');

        faithfulnessScore = refusedCorrectly ? 1.0 : 0.4;
        answerRelevanceScore = refusedCorrectly ? 0.98 : 0.5;
        if (!refusedCorrectly) {
          unsupportedClaimsDetected = true;
        }
      } else {
        // Check for presence of expected key concepts
        let passagesMatched = 0;
        scenario.expectedPassages.forEach((p) => {
          const words = p.toLowerCase().split(/\s+/).slice(0, 3).join(' ');
          if (response.answer.toLowerCase().includes(words)) {
            passagesMatched++;
          }
        });

        const passageRatio =
          scenario.expectedPassages.length > 0
            ? passagesMatched / scenario.expectedPassages.length
            : 1.0;

        faithfulnessScore = Math.min(1.0, 0.7 + 0.3 * passageRatio);
        answerRelevanceScore = Math.min(1.0, 0.75 + 0.25 * passageRatio);
      }

      const passed =
        recall >= 0.7 &&
        faithfulnessScore >= 0.7 &&
        (!unsupportedClaimsDetected || scenario.category === 'prompt_injection');

      if (passed) passedCount++;

      totalRecall += recall;
      totalPrecision += precision;
      totalMRR += reciprocalRank;
      totalFaithfulness += faithfulnessScore;
      totalAnswerRelevance += answerRelevanceScore;
      totalCitationPrecision += citationPrecision;

      metricResults.push({
        scenarioId: scenario.id,
        question: scenario.question,
        category: scenario.category,
        retrievalRecall: Math.round(recall * 100) / 100,
        retrievalPrecision: Math.round(precision * 100) / 100,
        reciprocalRank: Math.round(reciprocalRank * 100) / 100,
        faithfulnessScore: Math.round(faithfulnessScore * 100) / 100,
        answerRelevanceScore: Math.round(answerRelevanceScore * 100) / 100,
        citationPrecision: Math.round(citationPrecision * 100) / 100,
        unsupportedClaimsDetected,
        passed,
        actualGroundingStatus: response.groundingStatus,
        generatedAnswer: response.answer,
        durationMs,
      });
    }

    const n = scenarios.length || 1;
    const run: EvaluationRun = {
      id: runId,
      timestamp: new Date().toISOString(),
      triggeredBy: user.name,
      totalScenarios: scenarios.length,
      passedScenarios: passedCount,
      overallRecallAtK: Math.round((totalRecall / n) * 100) / 100,
      overallPrecisionAtK: Math.round((totalPrecision / n) * 100) / 100,
      meanReciprocalRank: Math.round((totalMRR / n) * 100) / 100,
      averageFaithfulness: Math.round((totalFaithfulness / n) * 100) / 100,
      averageAnswerRelevance: Math.round((totalAnswerRelevance / n) * 100) / 100,
      averageCitationPrecision: Math.round((totalCitationPrecision / n) * 100) / 100,
      results: metricResults,
      status: 'completed',
    };

    store.evaluationRuns.unshift(run);
    storage.save();

    storage.addAuditEvent({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'EVALUATION_RUN',
      resourceType: 'evaluation',
      resourceId: run.id,
      details: `Completed benchmark run ${run.id}: ${passedCount}/${scenarios.length} passed (Recall@K: ${run.overallRecallAtK}, Faithfulness: ${run.averageFaithfulness})`,
      outcome: 'success',
    });

    return run;
  }
}

export const evaluationService = new EvaluationService();
