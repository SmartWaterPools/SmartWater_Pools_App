/**
 * Temporary Storage for Pending OAuth Users
 * 
 * This module provides storage for users who have authenticated with OAuth
 * but have not yet completed the registration process (selecting an organization or
 * creating a new one).
 * 
 * It uses both in-memory storage and session storage to ensure persistence.
 */

import { Request } from 'express';

export interface PendingOAuthUser {
  id: string; // Using Google ID as the unique identifier
  email: string;
  displayName: string;
  photoUrl: string | null;
  profile: any; // The full OAuth profile data
  createdAt: Date;
}

// In-memory storage for pending OAuth users
const pendingOAuthUsers: Map<string, PendingOAuthUser> = new Map();

// How long to keep pending users in memory (30 minutes)
const PENDING_USER_TTL = 30 * 60 * 1000;

/**
 * Store a pending OAuth user in memory and session if available
 */
export function storePendingOAuthUser(user: PendingOAuthUser, req?: Request): void {
  console.log(`[OAUTH] Storing pending OAuth user: ${user.email} (${user.id})`);
  
  // Ensure createdAt is set
  const userWithDate = {
    ...user,
    createdAt: user.createdAt || new Date()
  };
  
  // Store in memory
  pendingOAuthUsers.set(user.id, userWithDate);
  
  // If request object is provided, store in session too
  if (req?.session) {
    console.log(`[OAUTH] Storing pending OAuth user in session: ${user.email}`);
    // Use bracket notation to avoid TypeScript errors
    req.session['pendingOAuthUsers'] = req.session['pendingOAuthUsers'] || {};
    req.session['pendingOAuthUsers'][user.id] = {
      ...userWithDate,
      createdAt: userWithDate.createdAt.toISOString() // Convert Date to string for session storage
    };
    
    // Save session explicitly to ensure persistence
    req.session.save((err: any) => {
      if (err) {
        console.error(`[ERROR] Failed to save session with pending OAuth user:`, err);
      } else {
        console.log(`[OAUTH] Session saved with pending OAuth user: ${user.email}`);
      }
    });
  } else {
    console.log(`[OAUTH] No session available for storing pending OAuth user: ${user.email}`);
  }
  
  // Schedule cleanup
  setTimeout(() => {
    if (pendingOAuthUsers.has(user.id)) {
      console.log(`[OAUTH] Removing expired pending OAuth user: ${user.email} (${user.id})`);
      pendingOAuthUsers.delete(user.id);
    }
  }, PENDING_USER_TTL);
}

/**
 * Get a pending OAuth user by Google ID from memory or session
 * 
 * @param googleId The Google ID of the pending OAuth user
 * @param req Express request object (optional)
 */
export function getPendingOAuthUser(googleId: string, req?: any): PendingOAuthUser | null {
  // For debugging purposes, list all pending OAuth users
  const allUsers = Array.from(pendingOAuthUsers.entries());
  console.log(`[OAUTH DEBUG] Looking for pending OAuth user with googleId: ${googleId}`);
  console.log(`[OAUTH DEBUG] Currently have ${allUsers.length} pending users in memory`);
  
  if (allUsers.length > 0) {
    console.log(`[OAUTH DEBUG] Pending users in memory: ${allUsers.map(([id, user]) => 
      `${id} (${user.email}) created at ${user.createdAt.toISOString()}`).join(', ')}`);
  }
  
  // First try to get from memory
  let user = pendingOAuthUsers.get(googleId);
  
  // If not in memory, try to get from session
  if (!user && req?.session && req.session['pendingOAuthUsers'] && req.session['pendingOAuthUsers'][googleId]) {
    console.log(`[OAUTH DEBUG] Pending user not found in memory, checking session for ${googleId}`);
    
    const sessionUser = req.session['pendingOAuthUsers'][googleId];
    if (sessionUser) {
      console.log(`[OAUTH DEBUG] Found pending user in session: ${sessionUser.email}`);
      
      // Convert createdAt string back to Date object
      user = {
        ...sessionUser,
        createdAt: sessionUser.createdAt instanceof Date ? 
          sessionUser.createdAt : new Date(sessionUser.createdAt)
      };
      
      // Also restore to memory
      pendingOAuthUsers.set(googleId, user);
      console.log(`[OAUTH DEBUG] Restored pending user from session to memory: ${user.email}`);
    }
  }
  
  if (!user) {
    console.log(`[ERROR] Pending OAuth user not found in memory or session: ${googleId}`);
    
    // For testing/debugging, create a placeholder user if needed
    // This is only for development and should be removed in production
    if (process.env.NODE_ENV !== 'production' && googleId === 'test-googleid') {
      console.log(`[OAUTH DEBUG] Creating test pending OAuth user for googleId: ${googleId}`);
      const testUser: PendingOAuthUser = {
        id: 'test-googleid',
        email: 'test@example.com',
        displayName: 'Test User',
        photoUrl: null,
        profile: {},
        createdAt: new Date()
      };
      pendingOAuthUsers.set(googleId, testUser);
      return testUser;
    }
    
    return null;
  }
  
  // Check if the user has expired
  const now = new Date();
  const expirationTime = new Date(user.createdAt.getTime() + PENDING_USER_TTL);
  
  if (now > expirationTime) {
    console.log(`[ERROR] Pending OAuth user has expired: ${user.email} (${googleId})`);
    console.log(`[OAUTH DEBUG] Created: ${user.createdAt.toISOString()}, Expired: ${expirationTime.toISOString()}, Now: ${now.toISOString()}`);
    
    // Clear from both memory and session
    pendingOAuthUsers.delete(googleId);
    if (req?.session && req.session['pendingOAuthUsers'] && req.session['pendingOAuthUsers'][googleId]) {
      delete req.session['pendingOAuthUsers'][googleId];
      req.session.save();
    }
    
    return null;
  }
  
  console.log(`[OAUTH DEBUG] Found valid pending OAuth user: ${user.email} (${googleId})`);
  return user;
}

