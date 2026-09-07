import { Ensemble } from '@kanaries/ml';
/**
 * Phase B — Data Quality Detection Engine
 *
 * This file contains detection-only logic.
 * It NEVER modifies or deletes the dataset.
 */

/**
 * Detect exact duplicate rows.
 *
 * __row_id is intentionally excluded because it is an
 * internal identifier assigned to every row.
 */
export function detectExactDuplicates(rows, headers) {
  const seen = new Map();
  const duplicates = [];

  rows.forEach((row, index) => {
    const rowKey = headers
      .map((header) => String(row[header] ?? '').trim())
      .join('|');

    if (seen.has(rowKey)) {
      const originalIndex = seen.get(rowKey);

      duplicates.push({
        row: index,
        duplicateOf: originalIndex,
        issueType: 'Exact Duplicate',
        detectionMethod: 'Exact Row Matching',
        severity: 'High',
        confidence: 1.0,
        reason: `This row has exactly the same values as row ${originalIndex}.`,
        recommendedAction: 'Review and remove duplicate after user approval.',
        values: { ...row }
      });
    } else {
      seen.set(rowKey, index);
    }
  });

  return duplicates;
}
/**
 * Detect statistical anomalies using Z-Score.
 *
 * Z = (x - mean) / standard deviation
 *
 * A value with |Z| > 3 is treated as a strong statistical outlier.
 */
export function detectZScoreAnomalies(rows, headers) {
  const anomalies = [];

  headers.forEach((header) => {
    const values = rows
      .map((row) => {
        const rawValue = row[header];

        if (
          rawValue === null ||
          rawValue === undefined ||
          String(rawValue).trim() === ''
        ) {
          return null;
        }

        const numericValue = Number(rawValue);
        return Number.isFinite(numericValue) ? numericValue : null;
      })
      .filter((value) => value !== null);

    if (values.length < 2) return;

    const mean =
      values.reduce((sum, value) => sum + value, 0) / values.length;

    const variance =
      values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) /
      values.length;

    const stdDev = Math.sqrt(variance);

    // If all values are identical, standard deviation is zero.
    if (stdDev === 0) return;

    rows.forEach((row, index) => {
      const rawValue = row[header];

      if (
        rawValue === null ||
        rawValue === undefined ||
        String(rawValue).trim() === ''
      ) {
        return;
      }

      const value = Number(rawValue);

      if (!Number.isFinite(value)) return;

      const zScore = (value - mean) / stdDev;

      if (Math.abs(zScore) > 3) {
        anomalies.push({
          row: index,
          column: header,
          originalValue: row[header],
          issueType: 'Statistical Anomaly',
          detectionMethod: 'Z-Score',
          severity: Math.abs(zScore) > 4 ? 'High' : 'Medium',
          confidence: Math.min(Math.abs(zScore) / 5, 1),
          reason: `Value ${value} is ${Math.abs(zScore).toFixed(
            2
          )} standard deviations away from the column mean (${mean.toFixed(
            2
          )}).`,
          recommendedAction:
            'Review the value before making any correction.',
          zScore: Number(zScore.toFixed(3))
        });
      }
    });
  });

  return anomalies;
}

/**
 * Detect statistical anomalies using the IQR method.
 *
 * IQR = Q3 - Q1
 * Lower bound = Q1 - 1.5 × IQR
 * Upper bound = Q3 + 1.5 × IQR
 */
