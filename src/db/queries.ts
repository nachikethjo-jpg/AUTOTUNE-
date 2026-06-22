import { eq, and } from 'drizzle-orm';
import { getDb } from './index.ts';
import { users, tunes } from './schema.ts';

// Synchronize or retrieve user details securely inside Cloud SQL
export async function getOrCreateUser(uid: string, email: string) {
  try {
    const db = getDb();
    const result = await db.insert(users)
      .values({
        uid,
        email,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query (getOrCreateUser) failed:', error);
    throw new Error('Database user synchronization failed.', { cause: error });
  }
}

// Retrieve custom saved remapping calibrations for a user
export async function getUserTunes(uid: string) {
  try {
    const db = getDb();
    
    // Join tunes and users to check ownership based on Firebase UID
    const results = await db.select({
      id: tunes.id,
      brand: tunes.brand,
      model: tunes.model,
      engineName: tunes.engineName,
      ecuModel: tunes.ecuModel,
      fuelType: tunes.fuelType,
      stockHp: tunes.stockHp,
      stockTorque: tunes.stockTorque,
      suggestedPeakHp: tunes.suggestedPeakHp,
      suggestedPeakTorque: tunes.suggestedPeakTorque,
      recommendation: tunes.recommendation,
      expectedGainsSummary: tunes.expectedGainsSummary,
      suggestedOffsetIgnitionDegrees: tunes.suggestedOffsetIgnitionDegrees,
      suggestedOffsetBoostPct: tunes.suggestedOffsetBoostPct,
      checksumHex: tunes.checksumHex,
      createdAt: tunes.createdAt,
    })
    .from(tunes)
    .innerJoin(users, eq(tunes.userId, users.id))
    .where(eq(users.uid, uid));

    return results;
  } catch (error) {
    console.error('Database query (getUserTunes) failed:', error);
    throw new Error('Failed to retrieve tuning history from database.', { cause: error });
  }
}

// Add a new remapping record linked to the user
export async function saveTune(
  uid: string,
  tuneData: {
    brand: string;
    model: string;
    engineName: string;
    ecuModel: string;
    fuelType: string;
    stockHp: number;
    stockTorque: number;
    suggestedPeakHp?: number;
    suggestedPeakTorque?: number;
    recommendation?: string;
    expectedGainsSummary?: string;
    suggestedOffsetIgnitionDegrees?: number;
    suggestedOffsetBoostPct?: number;
    checksumHex?: string;
  }
) {
  try {
    // 1. Get user record to resolve serial ID
    const user = await getOrCreateUser(uid, '');
    if (!user) {
      throw new Error('User record could not be resolved or created');
    }

    const db = getDb();
    const result = await db.insert(tunes)
      .values({
        userId: user.id,
        brand: tuneData.brand,
        model: tuneData.model,
        engineName: tuneData.engineName,
        ecuModel: tuneData.ecuModel,
        fuelType: tuneData.fuelType,
        stockHp: tuneData.stockHp,
        stockTorque: tuneData.stockTorque,
        suggestedPeakHp: tuneData.suggestedPeakHp,
        suggestedPeakTorque: tuneData.suggestedPeakTorque,
        recommendation: tuneData.recommendation,
        expectedGainsSummary: tuneData.expectedGainsSummary,
        suggestedOffsetIgnitionDegrees: tuneData.suggestedOffsetIgnitionDegrees,
        suggestedOffsetBoostPct: tuneData.suggestedOffsetBoostPct,
        checksumHex: tuneData.checksumHex,
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query (saveTune) failed:', error);
    throw new Error('Failed to save tuning map to database.', { cause: error });
  }
}

// Delete a saved remapping record securely
export async function deleteTune(uid: string, tuneId: number) {
  try {
    const user = await getOrCreateUser(uid, '');
    if (!user) {
      throw new Error('User record could not be resolved');
    }

    const db = getDb();
    const result = await db.delete(tunes)
      .where(
        and(
          eq(tunes.id, tuneId),
          eq(tunes.userId, user.id)
        )
      )
      .returning();

    return result.length > 0;
  } catch (error) {
    console.error('Database query (deleteTune) failed:', error);
    throw new Error('Failed to delete tuning map from database.', { cause: error });
  }
}
