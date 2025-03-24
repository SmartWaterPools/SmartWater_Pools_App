/**
 * Temporary Storage for Pending OAuth Users
 * 
 * This module provides in-memory storage for users who have authenticated with OAuth
 * but have not yet completed the registration process (selecting an organization or
 * creating a new one).
 */

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
 * Store a pending OAuth user
 */
export function storePendingOAuthUser(user: PendingOAuthUser): void {
  console.log(`Storing pending OAuth user: ${user.email} (${user.id})`);
  pendingOAuthUsers.set(user.id, {
    ...user,
    createdAt: new Date()
  });
  
  // Schedule cleanup
  setTimeout(() => {
    if (pendingOAuthUsers.has(user.id)) {
      console.log(`Removing expired pending OAuth user: ${user.email} (${user.id})`);
      pendingOAuthUsers.delete(user.id);
    }
  }, PENDING_USER_TTL);
}

/**
 * Get a pending OAuth user by Google ID
 */
export function getPendingOAuthUser(googleId: string): PendingOAuthUser | null {
  const user = pendingOAuthUsers.get(googleId);
  
  if (!user) {
    console.log(`Pending OAuth user not found: ${googleId}`);
    return null;
  }
  
  // Check if the user has expired
  const now = new Date();
  const expirationTime = new Date(user.createdAt.getTime() + PENDING_USER_TTL);
  
  if (now > expirationTime) {
    console.log(`Pending OAuth user has expired: ${user.email} (${googleId})`);
    pendingOAuthUsers.delete(googleId);
    return null;
  }
  
  return user;
}

/**
 * Remove a pending OAuth user after they've completed onboarding
 */
export function removePendingOAuthUser(googleId: string): void {
  if (pendingOAuthUsers.has(googleId)) {
    const user = pendingOAuthUsers.get(googleId);
    console.log(`Removing pending OAuth user: ${user?.email} (${googleId})`);
    pendingOAuthUsers.delete(googleId);
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
 * Clean up expired pending OAuth users
 * This can be called periodically to free up memory
 */
export function cleanupExpiredPendingUsers(): void {
  const now = new Date();
  let cleanupCount = 0;
  
  pendingOAuthUsers.forEach((user, id) => {
    const expirationTime = new Date(user.createdAt.getTime() + PENDING_USER_TTL);
    
    if (now > expirationTime) {
      pendingOAuthUsers.delete(id);
      cleanupCount++;
    }
  });
  
  if (cleanupCount > 0) {
    console.log(`Cleaned up ${cleanupCount} expired pending OAuth users`);
  }
}