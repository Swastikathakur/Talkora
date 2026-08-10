import { verifyWebhook } from '@clerk/express/webhooks';

import {
  syncUserFromClerk,
  deleteUserByClerkId,
} from '../services/user.service.js';

import logger from '../lib/logger.js';

export async function handleClerkWebhook(req, res) {
  try {
    const evt = await verifyWebhook(req);

    const eventType = evt.type;
    const data = evt.data;

    logger.info(
      {
        eventType,
        clerkId: data?.id,
      },
      'Received Clerk webhook'
    );

    switch (eventType) {
      case 'user.created':
      case 'user.updated': {
        const email =
          data.email_addresses?.find(
            (emailAddress) =>
              emailAddress.id === data.primary_email_address_id
          )?.email_address ||
          data.email_addresses?.[0]?.email_address;

        const fullname =
          [data.first_name, data.last_name]
            .filter(Boolean)
            .join(' ')
            .trim() || 'Unnamed User';

        const profilePic = data.image_url || '';

        await syncUserFromClerk({
          clerkId: data.id,
          email,
          fullname,
          profilePic,
        });

        break;
      }

      case 'user.deleted': {
        await deleteUserByClerkId(data.id);
        break;
      }

      default:
        logger.info(
          { eventType },
          'Ignoring unsupported Clerk webhook event'
        );
    }

    return res.status(200).json({
      success: true,
    });
  } catch (error) {
    logger.error(
      { err: error },
      'Failed to process Clerk webhook'
    );

    return res.status(400).json({
      success: false,
      message: 'Invalid webhook',
    });
  }
}