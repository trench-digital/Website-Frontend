/**
 * Trench PumpFun API SDK exports
 */

import { 
  TrenchPumpFunSDK,
  TrenchApiError,
  // Types
  type Creation,
  type CreationCall,
  type UserCallsResponse,
  type KeywordDetail,
  type CallerStats,
  type PaginationInfo,
  type Period,
  type SortOrder
} from './trenchPumpFunSdk';

// Create default SDK instance
const TrenchSDK = new TrenchPumpFunSDK();

// Export default instance
export default TrenchSDK;

// Export class
export {
  TrenchPumpFunSDK,
  TrenchApiError,
};

// Export types
export type {
  Creation,
  CreationCall,
  UserCallsResponse,
  KeywordDetail,
  CallerStats,
  PaginationInfo,
  Period,
  SortOrder
}; 