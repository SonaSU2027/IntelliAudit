/**
 * Phase C — Data Cleaning Engine
 * Module: Sudhanshu
 * 
 * Objective:
 * Applies ONLY user-approved cleaning recommendations to the working dataset.
 * The original dataset is NEVER modified.
 * 
 * Guiding Principle:
 * Detection -> Explanation -> Recommendation -> User Approval -> Cleaning -> Validation
 * 
 * Supported Operations:
 * 1. Exact & Fuzzy Duplicate Removal
 * 2. Anomaly Handling (Winsorize/Clamp, Median Impute, Remove Row, or Custom Edit)
 * 3. Typo & Category Normalization
 * 4. Business Rule & Cross-Column Validation Fixes
 * 5. Missing Value Imputation
 */

import { executeImputation } from '../utils/missingHandler.js';

/**
 * Executes approved cleaning operations on the working dataset rows.
 * 
 * @param {Object} params
 * @param {Array<Object>} params.rows - Current working dataset rows
 * @param {Array<string>} params.headers - Dataset column headers
 * @param {Array<Object>} params.approvedRecommendations - List of recommendations approved or edited by user
 * @param {Array<Object>} params.columnMetadata - Column profile metadata
 * @param {Object} params.profilingOptions - Missing profiling options
 * @returns {{
 *   cleanedRows: Array<Object>,
 *   appliedOperations: Array<Object>,
 *   auditEntries: Array<Object>,
 *   summary: Object
 * }}
 */
