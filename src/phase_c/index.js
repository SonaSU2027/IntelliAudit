/**
 * Phase C — IntelliAudit Explainable Cleaning & Dashboard Suite
 * Module Owner: Sudhanshu
 * 
 * Objective:
 * Complete suite for Recommendation Generation, User-Controlled Approval,
 * Cleaning Execution, Dynamic Quality Scoring, Before/After Diff,
 * High-Tech Interactive Dashboard, and Downloadable Compliance Audit Reports.
 */

// Recommendation Engine (C.1, C.2, C.3)
export { generateExplainableRecommendations, classifyConfidence } from './recommendationEngine.js';

// Cleaning Engine (C.5)
export { executeApprovedCleaning } from './cleaningEngine.js';

// Dynamic Quality Score & Comparison (C.6, C.7)
export { computeDynamicQualityMetrics, computeBeforeAfterComparison, getQualityGrade } from './qualityMetrics.js';

// Audit Report, PDF & CSV Downloads (C.8, C.10, C.11)
export { 
  buildAuditReportData, 
  downloadCleanedCSV, 
  downloadAuditReportTXT,
  downloadAnalyticalReportPDF,
  downloadAuditReportJSON, 
  downloadAuditReportMarkdown 
} from './auditReportGenerator.js';

// Context & State Provider
export { PhaseCProvider, usePhaseC } from './PhaseCContext.jsx';

// Interactive UI Views
export { default as CleaningActionsView } from './CleaningActionsView.jsx';
export { default as CleanedPreviewView } from './CleanedPreviewView.jsx';
export { default as DashboardPhaseC } from './DashboardPhaseC.jsx';
export { default as AuditReportView } from './AuditReportView.jsx';
