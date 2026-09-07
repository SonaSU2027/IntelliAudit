/**
 * Missing Value Processing and Recommendation Engine
 * Handles explainable AI-driven recommendations, confidence scoring, and imputation algorithms.
 */

import { 
  isMissingValue, 
  computeNumericStats, 
  computeCategoricalStats,
  SKEWNESS_THRESHOLD 
} from './dataProfiler.js';

/**
 * Validates and coerces a custom value based on the column's detected type
 * @param {any} val - Input custom value
 * @param {string} columnType - Detected data type (Integer, Float, Boolean, Categorical, Date, ID / Key)
 * @returns {Object} { valid: boolean, value?: any, error?: string }
 */
export function validateAndCoerceCustomValue(val, columnType = '') {
  if (val === null || val === undefined || String(val).trim() === '') {
    return { valid: false, error: 'Custom value cannot be empty.' };
  }
  const str = String(val).trim();

  if (columnType === 'Integer') {
    const num = Number(str);
    if (isNaN(num) || !isFinite(num) || !Number.isInteger(num)) {
      return { 
        valid: false, 
        error: `Invalid integer "${val}" for numeric column. Please enter a whole integer value (e.g., 25).` 
      };
    }
    return { valid: true, value: num };
  }

  if (columnType === 'Float') {
    const num = Number(str);
    if (isNaN(num) || !isFinite(num)) {
      return { 
        valid: false, 
        error: `Invalid numeric value "${val}" for float column. Please enter a valid number (e.g., 25.5).` 
      };
    }
    return { valid: true, value: num };
  }

  if (columnType === 'Boolean') {
    const lower = str.toLowerCase();
    if (['true', '1', 'yes', 'y'].includes(lower)) {
      return { valid: true, value: 'true' };
    }
    if (['false', '0', 'no', 'n'].includes(lower)) {
      return { valid: true, value: 'false' };
    }
    return { 
      valid: false, 
      error: `Invalid boolean "${val}". Allowed values are: true, false, yes, no, 1, 0.` 
    };
  }

  // String / Categorical / Date / ID / Key
  return { valid: true, value: str };
}

/**
 * Generates explainable recommendations for all columns with missing values
 * @param {Array<Object>} columnsMetadata 
 * @param {Object} options 
 * @returns {Array<Object>}
 */
