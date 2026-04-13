// ─── Options ────────────────────────────────────────────────────────────────

/**
 * Options for initializing a CMC7Reader instance.
 * All fields are optional; defaults are documented per field.
 */
export interface CMC7ReaderOptions {
  /**
   * OCR recognition engine for CMC-7 characters.
   * - `'template'`: Template matching via OpenCV (default, zero-ML, ~0 KB extra)
   * - `'cnn'`: Lightweight CNN via onnxruntime-web (~1.5 MB lazy-loaded)
   * @defaultValue 'template'
   */
  recognitionMode?: 'template' | 'cnn';

  /**
   * Interval between frame analysis attempts in milliseconds.
   * The video stream runs at full framerate; only 1 frame per interval is analysed.
   * @defaultValue 300
   */
  frameIntervalMs?: number;

  /**
   * Minimum frame quality score (0–100) required before running OCR.
   * Frames below this threshold emit a `'frame-quality'` event and are skipped.
   * @defaultValue 40
   */
  minFrameQualityScore?: number;

  /**
   * Additional `MediaTrackConstraints` passed to `getUserMedia`.
   * `facingMode: 'environment'` is always requested on mobile regardless of this value.
   */
  cameraConstraints?: MediaTrackConstraints;

  /**
   * Base URL for loading static assets (WASM, ONNX model).
   * Allows hosting assets on your own CDN (docs/05-regras.md §4.1).
   * @defaultValue './'
   */
  assetsBaseUrl?: string;

  /** Experimental features — not recommended for production use. */
  experimental?: ExperimentalOptions;
}

export interface ExperimentalOptions {
  /**
   * Attempt to extract the handwritten numeric value from the check.
   * **Always returns `requiresConfirmation: true`** — never use without human review.
   * @defaultValue false
   */
  handwrittenValue?: boolean;
}

// ─── Result ─────────────────────────────────────────────────────────────────

/** The primary result returned after a successful CMC-7 recognition. */
export interface CMC7Result {
  /** Full raw CMC-7 string with Unicode characters (e.g. `"⑆001...⑊"`). */
  raw: string;
  /** Structured and parsed fields extracted from the CMC-7 line. */
  fields: CMC7Fields;
  /** Result of check-digit (DV) validation. */
  validation: CMC7Validation;
  /** Frame quality score at the time of recognition (0–100). */
  frameQuality: number;
  /** Total end-to-end processing time in milliseconds. */
  processingTimeMs: number;
  /** Experimental feature results (undefined if not enabled). */
  experimental?: ExperimentalResult;
}

/** Structured fields extracted from a CMC-7 line. */
export interface CMC7Fields {
  /** COMPE bank code (3 digits). `null` if not parseable. */
  bankCode: string | null;
  /** Branch/agency number. `null` if bank spec is unknown. */
  agency: string | null;
  /** Account number. `null` if bank spec is unknown. */
  account: string | null;
  /** Check number. `null` if bank spec is unknown. */
  checkNumber: string | null;
  /** Positions of the 5 CMC-7 delimiter symbols within the raw string. */
  symbolPositions: Record<'⑆' | '⑇' | '⑈' | '⑉' | '⑊', number[]>;
  /** Non-critical parsing warnings. */
  parseWarnings: ParseWarning[];
}

export type ParseWarning =
  | 'bank-spec-unknown' // Bank not in BankRegistry
  | 'ambiguous-field-length' // Cannot determine field length without spec
  | 'partial-parse'; // Only part of the line was confidently parsed

/** Validation result for CMC-7 check digits. */
export interface CMC7Validation {
  /** `true` only if all DVs validated AND no critical parsing errors. */
  isValid: boolean;
  /** `null` if bank code is unrecognised and DV cannot be computed. */
  bankCodeValid: boolean | null;
  /** Aggregate check-digit validation status. */
  checkDigitsValid: 'valid' | 'invalid' | 'unknown';
  /** Detailed per-field validation errors. */
  errors: ValidationError[];
}

/** Per-field check-digit validation error. */
export interface ValidationError {
  field: 'bankCode' | 'agency' | 'account' | 'checkNumber' | 'block1' | 'block2' | 'block3' | 'block4';
  expected: number;
  received: number;
  algorithm: 'mod10' | 'mod11' | 'unknown';
}

/** Frame quality report emitted before OCR. */
export interface FrameQualityReport {
  /** Aggregate quality score (0–100). */
  score: number;
  /** List of detected quality issues. */
  issues: QualityIssue[];
  /** 
   * Whether the frame meets requirements for OCR. 
   * Derived from score >= minFrameQualityScore.
   */
  shouldProcess: boolean;
  /** Actionable suggestion for the user. */
  suggestion?: 'move-closer' | 'reduce-glare' | 'stabilize' | 'improve-lighting';
}