export function detectIQRAnomalies(rows, headers) {
  const anomalies = [];

  headers.forEach((header) => {
    const values = rows
      .map((row) => {
        const rawValue = row[header];

        if (
          rawValue === null ||
          rawValue === undefined ||
          String(rawValue).trim() === ''
        ) {
          return null;
        }

        const numericValue = Number(rawValue);
        return Number.isFinite(numericValue) ? numericValue : null;
      })
      .filter((value) => value !== null)
      .sort((a, b) => a - b);

    if (values.length < 4) return;

    const q1 = calculatePercentile(values, 25);
    const q3 = calculatePercentile(values, 75);
    const iqr = q3 - q1;

    if (iqr === 0) return;

    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    rows.forEach((row, index) => {
      const rawValue = row[header];

      if (
        rawValue === null ||
        rawValue === undefined ||
        String(rawValue).trim() === ''
      ) {
        return;
      }

      const value = Number(rawValue);

      if (!Number.isFinite(value)) return;

      if (value < lowerBound || value > upperBound) {
        anomalies.push({
          row: index,
          column: header,
          originalValue: row[header],
          issueType: 'Statistical Anomaly',
          detectionMethod: 'IQR',
          severity: 'Medium',
          confidence: 0.9,
          reason: `Value ${value} lies outside the IQR bounds (${lowerBound.toFixed(
            2
          )} to ${upperBound.toFixed(2)}).`,
          recommendedAction:
            'Review the value before making any correction.',
          q1: Number(q1.toFixed(3)),
          q3: Number(q3.toFixed(3)),
          iqr: Number(iqr.toFixed(3)),
          lowerBound: Number(lowerBound.toFixed(3)),
          upperBound: Number(upperBound.toFixed(3))
        });
      }
    });
  });

  return anomalies;
}
/**
 * Calculate a percentile using linear interpolation.
 */
function calculatePercentile(sortedValues, percentile) {
  const position = (sortedValues.length - 1) * (percentile / 100);

  const lower = Math.floor(position);
  const upper = Math.ceil(position);

  if (lower === upper) {
    return sortedValues[lower];
  }

  const weight = position - lower;

  return (
    sortedValues[lower] +
    (sortedValues[upper] - sortedValues[lower]) * weight
  );
}
/**
 * Validate basic business/data-quality rules.
 *
 * Detection only — no values are changed.
 */
export function detectRuleViolations(rows, headers) {
  const violations = [];

  const headerMap = new Map(
    headers.map((header) => [header.toLowerCase().trim(), header])
  );

  const findHeader = (...names) => {
    for (const name of names) {
      const header = headerMap.get(name.toLowerCase());
      if (header) return header;
    }
    return null;
  };

  const addViolation = ({
    row,
    column,
    value,
    rule,
    reason,
    recommendedAction = 'Review and correct the value after user approval.',
    severity = 'High',
    confidence = 0.95
  }) => {
    violations.push({
      row,
      column,
      originalValue: value,
      issueType: 'Rule Violation',
      detectionMethod: 'Business Rule Validation',
      severity,
      confidence,
      reason,
      rule,
      recommendedAction
    });
  };

  /*
   * Rule 1: Age must be between 0 and 120.
   */
  const ageHeader = findHeader('age');

  if (ageHeader) {
    rows.forEach((row, index) => {
      const value = Number(row[ageHeader]);

      if (!Number.isFinite(value)) return;

      if (value < 0 || value > 120) {
        addViolation({
          row: index,
          column: ageHeader,
          value: row[ageHeader],
          rule: 'Age must be between 0 and 120.',
          reason: `Age value ${value} is outside the valid range of 0 to 120.`
        });
      }
    });
  }

  /*
   * Rule 2: Salary must be >= 0.
   */
  const salaryHeader = findHeader('salary');

  if (salaryHeader) {
    rows.forEach((row, index) => {
      const value = Number(row[salaryHeader]);

      if (!Number.isFinite(value)) return;

      if (value < 0) {
        addViolation({
          row: index,
          column: salaryHeader,
          value: row[salaryHeader],
          rule: 'Salary must be greater than or equal to 0.',
          reason: `Salary value ${value} is negative.`
        });
      }
    });
  }

  /*
   * Rule 3: Percentage must be between 0 and 100.
   */
  const percentageHeader = findHeader(
    'percentage',
    'percent',
    'score',
    'marks percentage'
  );

  if (percentageHeader) {
    rows.forEach((row, index) => {
      const value = Number(row[percentageHeader]);

      if (!Number.isFinite(value)) return;

      if (value < 0 || value > 100) {
        addViolation({
          row: index,
          column: percentageHeader,
          value: row[percentageHeader],
          rule: 'Percentage must be between 0 and 100.',
          reason: `Percentage value ${value} is outside the valid range of 0 to 100.`
        });
      }
    });
  }

  /*
   * Rule 4: Quantity must be >= 0.
   */
  const quantityHeader = findHeader('quantity', 'qty');

  if (quantityHeader) {
    rows.forEach((row, index) => {
      const value = Number(row[quantityHeader]);

      if (!Number.isFinite(value)) return;

      if (value < 0) {
        addViolation({
          row: index,
          column: quantityHeader,
          value: row[quantityHeader],
          rule: 'Quantity must be greater than or equal to 0.',
          reason: `Quantity value ${value} is negative.`
        });
      }
    });
  }

  return violations;
}
/**
 * Validate relationships between multiple columns.
 *
 * Detection only — no values are changed.
 */