export function generateMissingRecommendations(columnsMetadata) {
  if (!columnsMetadata || columnsMetadata.length === 0) return [];

  const recommendations = [];

  columnsMetadata.forEach(col => {
    if (col.missingCount === 0) return;

    let rec = {
      column: col.name,
      dataType: col.dataType,
      missingCount: col.missingCount,
      missingPercentage: col.missingPercentage,
      recommendedMethod: 'Median',
      confidence: 85,
      reason: '',
      alternativeMethods: [],
      suggestedValue: null
    };

    if (col.dataType === 'Integer' || col.dataType === 'Float') {
      const stats = col.stats || {};
      const isSkewed = stats.isSkewed !== undefined 
        ? stats.isSkewed 
        : Math.abs(stats.skewness || 0) > SKEWNESS_THRESHOLD;
      const calculatedMedian = stats.median !== undefined ? stats.median : 0;
      const calculatedMean = stats.mean !== undefined ? stats.mean : 0;

      if (col.missingPercentage > 50) {
        rec.recommendedMethod = 'Median';
        rec.confidence = 78;
        rec.suggestedValue = calculatedMedian;
        rec.reason = `Severe missingness (${col.missingPercentage}% missing). Median imputation (${calculatedMedian}) is recommended as a neutral fallback, but consider dropping this column if non-critical.`;
        rec.alternativeMethods = ['Mean', 'Custom Value', 'Drop Rows'];
      } else if (isSkewed) {
        const confScore = Math.min(96, Math.max(82, 85 + Math.round(Math.abs(stats.skewness || 1) * 3)));
        rec.recommendedMethod = 'Median';
        rec.confidence = confScore;
        rec.suggestedValue = calculatedMedian;
        rec.reason = `The column is skewed (skewness: ${stats.skewness}, threshold: ${SKEWNESS_THRESHOLD}) and contains extreme variance (IQR: ${stats.iqr}). The median (${calculatedMedian}) is robust against outlier distortion and preserves realistic distributions.`;
        rec.alternativeMethods = ['Mean', 'Custom Value', 'Drop Rows'];
      } else {
        const confScore = Math.min(94, Math.max(85, 90 - Math.round(Math.abs(stats.skewness || 0) * 5)));
        rec.recommendedMethod = 'Mean';
        rec.confidence = confScore;
        rec.suggestedValue = calculatedMean;
        rec.reason = `The column exhibits a symmetric distribution (skewness: ${stats.skewness}, within threshold ±${SKEWNESS_THRESHOLD}). Mean imputation (${calculatedMean}) preserves the dataset's central tendency and arithmetic expectation.`;
        rec.alternativeMethods = ['Median', 'Custom Value', 'Drop Rows'];
      }
    } else if (col.dataType === 'Boolean') {
      const stats = col.stats || {};
      rec.recommendedMethod = 'Mode';
      rec.confidence = 92;
      rec.suggestedValue = stats.mode || 'false';
      rec.reason = `Binary categorical attribute. Mode imputation ('${stats.mode}') matches the majority class (${stats.modePercentage}% of known records).`;
      rec.alternativeMethods = ['Custom Value', 'Drop Rows'];
    } else if (col.dataType === 'Date') {
      const stats = col.stats || {};
      rec.recommendedMethod = 'Forward Fill (ffill)';
      rec.confidence = 90;
      rec.suggestedValue = '(Sequential Prev Date)';
      rec.reason = `Temporal date column detected. Forward fill (ffill) or median date is recommended to maintain chronological sequence without introducing synthetic mode bias.`;
      rec.alternativeMethods = ['Backward Fill (bfill)', 'Median Date', 'Mode', 'Custom Value', 'Drop Rows'];
    } else if (col.dataType === 'ID / Key') {
      rec.recommendedMethod = 'Drop Rows';
      rec.confidence = 94;
      rec.suggestedValue = null;
      rec.reason = `Unique identifier feature. Imputing synthetic IDs can cause false primary key collisions; deleting affected rows or manually assigning unique IDs is necessary.`;
      rec.alternativeMethods = ['Custom Value'];
    } else {
      // General Categorical
      const stats = col.stats || {};
      const modeVal = stats.mode || 'Unknown';
      const modePct = stats.modePercentage || 0;

      if (stats.uniqueCount > 50 && col.missingPercentage > 20) {
        rec.recommendedMethod = 'Custom Value';
        rec.confidence = 84;
        rec.suggestedValue = 'Unknown';
        rec.reason = `High-cardinality categorical column (${stats.uniqueCount} distinct values). Assigning a constant placeholder ('Unknown') prevents artificially inflating category frequencies.`;
        rec.alternativeMethods = ['Mode', 'Drop Rows'];
      } else {
        rec.recommendedMethod = 'Mode';
        rec.confidence = modePct > 50 ? 92 : 86;
        rec.suggestedValue = modeVal;
        rec.reason = `Categorical attribute with dominant class '${modeVal}' (${modePct}% of observed data). Mode imputation replaces missing entries with the most representative category.`;
        rec.alternativeMethods = ['Custom Value', 'Drop Rows'];
      }
    }

    recommendations.push(rec);
  });

  return recommendations;
}

/**
 * Executes imputation on a dataset for a specific column and method
 * @param {Array<Object>} rows 
 * @param {string} column 
 * @param {string} method ('Mean' | 'Median' | 'Mode' | 'Forward Fill (ffill)' | 'Backward Fill (bfill)' | 'Median Date' | 'Custom Value' | 'Drop Rows')
 * @param {any} customValue 
 * @param {string} columnType (optional type for type safety validation)
 * @param {Object} options (missing marker options)
 * @returns {Object} { updatedRows, replacementValue, affectedRowCount, affectedIndices, affectedRows, column, method, timestamp }
 */
