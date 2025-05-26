import {
  users,
  organizations,
  type User,
  type UpsertUser,
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

// Interface for storage operations needed by Replit Auth
export interface IStorage {
  // User operations (MANDATORY for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Organization operations
  getOrganizations(): Promise<any[]>;
  getOrganizationBySlug(slug: string): Promise<any | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User operations (MANDATORY for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Organization operations
  async getOrganizations(): Promise<any[]> {
    return await db.select().from(organizations);
  }

  async getOrganizationBySlug(slug: string): Promise<any | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.slug, slug));
    return org;
  }
}

export const storage = new DatabaseStorage();