export function detectCrossColumnViolations(rows, headers) {
  const violations = [];

  const headerMap = new Map(
    headers.map((header) => [header.toLowerCase().trim(), header])
  );

  const findHeader = (...names) => {
    for (const name of names) {
      const header = headerMap.get(name.toLowerCase());
      if (header) return header;
    }
    return null;
  };

  const addViolation = ({
    row,
    column,
    value,
    rule,
    reason,
    severity = 'High',
    confidence = 0.95
  }) => {
    violations.push({
      row,
      column,
      originalValue: value,
      issueType: 'Cross-Column Violation',
      detectionMethod: 'Cross-Column Validation',
      severity,
      confidence,
      reason,
      rule,
      recommendedAction:
        'Review the related values and correct them after user approval.'
    });
  };

  /*
   * Rule 1:
   * Quantity × Unit Price should equal Total.
   */
  const quantityHeader = findHeader('quantity', 'qty');
  const unitPriceHeader = findHeader(
    'unit price',
    'unit_price',
    'unitprice',
    'price per unit'
  );
  const totalHeader = findHeader('total', 'total price', 'total_price');

  if (quantityHeader && unitPriceHeader && totalHeader) {
    rows.forEach((row, index) => {
      const quantity = Number(row[quantityHeader]);
      const unitPrice = Number(row[unitPriceHeader]);
      const total = Number(row[totalHeader]);

      if (
        !Number.isFinite(quantity) ||
        !Number.isFinite(unitPrice) ||
        !Number.isFinite(total)
      ) {
        return;
      }

      const expectedTotal = quantity * unitPrice;

      // Small tolerance handles decimal/rounding differences.
      const tolerance = Math.max(0.01, Math.abs(expectedTotal) * 0.001);

      if (Math.abs(expectedTotal - total) > tolerance) {
        addViolation({
          row: index,
          column: `${quantityHeader}, ${unitPriceHeader}, ${totalHeader}`,
          value: `${quantity} × ${unitPrice} = ${total}`,
          rule: 'Quantity × Unit Price must equal Total.',
          reason: `Expected Total is ${expectedTotal.toFixed(
            2
          )}, but the recorded Total is ${total}.`
        });
      }
    });
  }

  /*
   * Rule 2:
   * Date of Birth should be earlier than Joining Date.
   */
  const dobHeader = findHeader(
    'dob',
    'date of birth',
    'birth date',
    'birthdate'
  );

  const joiningDateHeader = findHeader(
    'joining date',
    'joining_date',
    'joiningdate',
    'date of joining'
  );

  if (dobHeader && joiningDateHeader) {
    rows.forEach((row, index) => {
      const dob = new Date(row[dobHeader]);
      const joiningDate = new Date(row[joiningDateHeader]);

      if (
        Number.isNaN(dob.getTime()) ||
        Number.isNaN(joiningDate.getTime())
      ) {
        return;
      }

      if (dob >= joiningDate) {
        addViolation({
          row: index,
          column: `${dobHeader}, ${joiningDateHeader}`,
          value: `${row[dobHeader]} → ${row[joiningDateHeader]}`,
          rule: 'Date of Birth must be earlier than Joining Date.',
          reason: `Date of Birth (${row[dobHeader]}) is not earlier than Joining Date (${row[joiningDateHeader]}).`
        });
      }
    });
  }

  /*
   * Rule 3:
   * Discount should not be greater than Price.
   */
  const discountHeader = findHeader(
    'discount',
    'discount amount',
    'discount_amount'
  );

  const priceHeader = findHeader(
    'price',
    'selling price',
    'selling_price',
    'unit price',
    'unit_price'
  );

  if (discountHeader && priceHeader) {
    rows.forEach((row, index) => {
      const discount = Number(row[discountHeader]);
      const price = Number(row[priceHeader]);

      if (!Number.isFinite(discount) || !Number.isFinite(price)) {
        return;
      }

      if (discount > price) {
        addViolation({
          row: index,
          column: `${discountHeader}, ${priceHeader}`,
          value: `${discount} > ${price}`,
          rule: 'Discount must be less than or equal to Price.',
          reason: `Discount (${discount}) is greater than Price (${price}).`
        });
      }
    });
  }

  /*
   * Rule 4:
   * Start Date should not be after End Date.
   *
   * This is included here as a cross-column check as well,
   * so date relationships are available from this function too.
   */
  const startDateHeader = findHeader(
    'start date',
    'start_date',
    'startdate'
  );

  const endDateHeader = findHeader(
    'end date',
    'end_date',
    'enddate'
  );

  if (startDateHeader && endDateHeader) {
    rows.forEach((row, index) => {
      const startDate = new Date(row[startDateHeader]);
      const endDate = new Date(row[endDateHeader]);

      if (
        Number.isNaN(startDate.getTime()) ||
        Number.isNaN(endDate.getTime())
      ) {
        return;
      }

      if (startDate > endDate) {
        addViolation({
          row: index,
          column: `${startDateHeader}, ${endDateHeader}`,
          value: `${row[startDateHeader]} → ${row[endDateHeader]}`,
          rule: 'Start Date must be less than or equal to End Date.',
          reason: `Start Date (${row[startDateHeader]}) occurs after End Date (${row[endDateHeader]}).`
        });
      }
    });
  }

  return violations;
}
/**
 * Calculate Levenshtein distance between two strings.
 *
 * The distance represents the minimum number of
 * insertions, deletions, or substitutions needed
 * to transform one string into another.
 */