/**
 * Remove a pending OAuth user after they've completed onboarding
 * 
 * @param googleId The Google ID of the pending OAuth user
 * @param req Express request object (optional)
 */
export function removePendingOAuthUser(googleId: string, req?: any): void {
  // Remove from memory
  if (pendingOAuthUsers.has(googleId)) {
    const user = pendingOAuthUsers.get(googleId);
    console.log(`[OAUTH] Removing pending OAuth user from memory: ${user?.email} (${googleId})`);
    pendingOAuthUsers.delete(googleId);
  }
  
  // Also remove from session if available
  if (req?.session && req.session['pendingOAuthUsers'] && req.session['pendingOAuthUsers'][googleId]) {
    console.log(`[OAUTH] Removing pending OAuth user from session: ${googleId}`);
    delete req.session['pendingOAuthUsers'][googleId];
    
    // Save session
    req.session.save((err: any) => {
      if (err) {
        console.error(`[ERROR] Failed to save session after removing pending OAuth user:`, err);
      }
    });
  }
}

/**
 * Get all pending OAuth users
 * This is primarily for debugging and cleanup
 */
export function getAllPendingOAuthUsers(): PendingOAuthUser[] {
  return Array.from(pendingOAuthUsers.values());
}

/**
 * Clean up expired pending OAuth users from memory and all active sessions
 * This can be called periodically to free up memory
 * 
 * @param req Express request object (optional)
 */
export function cleanupExpiredPendingUsers(req?: any): void {
  const now = new Date();
  let memoryCleanupCount = 0;
  
  // Clean up memory storage
  pendingOAuthUsers.forEach((user, id) => {
    const expirationTime = new Date(user.createdAt.getTime() + PENDING_USER_TTL);
    
    if (now > expirationTime) {
      pendingOAuthUsers.delete(id);
      memoryCleanupCount++;
    }
  });
  
  if (memoryCleanupCount > 0) {
    console.log(`[OAUTH] Cleaned up ${memoryCleanupCount} expired pending OAuth users from memory`);
  }
  
  // Clean up session storage if available
  if (req?.session && req.session['pendingOAuthUsers']) {
    let sessionCleanupCount = 0;
    const pendingUsers = req.session['pendingOAuthUsers'] as Record<string, any>;
    
    Object.keys(pendingUsers).forEach(id => {
      const user = pendingUsers[id];
      // Convert string date back to Date object for comparison
      const createdAt = new Date(user.createdAt);
      const expirationTime = new Date(createdAt.getTime() + PENDING_USER_TTL);
      
      if (now > expirationTime) {
        delete pendingUsers[id];
        sessionCleanupCount++;
      }
    });
    
    if (sessionCleanupCount > 0) {
      console.log(`[OAUTH] Cleaned up ${sessionCleanupCount} expired pending OAuth users from session`);
      
      // Save session
      req.session.save((err: any) => {
        if (err) {
          console.error(`[ERROR] Failed to save session after cleaning up pending OAuth users:`, err);
        }
      });
    }
  }
}