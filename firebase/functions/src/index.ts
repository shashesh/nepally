import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

/**
 * Scheduled function to expire old posts
 * Runs daily at midnight
 */
export const expirePosts = functions.pubsub
  .schedule('0 0 * * *')
  .timeZone('America/Chicago')
  .onRun(async (context) => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();

    try {
      // Find all active posts that have expired
      const expiredPosts = await db
        .collection('posts')
        .where('status', '==', 'active')
        .where('expiryDate', '<=', now)
        .get();

      console.log(`Found ${expiredPosts.size} expired posts`);

      // Update status to 'expired' in batches
      const batch = db.batch();
      expiredPosts.forEach((doc) => {
        batch.update(doc.ref, { status: 'expired' });
      });

      await batch.commit();
      console.log(`Expired ${expiredPosts.size} posts`);

      return null;
    } catch (error) {
      console.error('Error expiring posts:', error);
      throw error;
    }
  });

/**
 * Trigger when a new user is created
 * Initialize user document in Firestore
 */
export const onUserCreate = functions.auth.user().onCreate(async (user) => {
  const db = admin.firestore();

  try {
    await db.collection('users').doc(user.uid).set({
      email: user.email,
      name: user.displayName || '',
      phoneVerified: false,
      trustLevel: 0, // Start as Level 0 (New)
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastActiveAt: admin.firestore.FieldValue.serverTimestamp(),
      postsCount: 0,
      helpfulVotesReceived: 0,
      reportsReceived: 0,
      isBanned: false,
      isModerator: false,
    });

    console.log(`Created user document for ${user.uid}`);
  } catch (error) {
    console.error('Error creating user document:', error);
    throw error;
  }
});

/**
 * Trigger when a user is deleted
 * Clean up user data in Firestore
 */
export const onUserDelete = functions.auth.user().onDelete(async (user) => {
  const db = admin.firestore();

  try {
    // Delete user document
    await db.collection('users').doc(user.uid).delete();

    // TODO: Handle cleanup of user's posts, conversations, etc.
    console.log(`Deleted user document for ${user.uid}`);
  } catch (error) {
    console.error('Error deleting user data:', error);
    throw error;
  }
});

/**
 * Callable function to verify an emergency post
 * Only moderators can call this
 */
export const verifyEmergencyPost = functions.https.onCall(async (data, context) => {
  // Check authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  const { postId } = data;

  if (!postId) {
    throw new functions.https.HttpsError('invalid-argument', 'Post ID is required');
  }

  const db = admin.firestore();

  try {
    // Check if user is a moderator
    const userDoc = await db.collection('users').doc(context.auth.uid).get();
    const userData = userDoc.data();

    if (!userData?.isModerator) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only moderators can verify emergency posts'
      );
    }

    // Update post as verified
    const postRef = db.collection('posts').doc(postId);
    await postRef.update({
      'fields.verified': true,
      'fields.verifiedBy': context.auth.uid,
      'fields.verifiedAt': admin.firestore.FieldValue.serverTimestamp(),
      'fields.redAlertSent': false, // Will be sent by separate function
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // TODO: Trigger Red Alert notification to metro area

    return { success: true, postId };
  } catch (error) {
    console.error('Error verifying emergency post:', error);
    throw new functions.https.HttpsError('internal', 'Failed to verify post');
  }
});

/**
 * HTTP endpoint to get metro area by ZIP code
 * Uses static ZIP to Metro dataset
 */
export const getMetroByZip = functions.https.onRequest(async (req, res) => {
  const zipCode = req.query.zip as string;

  if (!zipCode || !/^\d{5}$/.test(zipCode)) {
    res.status(400).json({ error: 'Invalid ZIP code' });
    return;
  }

  const db = admin.firestore();

  try {
    // Query metro areas collection for matching ZIP
    const metroQuery = await db
      .collection('metroAreas')
      .where('zipCodes', 'array-contains', zipCode)
      .limit(1)
      .get();

    if (metroQuery.empty) {
      res.status(404).json({ error: 'Metro area not found for ZIP code' });
      return;
    }

    const metroData = metroQuery.docs[0].data();
    res.json({
      id: metroQuery.docs[0].id,
      ...metroData,
    });
  } catch (error) {
    console.error('Error fetching metro area:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