function levenshteinDistance(a, b) {
  const first = String(a ?? '').toLowerCase().trim();
  const second = String(b ?? '').toLowerCase().trim();

  if (first === second) return 0;
  if (first.length === 0) return second.length;
  if (second.length === 0) return first.length;

  const matrix = Array.from(
    { length: first.length + 1 },
    () => new Array(second.length + 1).fill(0)
  );

  for (let i = 0; i <= first.length; i++) {
    matrix[i][0] = i;
  }

  for (let j = 0; j <= second.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= first.length; i++) {
    for (let j = 1; j <= second.length; j++) {
      const cost = first[i - 1] === second[j - 1] ? 0 : 1;

      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[first.length][second.length];
}

/**
 * Convert Levenshtein distance into a similarity score.
 *
 * 1.0 = identical
 * 0.0 = completely different
 */
function stringSimilarity(a, b) {
  const first = String(a ?? '').toLowerCase().trim();
  const second = String(b ?? '').toLowerCase().trim();

  if (!first || !second) return 0;

  const distance = levenshteinDistance(first, second);
  const maxLength = Math.max(first.length, second.length);

  return 1 - distance / maxLength;
}
/**
 * Detect fuzzy duplicate records.
 *
 * Two rows are considered fuzzy duplicates when their
 * overall similarity is high but they are not exact duplicates.
 */
export function detectFuzzyDuplicates(rows, headers, threshold = 0.85) {
  const fuzzyDuplicates = [];

  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      let totalSimilarity = 0;
      let comparedColumns = 0;

      headers.forEach((header) => {
        const valueA = String(rows[i][header] ?? '').trim();
        const valueB = String(rows[j][header] ?? '').trim();

        // Ignore columns where both values are empty.
        if (!valueA && !valueB) return;

        totalSimilarity += stringSimilarity(valueA, valueB);
        comparedColumns++;
      });

      if (comparedColumns === 0) continue;

      const similarity = totalSimilarity / comparedColumns;

      // Exact duplicates are handled separately.
      if (similarity >= threshold && similarity < 1) {
        fuzzyDuplicates.push({
          row: j,
          similarTo: i,
          issueType: 'Fuzzy Duplicate',
          detectionMethod: 'Levenshtein Similarity',
          severity: similarity >= 0.95 ? 'High' : 'Medium',
          confidence: Number(similarity.toFixed(3)),
          similarity: Number(similarity.toFixed(3)),
          reason: `Row ${j} is approximately ${(similarity * 100).toFixed(
            1
          )}% similar to row ${i}.`,
          recommendedAction:
            'Review both records and merge or remove the duplicate after user approval.',
          values: { ...rows[j] },
          comparedWith: { ...rows[i] }
        });
      }
    }
  }

  return fuzzyDuplicates;
}
/**
 * Detect possible spelling mistakes and inconsistent
 * categorical values within the same column.
 *
 * Example:
 * Bangalore
 * Banglore
 *
 * The detector flags the uncommon value and suggests
 * the closest commonly occurring value.
 */
