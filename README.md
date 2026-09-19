# 🛡️ IntelliAudit

> **Explainable Data Quality Assessment, Real-Time Profiling & Intelligent Automated Data Cleaning Suite**

[![React](https://img.shields.io/badge/React-19.2.5-blue.svg?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.0.10-646CFF.svg?logo=vite&logoColor=white)](https://vite.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4.3-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen.svg)]()

---

## 📖 Introduction & Problem Overview

In modern machine learning, business intelligence, and enterprise data pipelines, **data cleaning consumes up to 80% of data scientists' time**. Real-world datasets are plagued with silent corruptions:
* **Concealed Missing Values:** Missing values encoded as custom sentinels (`N/A`, `NULL`, `?`, `-`, `none`, empty strings) that bypass standard `null` detectors.
* **Biased Imputations:** Arbitrary filling of missing values that shifts mean/median statistics, destroys variance, or distorts underlying distributions.
* **Black-Box Cleaning:** Scripted cleaning operations that lack audit trails, explainability, or before-vs-after validation.
* **Accidental Row Deletions:** Naive deduplication and row pruning that inadvertently discards critical data points.

### 💡 How IntelliAudit Solves This
**IntelliAudit** bridges the gap between manual scripting and black-box automation with an **Explainable, Human-in-the-Loop Data Auditing & Cleansing Workflow**:

$$\text{Ingest \& Validate} \longrightarrow \text{5D Profiling} \longrightarrow \text{Explainable AI Recommendations} \longrightarrow \text{Interactive Cleansing} \longrightarrow \text{Side-by-Side Diff} \longrightarrow \text{Compliance Audit Report}$$

1. **Deterministic & Dual-Dataset Preserving:** Retains an immutable baseline master dataset while executing auditable transformations on an active working copy.
2. **Explainable Heuristic Recommendations:** Suggests context-aware cleaning strategies backed by statistical skewness, interquartile range (IQR), and data type analysis.
3. **Distribution Shift Prevention:** Automatically flags post-cleaning distortions in central tendency and variance.
4. **End-to-End Compliance Auditing:** Generates verifiable, exportable audit reports complete with statistical visualization charts, synthetic benchmark accuracy scores, and system bug tracking.

---

## ✨ Key Features

### 1. Ingestion & Dynamic Profiling
* **Multi-Format CSV Ingestion:** Drag-and-drop or manual upload with automatic delimiter detection and validation.
* **Custom Missing Sentinel Detection:** Identifies hidden null tokens across all fields (`NaN`, `NULL`, `N/A`, `none`, `nil`, `-`, `?`, `""`).
* **Automated Data Type Inference:** Infers `Integer`, `Float`, `Categorical`, `Date`, `ID / Key`, and `Boolean`.
* **Five-Number Summary & Distribution Metrics:** Mean, Median, Std Dev, Min/Max, Q1, Q3, IQR, and Fisher-Pearson Skewness coefficient.

### 2. 5-Dimensional Quality Scoring Engine
Evaluates dataset health in real time across 5 core dimensions:
* 📊 **Completeness:** Evaluates missingness density across records and attributes.
* 🔑 **Uniqueness:** Identifies full-row and primary key duplicates.
* 🎯 **Validity:** Validates conformance to data types, formats, and domain boundaries.
* 🔄 **Consistency:** Checks for uniform date formats, casing, and category representations.
* 🛡️ **Integrity:** Detects structural anomalies and cross-column contradictions.
* **Automated Grading:** Outputs dynamic quality scores ($0-100\%$) and letter grades (`A+`, `A`, `B`, `C`, `D`).

### 3. Intelligent Cleaning & Imputation Engine
* **Statistical Imputations:** Mean, Median, Mode, and Custom constant value assignment.
* **Two-Pass Sequential Imputation:** Robust **Forward Fill (ffill)** and **Backward Fill (bfill)** with boundary fallbacks to resolve series beginning or ending with nulls.
* **Explainable Strategy Recommendations:** Automatically selects the optimal technique (e.g., *Median* for skewed distributions with $|\text{Skewness}| > 0.8$, *Mean* for normal distributions, *Mode* for categorical columns) with confidence tiers ($80\% - 98\%$).
* **Flexible Deduplication:** Deduplicate by exact row match or custom primary-key subsets with *Keep First*, *Keep Last*, or *Drop All* policies.

### 4. Interactive Before vs. After Visual Diff
* **Side-by-Side Inspection:** Compare original vs. cleaned records with modified cells highlighted in real time.
* **Granular Diff Mode:** Isolate only modified or affected rows.
* **One-Click CSV Export:** Export clean, production-ready datasets instantly.

### 5. Multi-Tab Audit & Compliance Suite
* **Executive Summary & Visual Analytics:** 6 statistical charts visualizing quality score deltas, issue resolution breakdowns, column health improvements, and rule reliability distributions.
* **Post-Cleaning Validation:** Verifies that issue counts are reduced to zero or acceptable tolerance limits.
* **Distribution Shift & Side-Effect Alerts:** Alerts users if cleaning operations unintentionally alter the mean, median, or standard deviation beyond safety thresholds.
* **Synthetic Benchmark Testing:** Evaluates noise resistance and imputation accuracy against synthetic ground truth controls.
* **Bug Tracker & Verification:** Built-in tracker logging system bugs, affected modules, severity ratings, and fix verification statuses.

---

## 🧠 Core Architecture & Logical Components

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                                   INTELLIAUDIT                                   │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌────────────────────────┐      Deep Copy      ┌───────────────────────────┐   │
│   │    Original Dataset    │ ──────────────────> │      Working Dataset      │   │
│   │  (Immutable Master)    │                     │   (Active Cleaning Copy)  │   │
│   └───────────┬────────────┘                     └─────────────┬─────────────┘   │
│               │                                                │                 │
│               ▼                                                ▼                 │
│   ┌────────────────────────┐                     ┌───────────────────────────┐   │
│   │    dataProfiler.js     │                     │     missingHandler.js     │   │
│   │  • Type Inference      │                     │  • Imputation Algorithms  │   │
│   │  • 5-Number Summary    │                     │  • Two-Pass ffill/bfill   │   │
│   │  • 5D Quality Scoring  │                     │  • Explainable Heuristics │   │
│   └───────────┬────────────┘                     └─────────────┬─────────────┘   │
│               │                                                │                 │
│               ▼                                                ▼                 │
│   ┌──────────────────────────────────────────────────────────────────────────┐   │
│   │                    cleaningEngine.js & PhaseCContext                     │   │
│   │  • Action Pipeline & Rollback Execution                                  │   │
│   │  • Real-Time Delta Metric Computation                                    │   │
│   └─────────────────────────────────────┬────────────────────────────────────┘   │
│                                         │                                        │
│                                         ▼                                        │
│   ┌──────────────────────────────────────────────────────────────────────────┐   │
│   │                        auditReportGenerator.js                           │   │
│   │  • Distribution Shift Analyzer  • Post-Clean Verification                │   │
│   │  • Synthetic Benchmarking       • PDF & Compliance Documentation         │   │
│   └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Key Logical Engines:

1. **`src/utils/dataProfiler.js`**
   * Computes dataset-wide and column-specific metadata.
   * Performs statistical profiling (Mean, Median, Standard Deviation, IQR, Skewness).
   * Calculates multidimensional health metrics across Completeness, Uniqueness, Validity, Consistency, and Integrity.

2. **`src/utils/missingHandler.js`**
   * Implements deterministic imputation algorithms (`Mean`, `Median`, `Mode`, `Custom`, `ffill`, `bfill`).
   * Houses the Explainable Recommendation Engine that analyzes distribution skewness and cardinality to recommend the optimal imputation strategy.

3. **`src/phase_c/cleaningEngine.js`**
   * Orchestrates cleaning rule execution and operation pipelines.
   * Generates confidence scores and statistical reliability tiers for cleaning operations.

4. **`src/phase_c/auditReportGenerator.js`**
   * Compiles executive audit logs and distribution shift diagnostics.
   * Runs synthetic benchmark generators evaluating noise tolerance and imputation precision against controlled baselines.

5. **`src/contexts/DatasetContext.jsx` & `src/phase_c/PhaseCContext.jsx`**
   * Manages centralized reactive state with full rollback capabilities (`resetToOriginal()`).
   * Synchronizes before/after metrics and preserves audit logs across the application lifecycle.

---

## 🛠️ Technology Stack

| Category | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | React 19 (`react`, `react-dom`) | Declarative, component-based user interface |
| **Build Tool & Bundler** | Vite 8 | Lightning-fast HMR and optimized production bundling |
| **Styling & Design System** | Tailwind CSS v4 | Modern, responsive styling with Dark & Light theme support |
| **Routing** | React Router DOM v7 | Single-page application navigation and workflow routing |
| **Data Visualization** | Recharts | Responsive statistical charts, bar graphs, and score gauges |
| **Icons & UI Assets** | Lucide React | Clean, modern UI icon library |
| **CSV Parsing & Export** | PapaParse | In-browser CSV stream parsing and export generation |
| **PDF Report Generation** | jsPDF & HTML2Canvas | Client-side export of formatted audit certificates & compliance summaries |

---

## 📁 Project Folder Structure

```
IntelliAudit/
├── public/                     # Static public assets
├── src/
│   ├── assets/                 # App images, logos, and style tokens
│   ├── contexts/
│   │   ├── DatasetContext.jsx  # Dual-dataset state, profiling & imputation management
│   │   └── ThemeContext.jsx    # System-wide Light / Dark theme management
│   ├── layouts/
│   │   └── DashboardLayout.jsx # Master navigation header, workflow steps & breadcrumbs
│   ├── pages/
│   │   ├── Home.jsx            # Modern landing page & feature overview
│   │   ├── Workflow.jsx        # Step-by-step auditing stage selector
│   │   ├── Upload.jsx          # CSV intake, validation & delimiter checks
│   │   ├── Preview.jsx         # Statistical data profiler & raw data grid
│   │   ├── MissingValues.jsx   # Missing value detection, recommendations & imputation
│   │   ├── Duplicates.jsx      # Duplicate record detection & deduplication engine
│   │   ├── Dashboard.jsx       # Real-time data health overview
│   │   ├── CleanedPreview.jsx  # Final dataset preview page wrapper
│   │   └── Report.jsx          # Comprehensive 4-tab audit & compliance suite
│   ├── phase_c/                # Core Auditing & Cleansing Engine (Phase C)
│   │   ├── AuditReportView.jsx     # Document generator & analytical charts
│   │   ├── CleanedPreviewView.jsx  # Side-by-side diff viewer & CSV exporter
│   │   ├── CleaningActionsView.jsx # Automated rule recommendation & execution
│   │   ├── DashboardPhaseC.jsx     # Dynamic 5D quality score dashboard
│   │   ├── PhaseCContext.jsx       # State synchronization & delta metric provider
│   │   ├── auditReportGenerator.js # Distribution shift & benchmark logic
│   │   └── cleaningEngine.js       # Core rule execution engine
│   ├── utils/
│   │   ├── dataProfiler.js     # Statistical profiler, IQR, skewness & 5D scorer
│   │   └── missingHandler.js   # Imputation algorithms & explainable heuristics
│   ├── App.jsx                 # Route declarations & context providers
│   ├── index.css               # Tailwind CSS imports & global design tokens
│   └── main.jsx                # Application DOM mounting point
├── .gitignore                  # Git ignore configuration
├── package.json                # Project dependencies and npm scripts
├── vite.config.js              # Vite configuration
└── README.md                   # Project documentation
```

---

## 🚀 Getting Started & Local Setup

### Prerequisites
* **Node.js**: `v18.0.0` or higher ([Download Node.js](https://nodejs.org/))
* **npm**: `v9.0.0` or higher (bundled with Node.js)

### 1. Clone the Repository
```bash
git clone https://github.com/SonaSU2027/IntelliAudit.git
cd IntelliAudit
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run the Development Server
```bash
npm run dev
```
Open your browser and navigate to:
```
http://localhost:5173
```

### 4. Build for Production
To create an optimized production bundle:
```bash
npm run build
```

To preview the production build locally:
```bash
npm run preview
```

---


