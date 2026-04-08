/**
 * cmc7-ocr-parser — Public API entry point
 *
 * @remarks
 * Barrel file ONLY at root level (docs/05-regras.md §1.4).
 * No intermediate barrel files in subdirectories.
 */

export { createCMC7Reader } from './reader.js';

export type {
  CMC7Reader,
  CMC7ReaderOptions,
  ExperimentalOptions,
  CMC7Result,
  CMC7Fields,
  CMC7Validation,
  FrameQualityReport,
  ExperimentalResult,
  ParseWarning,
  QualityIssue,
  CMC7Error,
  CMC7NotFoundError,
  CMC7UnsupportedEnvError,
  CMC7InitError,
  CMC7InvalidInputError,
  CMC7PermissionError,
  EnvironmentInfo,
  ValidationError,
  BankSpec,
} from './types/index.js';