export function detectCategoryInconsistencies(
  rows,
  headers,
  threshold = 0.8
) {
  const inconsistencies = [];

  if (!rows || rows.length === 0) {
    return inconsistencies;
  }

  headers.forEach((header) => {
    const normalizedHeader = String(header)
      .toLowerCase()
      .replace(/[\s_-]/g, '');

    /*
     * Exclude columns that are unlikely to represent
     * categorical values.
     */
    const looksLikeId =
        normalizedHeader === 'id' ||
        normalizedHeader.endsWith('id') ||
        normalizedHeader.includes('usn') ||
        normalizedHeader.includes('rollno') ||
        normalizedHeader.includes('rollnumber') ||
        normalizedHeader.includes('studentnumber') ||
        normalizedHeader.includes('employeenumber') ||
        normalizedHeader.includes('name');

    const looksLikeDate =
        normalizedHeader.includes('date') ||
        normalizedHeader.includes('datetime') ||
        normalizedHeader.includes('timestamp') ||
        normalizedHeader.includes('dob');

    if (looksLikeId || looksLikeDate) {
        return;
    }

    /*
     * Collect non-empty string values and their frequencies.
     */
    const valueCounts = new Map();

    rows.forEach((row) => {
      const rawValue = row[header];

      if (
        rawValue === null ||
        rawValue === undefined ||
        String(rawValue).trim() === ''
      ) {
        return;
      }

      const value = String(rawValue).trim();

      // Ignore purely numeric values.
      if (Number.isFinite(Number(value))) {
        return;
      }

      valueCounts.set(
        value,
        (valueCounts.get(value) || 0) + 1
      );
    });

    const uniqueValues = [...valueCounts.keys()];
    const uniqueCount = uniqueValues.length;

    if (uniqueCount < 2) {
      return;
    }

    /*
     * A categorical column normally has a relatively small
     * number of unique values compared with the number of rows.
     *
     * This prevents columns such as Name or Date from being
     * incorrectly treated as categories.
     */
    const uniqueRatio = uniqueCount / rows.length;

    const looksLikeCategorical =
      uniqueCount <= Math.max(20, rows.length * 0.3) &&
      uniqueRatio <= 0.5;

    if (!looksLikeCategorical) {
      return;
    }

    /*
     * Compare less frequent categories with more frequent
     * categories. A highly similar value may indicate a
     * typo or inconsistent category spelling.
     */
    rows.forEach((row, rowIndex) => {
      const currentValue = String(
        row[header] ?? ''
      ).trim();

      if (
        !currentValue ||
        !valueCounts.has(currentValue)
      ) {
        return;
      }

      const currentCount =
        valueCounts.get(currentValue);

      let bestMatch = null;
      let bestSimilarity = 0;

      uniqueValues.forEach((candidate) => {
        if (candidate === currentValue) {
          return;
        }

        const candidateCount =
          valueCounts.get(candidate);

        /*
         * Prefer the more frequently occurring category
         * as the likely standard value.
         */
        if (candidateCount <= currentCount) {
          return;
        }

        const similarity = stringSimilarity(
          currentValue,
          candidate
        );

        if (
          similarity >= threshold &&
          similarity > bestSimilarity
        ) {
          bestSimilarity = similarity;
          bestMatch = candidate;
        }
      });

      if (bestMatch) {
        inconsistencies.push({
          row: rowIndex,
          column: header,
          originalValue: row[header],
          issueType: 'Category Inconsistency',
          detectionMethod: 'String Similarity',
          severity:
            bestSimilarity >= 0.9
              ? 'Medium'
              : 'Low',
          confidence: Number(
            bestSimilarity.toFixed(3)
          ),
          suggestedValue: bestMatch,
          reason:
            `"${currentValue}" is very similar to the ` +
            `more frequently occurring category ` +
            `"${bestMatch}".`,
          recommendedAction:
            `Review and consider standardizing ` +
            `"${currentValue}" to "${bestMatch}" ` +
            `after user approval.`
        });
      }
    });
  });

  return inconsistencies;
}
/**
 * Detect multivariate anomalies using Isolation Forest.
 *
 * Isolation Forest is useful when an observation looks unusual
 * because of a combination of multiple numerical features.
 *
 * Detection only — the dataset is never modified.
 */