export function executeApprovedCleaning({
  rows = [],
  headers = [],
  approvedRecommendations = [],
  columnMetadata = [],
  profilingOptions = {}
}) {
  if (!rows || rows.length === 0 || !approvedRecommendations || approvedRecommendations.length === 0) {
    return {
      cleanedRows: rows.map(r => ({ ...r })),
      appliedOperations: [],
      auditEntries: [],
      summary: {
        totalApproved: 0,
        duplicatesRemoved: 0,
        anomaliesHandled: 0,
        typosCorrected: 0,
        ruleViolationsFixed: 0,
        missingValuesImputed: 0,
        totalRowsBefore: rows.length,
        totalRowsAfter: rows.length
      }
    };
  }

  // Clone rows to maintain purity and prevent mutations
  let workingRows = rows.map((r, idx) => ({
    ...r,
    __row_id: r.__row_id !== undefined ? r.__row_id : idx + 1
  }));

  const appliedOperations = [];
  const auditEntries = [];
  const rowsToDeleteSet = new Set(); // Store row IDs to delete in batch

  let duplicatesRemoved = 0;
  let anomaliesHandled = 0;
  let typosCorrected = 0;
  let ruleViolationsFixed = 0;
  let missingValuesImputed = 0;

  const timestamp = new Date().toLocaleTimeString();

  // Sort recommendations logically:
  // 1. Column Imputations
  // 2. Value Corrections & Normalizations (Typos, Rules, Anomalies)
  // 3. Row Removals (Duplicates, Outlier Drops)
  const sortedRecs = [...approvedRecommendations].sort((a, b) => {
    const order = {
      'missing_value': 1,
      'category_inconsistency': 2,
      'rule_violation': 3,
      'cross_column_violation': 4,
      'statistical_anomaly': 5,
      'isolation_forest_anomaly': 6,
      'exact_duplicate': 7,
      'fuzzy_duplicate': 8
    };
    return (order[a.type] || 9) - (order[b.type] || 9);
  });

  // Helper to type-safely cast numeric values to clean numbers
  const sanitizeCleanedValue = (val, targetCol) => {
    if (val === null || val === undefined) return val;
    const colMeta = columnMetadata.find(c => c.name === targetCol);
    const dataType = colMeta?.dataType || '';
    if (dataType === 'Integer' || dataType === 'Float') {
      const sanitized = String(val).replace(/[$,]/g, '').trim();
      const num = Number(sanitized);
      if (!isNaN(num) && isFinite(num)) {
        return dataType === 'Integer' ? Math.round(num) : num;
      }
    }
    return val;
  };

  sortedRecs.forEach((rec) => {
    const opId = `op-clean-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const rawEffectiveValue = rec.userCustomValue !== null && rec.userCustomValue !== undefined
      ? rec.userCustomValue
      : rec.suggestedValue;
    const effectiveValue = sanitizeCleanedValue(rawEffectiveValue, rec.column);

    // -----------------------------------------------------------------------
    // CASE 1: MISSING VALUE IMPUTATION (Phase A & C)
    // -----------------------------------------------------------------------
    if (rec.type === 'missing_value') {
      const colMeta = columnMetadata.find(c => c.name === rec.column) || {};
      const columnType = colMeta.dataType || rec.metadata?.dataType || '';
      const method = rec.metadata?.method || 'Median';

      try {
        const impRes = executeImputation(
          workingRows,
          rec.column,
          method,
          effectiveValue,
          columnType,
          profilingOptions
        );

        workingRows = impRes.updatedRows;
        missingValuesImputed += impRes.affectedRowCount;

        const opRecord = {
          id: opId,
          recommendationId: rec.id,
          timestamp,
          category: 'Missing Values',
          action: `Impute Missing (${method})`,
          column: rec.column,
          details: `Imputed ${impRes.affectedRowCount} missing values in '${rec.column}' with '${impRes.replacementValue}'.`,
          replacementValue: impRes.replacementValue,
          affectedRowsCount: impRes.affectedRowCount,
          confidence: rec.confidence,
          confidenceLevel: rec.confidenceLevel
        };

        appliedOperations.push(opRecord);
        auditEntries.push({
          id: `audit-${opId}`,
          operationId: opId,
          timestamp,
          category: 'Cleaning',
          action: `Missing Value Imputation (${method})`,
          column: rec.column,
          decision: 'Approved & Executed',
          confidence: rec.confidence,
          reason: rec.reason,
          details: opRecord.details,
          affectedRowsCount: impRes.affectedRowCount,
          status: 'Applied'
        });
      } catch (err) {
        console.error(`Error imputing column ${rec.column}:`, err);
      }
      return;
    }

    // -----------------------------------------------------------------------
    // CASE 2: ROW REMOVAL (Exact / Fuzzy Duplicates & Outliers)
    // -----------------------------------------------------------------------
    if (rec.suggestedAction === 'remove_row' || rec.type === 'exact_duplicate' || rec.type === 'fuzzy_duplicate') {
      rowsToDeleteSet.add(rec.rowId);
      duplicatesRemoved++;

      const opRecord = {
        id: opId,
        recommendationId: rec.id,
        timestamp,
        category: 'Duplicates',
        action: rec.type === 'exact_duplicate' ? 'Remove Exact Duplicate' : 'Remove Fuzzy Duplicate',
        targetRowId: rec.rowId,
        details: `Marked duplicate row #${rec.rowId} for removal (Duplicate of Master Row #${rec.metadata?.masterRowId || rec.metadata?.similarRowId || 'N/A'}).`,
        confidence: rec.confidence,
        confidenceLevel: rec.confidenceLevel
      };

      appliedOperations.push(opRecord);
      auditEntries.push({
        id: `audit-${opId}`,
        operationId: opId,
        timestamp,
        category: 'Cleaning',
        action: opRecord.action,
        decision: 'Approved & Executed',
        confidence: rec.confidence,
        reason: rec.reason,
        details: opRecord.details,
        affectedRowsCount: 1,
        status: 'Applied'
      });
      return;
    }

    // -----------------------------------------------------------------------
    // CASE 3: TYPO & CATEGORY NORMALIZATION
    // -----------------------------------------------------------------------
    if (rec.type === 'category_inconsistency') {
      const targetRowId = rec.rowId;
      const targetCol = rec.column;
      const targetVal = effectiveValue;

      let modifiedCount = 0;
      workingRows = workingRows.map(row => {
        if (row.__row_id === targetRowId) {
          modifiedCount++;
          return {
            ...row,
            [targetCol]: targetVal
          };
        }
        return row;
      });

      typosCorrected += modifiedCount;

      const opRecord = {
        id: opId,
        recommendationId: rec.id,
        timestamp,
        category: 'Inconsistencies',
        action: 'Standardize Category Typo',
        column: targetCol,
        targetRowId,
        originalValue: rec.currentValue,
        replacementValue: targetVal,
        details: `Corrected category "${rec.currentValue}" to "${targetVal}" in row #${targetRowId} ('${targetCol}').`,
        confidence: rec.confidence,
        confidenceLevel: rec.confidenceLevel
      };

      appliedOperations.push(opRecord);
      auditEntries.push({
        id: `audit-${opId}`,
        operationId: opId,
        timestamp,
        category: 'Cleaning',
        action: opRecord.action,
        column: targetCol,
        decision: 'Approved & Executed',
        confidence: rec.confidence,
        reason: rec.reason,
        details: opRecord.details,
        affectedRowsCount: modifiedCount,
        status: 'Applied'
      });
      return;
    }

    // -----------------------------------------------------------------------
    // CASE 4: RULE VIOLATION & CROSS-COLUMN FIXES
    // -----------------------------------------------------------------------
    if (rec.type === 'rule_violation' || rec.type === 'cross_column_violation') {
      const targetRowId = rec.rowId;
      const targetCol = rec.column;

      let modifiedCount = 0;
      workingRows = workingRows.map(row => {
        if (row.__row_id === targetRowId) {
          modifiedCount++;
          
          // Cross-column recalculation
          if (rec.suggestedAction === 'recalculate_cross_column') {
            const qty = Number(row['Quantity'] || row['quantity'] || row['Qty'] || row['qty'] || 0);
            const unitPrice = Number(row['Unit Price'] || row['unit_price'] || row['UnitPrice'] || row['Price'] || row['price'] || 0);
            const totalCol = headers.find(h => /^(total|total_price|total price)$/i.test(h)) || 'Total';
            return {
              ...row,
              [totalCol]: Number((qty * unitPrice).toFixed(2))
            };
          }

          // Single column value replacement / clamp
          return {
            ...row,
            [targetCol]: effectiveValue
          };
        }
        return row;
      });

      ruleViolationsFixed += modifiedCount;

      const opRecord = {
        id: opId,
        recommendationId: rec.id,
        timestamp,
        category: 'Rule Violations',
        action: rec.type === 'cross_column_violation' ? 'Cross-Column Recalculation' : 'Rule Constraint Correction',
        column: targetCol,
        targetRowId,
        originalValue: rec.currentValue,
        replacementValue: effectiveValue,
        details: `Adjusted '${targetCol}' from "${rec.currentValue}" to "${effectiveValue}" in row #${targetRowId} to satisfy rule.`,
        confidence: rec.confidence,
        confidenceLevel: rec.confidenceLevel
      };

      appliedOperations.push(opRecord);
      auditEntries.push({
        id: `audit-${opId}`,
        operationId: opId,
        timestamp,
        category: 'Cleaning',
        action: opRecord.action,
        column: targetCol,
        decision: 'Approved & Executed',
        confidence: rec.confidence,
        reason: rec.reason,
        details: opRecord.details,
        affectedRowsCount: modifiedCount,
        status: 'Applied'
      });
      return;
    }

    // -----------------------------------------------------------------------
    // CASE 5: STATISTICAL & MULTIVARIATE ANOMALY HANDLING
    // -----------------------------------------------------------------------
    if (rec.type === 'statistical_anomaly' || rec.type === 'isolation_forest_anomaly') {
      const targetRowId = rec.rowId;
      const targetCol = rec.column;

      if (rec.suggestedAction === 'remove_row') {
        rowsToDeleteSet.add(targetRowId);
        anomaliesHandled++;
      } else {
        // Value clamp / winsorize or edit
        let replacementVal = effectiveValue;
        
        // Extract numeric clamp value if string formatted like "Clamp to Upper Bound (130000)"
        const clampMatch = String(effectiveValue).match(/\(([-0-9.]+)\)/);
        if (clampMatch) {
          replacementVal = clampMatch[1];
        }

        let modifiedCount = 0;
        workingRows = workingRows.map(row => {
          if (row.__row_id === targetRowId) {
            modifiedCount++;
            return {
              ...row,
              [targetCol]: replacementVal
            };
          }
          return row;
        });

        anomaliesHandled += modifiedCount;
      }

      const opRecord = {
        id: opId,
        recommendationId: rec.id,
        timestamp,
        category: 'Anomalies',
        action: `Anomaly Handling (${rec.suggestedAction || 'Adjust'})`,
        column: targetCol,
        targetRowId,
        originalValue: rec.currentValue,
        replacementValue: effectiveValue,
        details: `Handled statistical anomaly in row #${targetRowId} ('${targetCol}') via ${rec.suggestedAction || 'adjustment'}.`,
        confidence: rec.confidence,
        confidenceLevel: rec.confidenceLevel
      };

      appliedOperations.push(opRecord);
      auditEntries.push({
        id: `audit-${opId}`,
        operationId: opId,
        timestamp,
        category: 'Cleaning',
        action: opRecord.action,
        column: targetCol,
        decision: 'Approved & Executed',
        confidence: rec.confidence,
        reason: rec.reason,
        details: opRecord.details,
        affectedRowsCount: 1,
        status: 'Applied'
      });
    }
  });

  // Apply batch row deletions
  if (rowsToDeleteSet.size > 0) {
    workingRows = workingRows.filter(r => !rowsToDeleteSet.has(r.__row_id));
  }

  return {
    cleanedRows: workingRows,
    appliedOperations,
    auditEntries,
    summary: {
      totalApproved: approvedRecommendations.length,
      duplicatesRemoved,
      anomaliesHandled,
      typosCorrected,
      ruleViolationsFixed,
      missingValuesImputed,
      totalRowsBefore: rows.length,
      totalRowsAfter: workingRows.length
    }
  };
}