export function executeImputation(rows, column, method, customValue = '', columnType = '', options = {}) {
  if (!rows || rows.length === 0 || !column) {
    throw new Error('Invalid parameters for imputation');
  }

  // Deep clone rows to ensure immutability
  const updatedRows = rows.map(r => ({ ...r }));
  const affectedIndices = [];

  // Find all rows where column is missing
  updatedRows.forEach((row, idx) => {
    if (isMissingValue(row[column], options)) {
      affectedIndices.push(idx);
    }
  });

  if (affectedIndices.length === 0) {
    return {
      updatedRows,
      replacementValue: null,
      affectedRowCount: 0,
      affectedIndices: [],
      affectedRows: [],
      column,
      method,
      timestamp: new Date().toISOString()
    };
  }

  let replacementValue = null;

  if (method === 'Drop Rows') {
    const affectedRows = affectedIndices.map(idx => {
      const r = updatedRows[idx];
      return {
        rowId: r.__row_id !== undefined ? r.__row_id : idx + 1,
        originalValue: r[column],
        newValue: '[REMOVED]'
      };
    });

    const filteredRows = updatedRows.filter(r => !isMissingValue(r[column], options));
    return {
      updatedRows: filteredRows,
      replacementValue: '[REMOVED]',
      affectedRowCount: affectedIndices.length,
      affectedIndices,
      affectedRows,
      column,
      method: 'Drop Rows',
      timestamp: new Date().toISOString()
    };
  }

  const nonMissingValues = updatedRows
    .filter(r => !isMissingValue(r[column], options))
    .map(r => r[column]);

  if (method === 'Forward Fill (ffill)' || method === 'Forward Fill' || method === 'ffill') {
    let lastValid = null;
    updatedRows.forEach((row) => {
      if (!isMissingValue(row[column], options)) {
        lastValid = row[column];
      } else if (lastValid !== null) {
        row[column] = lastValid;
      }
    });
    const firstValid = nonMissingValues[0] || '1970-01-01';
    updatedRows.forEach((row) => {
      if (isMissingValue(row[column], options)) {
        row[column] = firstValid;
      }
    });
    replacementValue = '(Forward Filled)';
  } else if (method === 'Backward Fill (bfill)' || method === 'Backward Fill' || method === 'bfill') {
    let nextValid = null;
    for (let idx = updatedRows.length - 1; idx >= 0; idx--) {
      if (!isMissingValue(updatedRows[idx][column], options)) {
        nextValid = updatedRows[idx][column];
      } else if (nextValid !== null) {
        updatedRows[idx][column] = nextValid;
      }
    }
    const lastValid = nonMissingValues[nonMissingValues.length - 1] || '1970-01-01';
    updatedRows.forEach((row) => {
      if (isMissingValue(row[column], options)) {
        row[column] = lastValid;
      }
    });
    replacementValue = '(Backward Filled)';
  } else if (method === 'Median Date') {
    const timestamps = nonMissingValues
      .map(v => Date.parse(v))
      .filter(t => !isNaN(t))
      .sort((a, b) => a - b);
    if (timestamps.length > 0) {
      const mid = Math.floor(timestamps.length / 2);
      const medianTimestamp = timestamps.length % 2 === 0
        ? Math.round((timestamps[mid - 1] + timestamps[mid]) / 2)
        : timestamps[mid];
      const d = new Date(medianTimestamp);
      replacementValue = d.toISOString().split('T')[0];
    } else {
      replacementValue = '1970-01-01';
    }
  } else if (method === 'Mean') {
    const stats = computeNumericStats(nonMissingValues, options);
    replacementValue = stats.mean;
  } else if (method === 'Median') {
    const stats = computeNumericStats(nonMissingValues, options);
    replacementValue = stats.median;
  } else if (method === 'Mode') {
    const stats = computeCategoricalStats(nonMissingValues, options);
    replacementValue = stats.mode;
  } else if (method === 'Custom Value') {
    if (columnType) {
      const typeCheck = validateAndCoerceCustomValue(customValue, columnType);
      if (!typeCheck.valid) {
        throw new Error(typeCheck.error);
      }
      replacementValue = typeCheck.value;
    } else {
      replacementValue = customValue;
    }
  } else {
    const stats = computeNumericStats(nonMissingValues, options);
    replacementValue = stats.count > 0 ? stats.median : 'Unknown';
  }

  // Collect affected rows with stable rowId, originalValue, and newValue
  const affectedRows = affectedIndices.map(idx => {
    const r = updatedRows[idx];
    return {
      rowId: r.__row_id !== undefined ? r.__row_id : idx + 1,
      originalValue: r[column],
      newValue: replacementValue
    };
  });

  // Apply replacement
  affectedIndices.forEach(idx => {
    updatedRows[idx][column] = replacementValue;
  });

  return {
    updatedRows,
    replacementValue,
    affectedRowCount: affectedIndices.length,
    affectedIndices,
    affectedRows,
    column,
    method,
    timestamp: new Date().toISOString()
  };
}