export function detectIsolationForestAnomalies(
  rows,
  headers,
  contamination = 0.1
) {
  const anomalies = [];

  if (!rows || rows.length < 5) {
    return anomalies;
  }

  /*
   * Select numerical columns that are suitable for
   * multivariate anomaly detection.
   *
   * ID/key columns are excluded because their numerical
   * values usually represent identifiers, not measurements.
   */
  const numericHeaders = headers.filter((header) => {
    const normalizedHeader = String(header)
      .toLowerCase()
      .replace(/[\s_-]/g, '');

    const looksLikeId =
      normalizedHeader === 'id' ||
      normalizedHeader.endsWith('id') ||
      normalizedHeader.includes('usn') ||
      normalizedHeader.includes('rollno') ||
      normalizedHeader.includes('rollnumber') ||
      normalizedHeader.includes('studentnumber') ||
      normalizedHeader.includes('employeenumber');

    if (looksLikeId) return false;

    const numericValues = rows
      .map((row) => {
        const rawValue = row[header];

        if (
          rawValue === null ||
          rawValue === undefined ||
          String(rawValue).trim() === ''
        ) {
          return null;
        }

        const numericValue = Number(rawValue);
        return Number.isFinite(numericValue) ? numericValue : null;
      })
      .filter((value) => value !== null);

    return numericValues.length >= Math.max(3, rows.length * 0.5);
  });

  if (numericHeaders.length === 0) {
    return anomalies;
  }

  /*
   * Calculate median values for handling any remaining
   * missing/non-numeric values in the feature matrix.
   */
  const medians = {};

  numericHeaders.forEach((header) => {
    const values = rows
      .map((row) => {
        const rawValue = row[header];

        if (
          rawValue === null ||
          rawValue === undefined ||
          String(rawValue).trim() === ''
        ) {
          return null;
        }

        const numericValue = Number(rawValue);
        return Number.isFinite(numericValue) ? numericValue : null;
      })
      .filter((value) => value !== null)
      .sort((a, b) => a - b);

    if (values.length === 0) {
      medians[header] = 0;
      return;
    }

    const middle = Math.floor(values.length / 2);

    medians[header] =
      values.length % 2 === 0
        ? (values[middle - 1] + values[middle]) / 2
        : values[middle];
  });

  /*
   * Convert the dataset into a numerical matrix.
   *
   * Each row becomes:
   * [feature1, feature2, feature3, ...]
   */
  const featureMatrix = rows.map((row) =>
    numericHeaders.map((header) => {
      const rawValue = row[header];

      if (
        rawValue === null ||
        rawValue === undefined ||
        String(rawValue).trim() === ''
      ) {
        return medians[header];
      }

      const value = Number(rawValue);

      return Number.isFinite(value) ? value : medians[header];
    })
  );

  let isolationScores = null;

  try {
    if (Ensemble && Ensemble.IsolationForest) {
      const model = new Ensemble.IsolationForest(256, 100, contamination);
      model.fit(featureMatrix);
      const predictions = model.predict(featureMatrix);
      
      rows.forEach((row, index) => {
        if (predictions[index] === 1) {
          let score = typeof model.anomalyScore === 'function' ? model.anomalyScore(featureMatrix[index]) : contamination;
          const confidence = score !== null ? Math.min(Math.max(score, 0), 1) : contamination;
          anomalies.push({
            row: index,
            column: numericHeaders.join(', '),
            originalValue: numericHeaders.reduce((values, header) => {
              values[header] = row[header];
              return values;
            }, {}),
            issueType: 'Multivariate Anomaly',
            detectionMethod: 'Isolation Forest',
            severity: confidence >= 0.7 ? 'High' : 'Medium',
            confidence: Number(confidence.toFixed(3)),
            anomalyScore: score !== null ? Number(score.toFixed(3)) : null,
            reason: `This row was identified as unusual based on the combined pattern of ${numericHeaders.length} numerical features.`,
            recommendedAction: 'Review the related numerical values before making any correction.',
            featuresUsed: [...numericHeaders]
          });
        }
      });
    }
  } catch (error) {
    console.warn('Ensemble.IsolationForest external library execution skipped, running native JS Isolation Forest fallback:', error);
  }

  // Fallback to Native JS Isolation Forest if library failed or returned 0 anomalies
  if (anomalies.length === 0 && rows.length >= 4 && numericHeaders.length >= 1) {
    const scores = runPureJSIsolationForest(featureMatrix, contamination);
    
    // Determine dynamic threshold (top contamination % or score > 0.62)
    const sortedScores = [...scores].sort((a, b) => b - a);
    const thresholdIdx = Math.floor(scores.length * contamination);
    const threshold = Math.max(0.60, sortedScores[thresholdIdx] || 0.60);

    scores.forEach((score, index) => {
      if (score >= threshold) {
        const row = rows[index];
        const confidence = Math.min(0.99, Number((score).toFixed(3)));
        anomalies.push({
          row: index,
          column: numericHeaders.join(', '),
          originalValue: numericHeaders.reduce((values, header) => {
            values[header] = row[header];
            return values;
          }, {}),
          issueType: 'Multivariate Anomaly',
          detectionMethod: 'Isolation Forest',
          severity: confidence >= 0.75 ? 'High' : 'Medium',
          confidence: confidence,
          anomalyScore: Number(score.toFixed(3)),
          reason: `Unusual multi-attribute numerical profile detected by Isolation Forest (anomaly score: ${score.toFixed(3)}).`,
          recommendedAction: 'Review multi-feature values or winsorize bounds.',
          featuresUsed: [...numericHeaders]
        });
      }
    });
  }

  return anomalies;
}

