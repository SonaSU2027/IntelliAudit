import React, { createContext, useState, useContext, useCallback } from 'react';
import { computeDatasetProfile } from '../utils/dataProfiler.js';
import { generateMissingRecommendations, executeImputation } from '../utils/missingHandler.js';

const DatasetContext = createContext();

export function useDataset() {
  const context = useContext(DatasetContext);
  if (!context) {
    throw new Error('useDataset must be used within a DatasetProvider');
  }
  return context;
}

export function DatasetProvider({ children }) {
  // Original Dataset: Immutable master copy with stable __row_id
  const [originalDataset, setOriginalDataset] = useState(null); // { headers: [], rows: [] }
  
  // Working Dataset: Active copy on which operations are applied with matching __row_id
  const [workingDataset, setWorkingDataset] = useState(null); // { headers: [], rows: [] }

  // Metadata & Profile
  const [metadata, setMetadata] = useState(null);
  const [datasetProfile, setDatasetProfile] = useState(null);
  const [columnMetadata, setColumnMetadata] = useState([]);
  
  // Profiling & Missing Detection Configuration Options
  const [profilingOptions, setProfilingOptions] = useState({
    includeAmbiguousMarkers: false, // '-' and '?' are not missing by default unless configured
    columnCustomMarkers: {} // Optional user-defined missing tokens per column, e.g. { "Date": ["INVALID_DATE"] }
  });

  // Missing Value Analysis & Recommendations
  const [missingRecommendations, setMissingRecommendations] = useState([]);
  const [imputationResults, setImputationResults] = useState([]);
  // Phase-B Detection Results
  const [detectionResults, setDetectionResults] = useState({
    duplicate_results: [],
    anomaly_results: [],
    rule_violation_results: [],
    fuzzy_duplicate_results: [],
    inconsistency_results: [],
    detection_summary: null
  });
  // Comprehensive Audit Trail
  const [auditLog, setAuditLog] = useState([]);
  
  // Loading & UI state
  const [loading, setLoading] = useState(false);

  /**
   * Initializes and profiles the uploaded dataset with stable __row_id
   */
  const loadDataset = useCallback((headers, rows, fileMeta, options = {}) => {
    // Filter out internal __row_id from dataset headers if present
    const cleanHeaders = headers.filter(h => h !== '__row_id');

    // Deep clone rows and assign stable internal __row_id preserved across both datasets
    const rawOriginalRows = rows.map((r, idx) => ({
      ...r,
      __row_id: r.__row_id !== undefined ? r.__row_id : idx + 1
    }));
    const rawWorkingRows = rows.map((r, idx) => ({
      ...r,
      __row_id: r.__row_id !== undefined ? r.__row_id : idx + 1
    }));

    const orig = { headers: [...cleanHeaders], rows: rawOriginalRows };
    const work = { headers: [...cleanHeaders], rows: rawWorkingRows };

    setOriginalDataset(orig);
    setWorkingDataset(work);

    const activeOptions = {
      ...profilingOptions,
      ...options,
      columnCustomMarkers: {
        ...(profilingOptions.columnCustomMarkers || {}),
        ...(options.columnCustomMarkers || {})
      }
    };
    if (options.includeAmbiguousMarkers !== undefined || options.columnCustomMarkers !== undefined) {
      setProfilingOptions(activeOptions);
    }

    const profile = computeDatasetProfile(cleanHeaders, rawWorkingRows, fileMeta, activeOptions);
    setDatasetProfile(profile);

    if (profile && profile.columns) {
      setColumnMetadata(profile.columns);
      const recs = generateMissingRecommendations(profile.columns, activeOptions);
      setMissingRecommendations(recs);
    } else {
      setColumnMetadata([]);
      setMissingRecommendations([]);
    }

    setMetadata({
      filename: fileMeta.filename || 'dataset.csv',
      totalRows: rows.length,
      totalColumns: cleanHeaders.length,
      fileSize: fileMeta.fileSize || 'N/A',
      uploadedAt: new Date().toLocaleTimeString(),
      status: 'Ready'
    });

    setImputationResults([]);
    // Reset Phase-B detection results for the newly uploaded dataset
    setDetectionResults({
      duplicate_results: [],
      anomaly_results: [],
      rule_violation_results: [],
      fuzzy_duplicate_results: [],
      inconsistency_results: [],
      detection_summary: null
    });
    setAuditLog([
      {
        id: 'log-0',
        operationId: 'op-init',
        timestamp: new Date().toLocaleTimeString(),
        action: 'Dataset Upload',
        category: 'Ingestion',
        decision: 'Ingested',
        details: `Loaded ${rows.length.toLocaleString()} rows and ${cleanHeaders.length} columns from ${fileMeta.filename || 'CSV'}. Original copy preserved with stable row IDs.`,
        status: 'Success'
      }
    ]);
  }, [profilingOptions]);

  /**
   * Updates missing detection options (e.g. toggling ambiguous markers or column-specific missing markers) and reprofiles
   */
  const updateProfilingOptions = useCallback((newOptions) => {
    setProfilingOptions(prev => {
      const updated = {
        ...prev,
        ...newOptions,
        columnCustomMarkers: {
          ...(prev.columnCustomMarkers || {}),
          ...(newOptions.columnCustomMarkers || {})
        }
      };

      if (workingDataset && workingDataset.headers && workingDataset.rows) {
        const updatedProfile = computeDatasetProfile(workingDataset.headers, workingDataset.rows, metadata || {}, updated);
        setDatasetProfile(updatedProfile);

        if (updatedProfile && updatedProfile.columns) {
          setColumnMetadata(updatedProfile.columns);
          const updatedRecs = generateMissingRecommendations(updatedProfile.columns, updated);
          setMissingRecommendations(updatedRecs);
        }
      }
      return updated;
    });
  }, [workingDataset, metadata]);

  /**
   * Applies an approved imputation on working_dataset with type-safety & rich audit records
   */
  const runImputation = useCallback((column, method, customValue = '', reason = '', customConfidence = null) => {
    if (!workingDataset || !workingDataset.rows) return null;

    // Detect column type for type-safe validation
    const colMeta = (columnMetadata || []).find(c => c.name === column);
    const columnType = colMeta?.dataType || '';

    let result;
    try {
      result = executeImputation(
        workingDataset.rows, 
        column, 
        method, 
        customValue, 
        columnType, 
        profilingOptions
      );
    } catch (err) {
      return {
        success: false,
        error: err.message
      };
    }

    if (!result) return null;

    // Create updated working dataset
    const newWorking = {
      headers: [...workingDataset.headers],
      rows: result.updatedRows
    };
    setWorkingDataset(newWorking);

    // Recompute profile for updated working dataset
    const updatedProfile = computeDatasetProfile(newWorking.headers, newWorking.rows, metadata || {}, profilingOptions);
    setDatasetProfile(updatedProfile);

    if (updatedProfile && updatedProfile.columns) {
      setColumnMetadata(updatedProfile.columns);
      const updatedRecs = generateMissingRecommendations(updatedProfile.columns, profilingOptions);
      setMissingRecommendations(updatedRecs);
    }

    const matchingRec = (missingRecommendations || []).find(r => r.column === column);
    const confidence = customConfidence !== null ? customConfidence : (matchingRec?.confidence || 85);
    const opId = `op-${Date.now()}-${column}`;
    const opTimestamp = new Date().toLocaleTimeString();

    // Comprehensive Imputation Result Entry
    const impRecord = {
      id: `imp-${Date.now()}`,
      operationId: opId,
      timestamp: opTimestamp,
      column,
      method,
      decision: 'Approved',
      confidence,
      reason: reason || `Applied ${method} imputation.`,
      replacementValue: result.replacementValue,
      affectedRowCount: result.affectedRowCount,
      affectedRows: result.affectedRows || [] // Array of { rowId, originalValue, newValue }
    };
    setImputationResults(prev => [...prev, impRecord]);

    // Comprehensive Audit Record Entry
    const auditRecord = {
      id: `log-${Date.now()}`,
      operationId: opId,
      timestamp: opTimestamp,
      action: `Missing Value Imputation (${method})`,
      category: 'Cleaning',
      column,
      method,
      decision: 'Approved',
      confidence,
      reason: reason || `Applied ${method} imputation.`,
      affectedRowCount: result.affectedRowCount,
      affectedRows: result.affectedRows || [],
      details: `Replaced ${result.affectedRowCount} missing cells in column '${column}' with value '${result.replacementValue}'.`,
      status: 'Approved & Applied'
    };
    setAuditLog(prev => [...prev, auditRecord]);

    return {
      success: true,
      ...impRecord
    };
  }, [workingDataset, columnMetadata, metadata, profilingOptions, missingRecommendations]);

  /**
   * Batch applies all approved recommendations with complete audit tracking
   */
  const runBatchImputations = useCallback((recsToApply) => {
    if (!workingDataset || !workingDataset.rows || !recsToApply || recsToApply.length === 0) return;

    let currentRows = workingDataset.rows.map(r => ({ ...r }));
    const appliedRecords = [];
    const newLogs = [];

    recsToApply.forEach(rec => {
      const colMeta = (columnMetadata || []).find(c => c.name === rec.column);
      const columnType = colMeta?.dataType || rec.dataType || '';

      try {
        const res = executeImputation(
          currentRows, 
          rec.column, 
          rec.recommendedMethod, 
          rec.suggestedValue,
          columnType,
          profilingOptions
        );
        currentRows = res.updatedRows;

        const opId = `op-${Date.now()}-${rec.column}`;
        const opTime = new Date().toLocaleTimeString();

        appliedRecords.push({
          id: `imp-${Date.now()}-${rec.column}`,
          operationId: opId,
          timestamp: opTime,
          column: rec.column,
          method: rec.recommendedMethod,
          decision: 'Approved',
          confidence: rec.confidence || 85,
          reason: rec.reason,
          replacementValue: res.replacementValue,
          affectedRowCount: res.affectedRowCount,
          affectedRows: res.affectedRows || []
        });

        newLogs.push({
          id: `log-${Date.now()}-${rec.column}`,
          operationId: opId,
          timestamp: opTime,
          action: `Batch Imputation (${rec.recommendedMethod})`,
          category: 'Cleaning',
          column: rec.column,
          method: rec.recommendedMethod,
          decision: 'Approved',
          confidence: rec.confidence || 85,
          reason: rec.reason,
          affectedRowCount: res.affectedRowCount,
          affectedRows: res.affectedRows || [],
          details: `Replaced ${res.affectedRowCount} missing cells in '${rec.column}' with '${res.replacementValue}'.`,
          status: 'Approved & Applied'
        });
      } catch (err) {
        console.error(`Batch imputation failed for ${rec.column}:`, err.message);
      }
    });

    const newWorking = {
      headers: [...workingDataset.headers],
      rows: currentRows
    };
    setWorkingDataset(newWorking);

    const updatedProfile = computeDatasetProfile(newWorking.headers, newWorking.rows, metadata || {}, profilingOptions);
    setDatasetProfile(updatedProfile);

    if (updatedProfile && updatedProfile.columns) {
      setColumnMetadata(updatedProfile.columns);
      const updatedRecs = generateMissingRecommendations(updatedProfile.columns, profilingOptions);
      setMissingRecommendations(updatedRecs);
    }

    setImputationResults(prev => [...prev, ...appliedRecords]);
    setAuditLog(prev => [...prev, ...newLogs]);
  }, [workingDataset, columnMetadata, metadata, profilingOptions]);

  /**
   * Reverts working dataset back to original dataset without erasing historical audit records
   */
  const resetToOriginal = useCallback(() => {
    if (!originalDataset) return;
    const restoredRows = originalDataset.rows.map(r => ({ ...r }));
    const restoredDataset = { headers: [...originalDataset.headers], rows: restoredRows };
    
    setWorkingDataset(restoredDataset);

    const restoredProfile = computeDatasetProfile(restoredDataset.headers, restoredDataset.rows, metadata || {}, profilingOptions);
    setDatasetProfile(restoredProfile);

    if (restoredProfile && restoredProfile.columns) {
      setColumnMetadata(restoredProfile.columns);
      const restoredRecs = generateMissingRecommendations(restoredProfile.columns, profilingOptions);
      setMissingRecommendations(restoredRecs);
    }

    // Record the rollback event in the persistent audit log
    const resetAuditRecord = {
      id: `log-${Date.now()}`,
      operationId: `reset-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      action: 'Reset to Original Dataset',
      category: 'Rollback',
      decision: 'Reset',
      details: 'Reverted working dataset back to original raw state. Historical operations preserved.',
      status: 'Restored'
    };
    setAuditLog(prev => [...prev, resetAuditRecord]);
  }, [originalDataset, metadata, profilingOptions]);

  const clearDataset = useCallback(() => {
    setOriginalDataset(null);
    setWorkingDataset(null);
    setMetadata(null);
    setDatasetProfile(null);
    setColumnMetadata([]);
    setMissingRecommendations([]);
    setImputationResults([]);

    // Clear Phase-B detection results
    setDetectionResults({
      duplicate_results: [],
      anomaly_results: [],
      rule_violation_results: [],
      fuzzy_duplicate_results: [],
      inconsistency_results: [],
      detection_summary: null
    });

    setAuditLog([]);
  }, []);

  // Backward compatibility alias: `dataset` refers to `workingDataset`
  const dataset = workingDataset;
  const setDataset = (data) => {
    if (data && data.headers && data.rows) {
      loadDataset(data.headers, data.rows, metadata || {});
    }
  };

  const value = {
    // Datasets (Both camelCase and snake_case outputs)
    originalDataset,
    workingDataset,
    original_dataset: originalDataset,
    working_dataset: workingDataset,
    dataset, // alias for workingDataset
    setDataset,
    
    // Metadata & Profiles
    metadata,
    setMetadata,
    datasetProfile,
    dataset_profile: datasetProfile,
    columnMetadata,
    column_metadata: columnMetadata,
    profilingOptions,
    updateProfilingOptions,
    
    // Missing & Imputation
    missingRecommendations,
    missing_value_report: missingRecommendations,
    imputationResults,
    imputation_results: imputationResults,

    // Phase-B Detection
    detectionResults,
    detection_results: detectionResults,
    setDetectionResults,
    
    // Audit Trail
    auditLog,
    audit_log: auditLog,
    
    // State & Handlers
    loading,
    setLoading,
    loadDataset,
    runImputation,
    runBatchImputations,
    resetToOriginal,
    clearDataset
  };

  return (
    <DatasetContext.Provider value={value}>
      {children}
    </DatasetContext.Provider>
  );
}