export type QualityIssue =
  | 'blur'
  | 'low-contrast'
  | 'glare'
  | 'too-far'
  | 'angled'
  | 'no-strip-found';

/** Results from experimental features. */
export interface ExperimentalResult {
  handwrittenValue?: {
    value: string | null;
    /** Confidence score between 0 and 1. */
    confidence: number;
    /**
     * Always `true` — this result MUST be confirmed by a human before use.
     * This field is intentionally non-optional to prevent accidental misuse.
     */
    requiresConfirmation: true;
  };
}

// ─── Errors ─────────────────────────────────────────────────────────────────

/**
 * Union of all typed errors thrown by this library.
 * Use `error.type` to discriminate (docs/05-regras.md §2.5).
 */
export type CMC7Error =
  | CMC7NotFoundError
  | CMC7UnsupportedEnvError
  | CMC7InitError
  | CMC7InvalidInputError
  | CMC7PermissionError;

export interface CMC7NotFoundError {
  type: 'CMC7_NOT_FOUND';
  message: string;
  frameQuality: number;
}

export interface CMC7UnsupportedEnvError {
  type: 'UNSUPPORTED_ENVIRONMENT';
  message: string;
  environment: EnvironmentInfo;
  /** Actionable guidance in Portuguese for the end user. */
  userGuidance: string;
}

export interface CMC7InitError {
  type: 'INIT_ERROR';
  message: string;
  cause: 'wasm-load-failed' | 'model-load-failed' | 'webassembly-not-supported';
}

export interface CMC7InvalidInputError {
  type: 'INVALID_INPUT';
  message: string;
  receivedType: string;
}

export interface CMC7PermissionError {
  type: 'CAMERA_PERMISSION_DENIED';
  message: string;
}

// ─── Environment ─────────────────────────────────────────────────────────────

/** Information about the current browser environment. */
export interface EnvironmentInfo {
  isIOS: boolean;
  isSafari: boolean;
  /** true when running inside a WKWebView (iOS in-app browser) — camera unavailable */
  isWKWebView: boolean;
  hasCamera: boolean;
  isHTTPS: boolean;
}

// ─── Bank Registry ───────────────────────────────────────────────────────────

/** Specification for parsing and validating a specific bank's CMC-7 line. */
export interface BankSpec {
  /** COMPE code (3 digits), e.g. '001' for Banco do Brasil. */
  compeCode: string;
  name: string;
  dvAlgorithm: 'mod10' | 'mod11' | 'mod11-variant';
  block1Layout: Block1Layout;
  notes?: string;
}

export interface Block1Layout {
  agencyDigits: number;
  accountDigits: number;
  checkNumDigits: number;
}

// ─── Reader Interface ─────────────────────────────────────────────────────────

/**
 * The primary interface for interacting with the CMC-7 reader.
 * Obtain an instance via {@link createCMC7Reader}.
 */
export interface CMC7Reader {
  // Stream mode
  start(videoElement: HTMLVideoElement): Promise<void>;
  startCamera(container?: HTMLElement): Promise<HTMLVideoElement>;
  stop(): Promise<void>;

  // Static image mode
  readImage(
    input: HTMLImageElement | ImageBitmap | File | Blob | string,
  ): Promise<CMC7Result>;

  // Event emitter pattern
  on(event: 'result', handler: (result: CMC7Result) => void): this;
  on(event: 'frame-quality', handler: (report: FrameQualityReport) => void): this;
  on(event: 'error', handler: (error: CMC7Error) => void): this;
  on(event: 'unsupported-environment', handler: (info: EnvironmentInfo) => void): this;
  on(event: 'reading', handler: () => void): this;
  off(event: string, handler: (...args: unknown[]) => void): this;

  // AsyncIterator alternative (docs/03-arquitetura.md §4.1)
  [Symbol.asyncIterator](): AsyncIterator<CMC7Result>;

  // Extensibility (docs/03-arquitetura.md §3.3)
  registerBank(spec: BankSpec): void;
}

// ─── Worker Contract ──────────────────────────────────────────────────────────

export type WorkerAction = 'init' | 'process' | 'stop';

export interface WorkerMessage {
  action: WorkerAction;
  payload?: {
    bitmap?: ImageBitmap;
    options?: CMC7ReaderOptions;
    assetsBaseUrl?: string;
  };
}

export interface WorkerResponse {
  type: 'result' | 'quality' | 'error' | 'ready';
  payload?: CMC7Result | FrameQualityReport | CMC7Error | { status: 'ok' };
}
