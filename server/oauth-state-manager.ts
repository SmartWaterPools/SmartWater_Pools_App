/**
 * OAuth State Management with Database Storage
 * 
 * This module provides secure state management for OAuth flows using database storage
 * instead of in-memory storage. This prevents state loss during server restarts and
 * provides better security through automatic cleanup of expired states.
 */

import crypto from 'crypto';
import { storage } from './storage';
import { InsertOAuthState, OAuthState } from '@shared/schema';

// OAuth state configuration
const STATE_LENGTH = 32; // Length of state parameter in bytes
const STATE_TTL = 10 * 60 * 1000; // 10 minutes TTL for OAuth states

export interface PendingOAuthUserData {
  id: string; // Google ID
  email: string;
  displayName: string;
  photoUrl: string | null;
  profile: any; // Full OAuth profile
}

/**
 * Generate a secure OAuth state parameter
 */
export function generateOAuthState(): string {
  return crypto.randomBytes(STATE_LENGTH).toString('hex');
}

/**
 * Store OAuth state with pending user data
 * 
 * @param sessionId The session ID to associate with this state
 * @param userData Optional pending user data to store
 * @returns The generated state parameter
 */
export async function createOAuthState(
  sessionId: string,
  userData?: PendingOAuthUserData
): Promise<string> {
  const state = generateOAuthState();
  const expiresAt = new Date(Date.now() + STATE_TTL);

  try {
    await storage.createOAuthState({
      state,
      sessionId,
      userData: userData ? userData : null,
      expiresAt
    });
    
    console.log(`Created OAuth state: ${state} for session: ${sessionId}`);
    return state;
  } catch (error) {
    console.error('Failed to create OAuth state:', error);
    throw new Error('Failed to create OAuth state');
  }
}

/**
 * Validate and retrieve OAuth state
 * 
 * @param state The state parameter to validate
 * @param sessionId The session ID to verify
 * @returns The OAuth state data if valid, null otherwise
 */
export async function validateOAuthState(
  state: string,
  sessionId: string
): Promise<OAuthState | null> {
  try {
    const oauthState = await storage.getOAuthState(state);
    
    if (!oauthState) {
      console.warn(`OAuth state not found: ${state}`);
      return null;
    }
    
    // Check if state has expired
    if (new Date(oauthState.expiresAt) < new Date()) {
      console.warn(`OAuth state expired: ${state}`);
      await storage.deleteOAuthState(state);
      return null;
    }
    
    // Verify session ID matches
    if (oauthState.sessionId !== sessionId) {
      console.warn(`OAuth state session mismatch for state: ${state}`);
      return null;
    }
    
    return oauthState;
  } catch (error) {
    console.error('Failed to validate OAuth state:', error);
    return null;
  }
}

/**
 * Get pending user data from OAuth state
 * 
 * @param state The state parameter
 * @param sessionId The session ID to verify
 * @returns The pending user data if found, null otherwise
 */
export async function getPendingUserFromState(
  state: string,
  sessionId: string
): Promise<PendingOAuthUserData | null> {
  const oauthState = await validateOAuthState(state, sessionId);
  
  if (!oauthState || !oauthState.userData) {
    return null;
  }
  
  return oauthState.userData as PendingOAuthUserData;
}

/**
 * Store pending user data in OAuth state
 * 
 * @param state The state parameter
 * @param userData The user data to store
 * @returns True if successful, false otherwise
 */
export async function storePendingUserInState(
  state: string,
  userData: PendingOAuthUserData
): Promise<boolean> {
  try {
    const oauthState = await storage.getOAuthState(state);
    
    if (!oauthState) {
      console.error(`Cannot store pending user - state not found: ${state}`);
      return false;
    }
    
    // Update the OAuth state with user data
    await storage.updateOAuthState(oauthState.id, {
      userData: userData
    });
    
    console.log(`Stored pending user data for state: ${state}`);
    return true;
  } catch (error) {
    console.error('Failed to store pending user in state:', error);
    return false;
  }
}

/**
 * Delete OAuth state (cleanup after successful auth or cancellation)
 * 
 * @param state The state parameter to delete
 */
export async function deleteOAuthState(state: string): Promise<void> {
  try {
    await storage.deleteOAuthState(state);
    console.log(`Deleted OAuth state: ${state}`);
  } catch (error) {
    console.error('Failed to delete OAuth state:', error);
  }
}

/**
 * Cleanup expired OAuth states
 * This should be called periodically to remove expired states
 * 
 * @returns The number of states cleaned up
 */
export async function cleanupExpiredOAuthStates(): Promise<number> {
  try {
    const count = await storage.cleanupExpiredOAuthStates();
    if (count > 0) {
      console.log(`Cleaned up ${count} expired OAuth states`);
    }
    return count;
  } catch (error) {
    console.error('Failed to cleanup expired OAuth states:', error);
    return 0;
  }
}

// Schedule periodic cleanup of expired states (every hour)
setInterval(() => {
  cleanupExpiredOAuthStates().catch(console.error);
}, 60 * 60 * 1000);