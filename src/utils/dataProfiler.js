/**
 * Data Profiler Utility for IntelliAudit
 * Handles type inference, descriptive statistics, dataset-level & column-level profiling.
 */

// Shared skewness threshold across profiling and recommendations
export const SKEWNESS_THRESHOLD = 0.8;

// Standard common missing value representations in CSVs
export const DEFAULT_MISSING_MARKERS = new Set([
  '',
  'null',
  'nan',
  'n/a',
  'na',
  '#n/a',
  'none',
  'nil',
  'undefined',
  'missing'
]);

// Ambiguous markers that are optional/configurable (e.g. '-' or '?' might be valid values)
export const AMBIGUOUS_MISSING_MARKERS = new Set([
  '-',
  '?'
]);

// Backward compatibility export
export const MISSING_MARKERS = DEFAULT_MISSING_MARKERS;

/**
 * Checks if a cell value represents a missing value
 * @param {any} val - Cell value to check
 * @param {Object} options - Configuration options ({ includeAmbiguousMarkers: boolean, customMarkers: Set })
 */
export function isMissingValue(val, options = {}) {
  if (val === null || val === undefined) return true;
  if (typeof val === 'number' && isNaN(val)) return true;
  const str = String(val).trim().toLowerCase();
  
  if (DEFAULT_MISSING_MARKERS.has(str)) return true;

  if (options.includeAmbiguousMarkers || options.includeAmbiguous) {
    if (AMBIGUOUS_MISSING_MARKERS.has(str)) return true;
  }

  if (options.customMarkers && typeof options.customMarkers.has === 'function') {
    if (options.customMarkers.has(str)) return true;
  }

  return false;
}

/**
 * Normalizes a cell value: returns null if missing, or trimmed original string/value
 */
export function normalizeValue(val, options = {}) {
  if (isMissingValue(val, options)) return null;
  return typeof val === 'string' ? val.trim() : val;
}

/**
 * Determines the data type of a column based on non-missing sample values
 */
export function detectColumnType(values, columnName = '', options = {}) {
  const nonMissing = values.filter(v => !isMissingValue(v, options)).map(v => String(v).trim());
  if (nonMissing.length === 0) return 'Categorical';

  // Check Boolean
  const boolPattern = /^(true|false|yes|no|y|n|0|1)$/i;
  const allBool = nonMissing.every(v => boolPattern.test(v));
  if (allBool && new Set(nonMissing.map(v => v.toLowerCase())).size <= 2) {
    return 'Boolean';
  }

  // Check Numeric
  const isNumericValue = (v) => {
    if (v === '') return false;
    const num = Number(v);
    return !isNaN(num) && isFinite(num);
  };

  const numericCount = nonMissing.filter(isNumericValue).length;
  const numericRatio = numericCount / nonMissing.length;

  if (numericRatio >= 0.85) {
    // Check if integer or float
    const isInt = nonMissing
      .filter(isNumericValue)
      .every(v => Number.isInteger(Number(v)));
    
    // Check if this numeric column is an ID (e.g., id, cust_id, index or 100% unique)
    const lowerName = columnName.toLowerCase();
    const isIdName = lowerName === 'id' || lowerName.endsWith('_id') || lowerName.endsWith('id') || lowerName.includes('code');
    const uniqueRatio = new Set(nonMissing).size / nonMissing.length;
    
    if (isInt && isIdName && uniqueRatio > 0.9) {
      return 'ID / Key';
    }
    return isInt ? 'Integer' : 'Float';
  }

  // Check Date
  const datePatterns = [
    /^\d{4}[-/]\d{1,2}[-/]\d{1,2}/, // YYYY-MM-DD or YYYY/MM/DD
    /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/, // DD-MM-YYYY or MM/DD/YYYY
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/ // ISO 8601
  ];
  const dateMatches = nonMissing.filter(v => {
    if (datePatterns.some(p => p.test(v))) {
      const parsed = Date.parse(v);
      return !isNaN(parsed);
    }
    return false;
  }).length;

  if (dateMatches / nonMissing.length >= 0.8) {
    return 'Date';
  }

  // Check String ID / Key
  const lowerName = columnName.toLowerCase();
  const isIdName = lowerName === 'id' || lowerName.endsWith('_id') || lowerName.endsWith('id') || lowerName.includes('uuid') || lowerName.includes('token') || lowerName.includes('guid');
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const isUuidPattern = nonMissing.length > 0 && nonMissing.every(v => uuidPattern.test(v));

  if (isIdName || isUuidPattern) {
    return 'ID / Key';
  }

  return 'Categorical';
}