/**
 * Pure JavaScript Isolation Forest Anomaly Detection Algorithm
 */
function runPureJSIsolationForest(featureMatrix, contamination = 0.05, numTrees = 50) {
  const n = featureMatrix.length;
  if (n < 4) return [];

  const numFeatures = featureMatrix[0].length;
  if (numFeatures === 0) return [];

  const c = (size) => {
    if (size <= 1) return 0;
    if (size === 2) return 1;
    return 2 * (Math.log(size - 1) + 0.5772156649) - (2 * (size - 1) / size);
  };

  const c_n = c(n);
  if (c_n === 0) return [];

  const trees = [];
  const subSampleSize = Math.min(n, 256);

  for (let t = 0; t < numTrees; t++) {
    const sample = [];
    for (let s = 0; s < subSampleSize; s++) {
      sample.push(featureMatrix[Math.floor(Math.random() * n)]);
    }

    const buildTree = (matrix, currentDepth = 0, maxDepth = 10) => {
      if (matrix.length <= 1 || currentDepth >= maxDepth) {
        return { size: matrix.length, isLeaf: true };
      }

      const featureIdx = Math.floor(Math.random() * numFeatures);
      const values = matrix.map(r => r[featureIdx]);
      const minVal = Math.min(...values);
      const maxVal = Math.max(...values);

      if (minVal === maxVal) {
        return { size: matrix.length, isLeaf: true };
      }

      const splitValue = minVal + Math.random() * (maxVal - minVal);
      const left = [];
      const right = [];
      matrix.forEach(row => {
        if (row[featureIdx] < splitValue) left.push(row);
        else right.push(row);
      });

      return {
        featureIdx,
        splitValue,
        isLeaf: false,
        left: buildTree(left, currentDepth + 1, maxDepth),
        right: buildTree(right, currentDepth + 1, maxDepth)
      };
    };

    trees.push(buildTree(sample));
  }

  const pathLength = (row, node, depth = 0) => {
    if (!node || node.isLeaf) {
      return depth + c(node ? node.size : 1);
    }
    if (row[node.featureIdx] < node.splitValue) {
      return pathLength(row, node.left, depth + 1);
    } else {
      return pathLength(row, node.right, depth + 1);
    }
  };

  return featureMatrix.map(row => {
    const totalPathLength = trees.reduce((acc, tree) => acc + pathLength(row, tree), 0);
    const avgPathLength = totalPathLength / numTrees;
    return Math.pow(2, - (avgPathLength / c_n));
  });
}
export function runDetectionEngine(rows, headers) {
  const duplicateResults = detectExactDuplicates(rows, headers);

  const zScoreResults = detectZScoreAnomalies(rows, headers);

  const iqrResults = detectIQRAnomalies(rows, headers);

  const isolationForestResults = detectIsolationForestAnomalies(
    rows,
    headers
  );

  const ruleViolationResults = detectRuleViolations(rows, headers);

  const crossColumnResults = detectCrossColumnViolations(
    rows,
    headers
  );

  const fuzzyDuplicateResults = detectFuzzyDuplicates(
    rows,
    headers
  );

  const inconsistencyResults = detectCategoryInconsistencies(
    rows,
    headers
  );

  const anomalyResults = [
    ...zScoreResults,
    ...iqrResults,
    ...isolationForestResults
  ];

  const allRuleViolations = [
    ...ruleViolationResults,
    ...crossColumnResults
  ];

  const totalIssues =
    duplicateResults.length +
    anomalyResults.length +
    allRuleViolations.length +
    fuzzyDuplicateResults.length +
    inconsistencyResults.length;

  const detectionSummary = {
    totalIssues,
    exactDuplicates: duplicateResults.length,
    statisticalAnomalies:
      zScoreResults.length + iqrResults.length,
    isolationForestAnomalies:
      isolationForestResults.length,
    ruleViolations:
      allRuleViolations.length,
    fuzzyDuplicates:
      fuzzyDuplicateResults.length,
    inconsistencies:
      inconsistencyResults.length
  };

  return {
    duplicate_results: duplicateResults,
    anomaly_results: anomalyResults,
    rule_violation_results: allRuleViolations,
    fuzzy_duplicate_results: fuzzyDuplicateResults,
    inconsistency_results: inconsistencyResults,
    detection_summary: detectionSummary
  };
}