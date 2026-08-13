import { User } from '../models/User';

/**
 * Sends a push notification to a user via Expo's push notification service.
 * Ref: https://docs.expo.dev/push-notifications/sending-notifications/
 */
export async function sendPushNotification(
  userId: string | any,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> {
  try {
    const user = await User.findById(userId);
    if (!user || !user.pushToken) {
      console.log(`[Push Notification] User ${userId} has no registered push token. Skipping.`);
      return;
    }

    console.log(`[Push Notification] Dispatching: to=${user.pushToken} title="${title}" body="${body}"`);

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        to: user.pushToken,
        sound: 'default',
        title,
        body,
        data,
      }),
    });

    const resData = await response.json() as any;
    if (resData.errors) {
      console.error('[Push Notification] Expo API errors:', resData.errors);
    } else {
      console.log('[Push Notification] Sent successfully:', JSON.stringify(resData.data));
    }
  } catch (error) {
    console.error('[Push Notification] Failed to send push notification:', error);
  }
}