/**
 * Calculates percentile from a sorted array of numbers using linear interpolation
 */
function calculatePercentile(sortedArr, p) {
  if (sortedArr.length === 0) return 0;
  if (sortedArr.length === 1) return sortedArr[0];
  const index = (sortedArr.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  if (lower === upper) return sortedArr[lower];
  return sortedArr[lower] * (1 - weight) + sortedArr[upper] * weight;
}

/**
 * Computes descriptive statistics for numeric values
 */
export function computeNumericStats(rawValues, options = {}) {
  const numbers = rawValues
    .filter(v => !isMissingValue(v, options))
    .map(v => Number(v))
    .filter(n => !isNaN(n) && isFinite(n));

  if (numbers.length === 0) {
    return {
      count: 0,
      mean: 0,
      median: 0,
      min: 0,
      max: 0,
      stdDev: 0,
      q1: 0,
      q3: 0,
      iqr: 0,
      skewness: 0,
      isSkewed: false
    };
  }

  const n = numbers.length;
  const sorted = [...numbers].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  
  // Mean
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const mean = sum / n;

  // Median (Q2)
  const median = calculatePercentile(sorted, 0.5);

  // Q1 (25th percentile) and Q3 (75th percentile)
  const q1 = calculatePercentile(sorted, 0.25);
  const q3 = calculatePercentile(sorted, 0.75);
  const iqr = q3 - q1;

  // Standard Deviation
  const variance = sorted.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (n > 1 ? n - 1 : 1);
  const stdDev = Math.sqrt(variance);

  // Skewness (Sample Skewness / Fisher-Pearson)
  let skewness = 0;
  if (n >= 3 && stdDev > 0) {
    const m3 = sorted.reduce((acc, v) => acc + Math.pow((v - mean) / stdDev, 3), 0);
    skewness = (n / ((n - 1) * (n - 2))) * m3;
  } else if (stdDev > 0) {
    // Non-parametric skew / Pearson's second skewness coefficient fallback
    skewness = (3 * (mean - median)) / stdDev;
  }

  // Rounded values for clean presentation
  return {
    count: n,
    mean: Number(mean.toFixed(2)),
    median: Number(median.toFixed(2)),
    min: Number(min.toFixed(2)),
    max: Number(max.toFixed(2)),
    stdDev: Number(stdDev.toFixed(2)),
    q1: Number(q1.toFixed(2)),
    q3: Number(q3.toFixed(2)),
    iqr: Number(iqr.toFixed(2)),
    skewness: Number(skewness.toFixed(2)),
    isSkewed: Math.abs(skewness) > SKEWNESS_THRESHOLD
  };
}

/**
 * Computes frequency statistics for categorical values
 */
export function computeCategoricalStats(rawValues, options = {}) {
  const nonMissing = rawValues
    .filter(v => !isMissingValue(v, options))
    .map(v => String(v).trim());

  if (nonMissing.length === 0) {
    return {
      count: 0,
      uniqueCount: 0,
      mode: 'N/A',
      modeFrequency: 0,
      modePercentage: 0,
      topValues: []
    };
  }

  const freqMap = {};
  nonMissing.forEach(v => {
    freqMap[v] = (freqMap[v] || 0) + 1;
  });

  const sortedEntries = Object.entries(freqMap).sort((a, b) => b[1] - a[1]);
  const [modeValue, modeFreq] = sortedEntries[0] || ['N/A', 0];

  const topValues = sortedEntries.slice(0, 5).map(([value, count]) => ({
    value,
    count,
    percentage: Number(((count / nonMissing.length) * 100).toFixed(1))
  }));

  return {
    count: nonMissing.length,
    uniqueCount: sortedEntries.length,
    mode: modeValue,
    modeFrequency: modeFreq,
    modePercentage: Number(((modeFreq / nonMissing.length) * 100).toFixed(1)),
    topValues
  };
}

/**
 * Calculates complete dataset-level and column-level profile
 * @param {Array<string>} headers 
 * @param {Array<Object>} rows 
 * @param {Object} metadata 
 * @param {Object} options 
 */
export function computeDatasetProfile(headers, rows, metadata = {}, options = {}) {
  if (!headers || !rows || rows.length === 0) {
    return null;
  }

  // Filter out internal __row_id from profiled headers if present
  const validHeaders = headers.filter(h => h !== '__row_id');

  const totalRows = rows.length;
  const totalColumns = validHeaders.length;
  const totalCells = totalRows * totalColumns;

  let totalMissingCells = 0;
  const columnMetadata = [];

  const numericalCols = [];
  const categoricalCols = [];
  const dateCols = [];
  const idCols = [];
  const booleanCols = [];

  validHeaders.forEach(header => {
    const colValues = rows.map(r => r[header]);
    
    // Missing count
    const missingCount = colValues.filter(v => isMissingValue(v, options)).length;
    const missingPercentage = Number(((missingCount / totalRows) * 100).toFixed(2));
    totalMissingCells += missingCount;

    // Detect data type
    const dataType = detectColumnType(colValues, header, options);

    // Unique count on non-missing
    const nonMissingValues = colValues.filter(v => !isMissingValue(v, options));
    const uniqueValues = new Set(nonMissingValues.map(v => String(v).trim()));
    const uniqueCount = uniqueValues.size;
    const uniquePercentage = totalRows > 0 ? Number(((uniqueCount / totalRows) * 100).toFixed(2)) : 0;

    let stats;
    if (dataType === 'Integer' || dataType === 'Float') {
      stats = computeNumericStats(colValues, options);
      numericalCols.push(header);
    } else if (dataType === 'Date') {
      stats = computeCategoricalStats(colValues, options);
      dateCols.push(header);
    } else if (dataType === 'ID / Key') {
      stats = computeCategoricalStats(colValues, options);
      idCols.push(header);
    } else if (dataType === 'Boolean') {
      stats = computeCategoricalStats(colValues, options);
      booleanCols.push(header);
    } else {
      stats = computeCategoricalStats(colValues, options);
      categoricalCols.push(header);
    }

    columnMetadata.push({
      name: header,
      dataType,
      totalCount: totalRows,
      missingCount,
      missingPercentage,
      uniqueCount,
      uniquePercentage,
      stats
    });
  });

  // Calculate duplicate rows (exact matches on dataset headers, ignoring internal __row_id)
  const seenHashes = new Set();
  let duplicateRowsCount = 0;
  rows.forEach(row => {
    const rowData = {};
    validHeaders.forEach(h => {
      rowData[h] = row[h];
    });
    const hash = JSON.stringify(rowData);
    if (seenHashes.has(hash)) {
      duplicateRowsCount++;
    } else {
      seenHashes.add(hash);
    }
  });

  const overallMissingRate = totalCells > 0 ? Number(((totalMissingCells / totalCells) * 100).toFixed(2)) : 0;

  // Rows with at least one missing value
  const rowsWithMissing = rows.filter(row =>
    validHeaders.some(h => isMissingValue(row[h], options))
  ).length;

  return {
    datasetLevel: {
      filename: metadata.filename || 'dataset.csv',
      fileSize: metadata.fileSize || 'N/A',
      totalRows,
      totalColumns,
      totalCells,
      totalMissingCells,
      overallMissingRate,
      rowsWithMissing,
      duplicateRowsCount,
      numericalColumns: numericalCols,
      categoricalColumns: categoricalCols,
      dateColumns: dateCols,
      idColumns: idCols,
      booleanColumns: booleanCols
    },
    columns: columnMetadata
  };
}
