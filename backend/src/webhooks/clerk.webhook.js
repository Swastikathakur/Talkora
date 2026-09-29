import { Webhook } from 'svix';

import { env } from '../config/env.js';
import {
  syncUserFromClerk,
  deleteUserByClerkId,
} from '../services/user.service.js';
import logger from '../lib/logger.js';

export async function handleClerkWebhook(req, res) {
  const svixHeaders = {
    'svix-id': req.headers['svix-id'],
    'svix-timestamp': req.headers['svix-timestamp'],
    'svix-signature': req.headers['svix-signature'],
  };

  if (
    !svixHeaders['svix-id'] ||
    !svixHeaders['svix-timestamp'] ||
    !svixHeaders['svix-signature']
  ) {
    return res.status(400).json({
      success: false,
      message: 'Missing Svix webhook headers',
    });
  }

  let event;

  try {
    const wh = new Webhook(env.CLERK_WEBHOOK_SECRET);

    event = wh.verify(req.body, svixHeaders);
  } catch (error) {
    logger.warn(
      { err: error },
      'Clerk webhook signature verification failed'
    );

    return res.status(400).json({
      success: false,
      message: 'Invalid webhook signature',
    });
  }

  try {
    const { type, data } = event;

    logger.info(
      { eventType: type, clerkId: data?.id },
      'Received Clerk webhook event'
    );

    switch (type) {
      case 'user.created':
      case 'user.updated': {
        const email =
          data?.email_addresses?.find(
            (emailAddress) =>
              emailAddress.id === data.primary_email_address_id
          )?.email_address ||
          data?.email_addresses?.[0]?.email_address ||
          null;

        const fullname =
          [data?.first_name, data?.last_name]
            .filter(Boolean)
            .join(' ')
            .trim() || 'Unnamed User';

        const profilePic = data?.image_url || '';

        const user = await syncUserFromClerk({
          clerkId: data.id,
          email,
          fullname,
          profilePic,
        });

        if (!user) {
          logger.warn(
            { clerkId: data.id, eventType: type },
            'Clerk user synchronization skipped'
          );

          return res.status(200).json({
            success: true,
            message: 'Webhook received but user synchronization was skipped',
          });
        }

        logger.info(
          { clerkId: data.id, userId: user._id, eventType: type },
          'Clerk user synchronized'
        );

        break;
      }

      case 'user.deleted': {
        const deleted = await deleteUserByClerkId(data?.id);

        logger.info(
          { clerkId: data?.id, deleted },
          'Clerk user deletion processed'
        );

        break;
      }

      default:
        logger.info(
          { eventType: type },
          'Unhandled Clerk webhook event'
        );
    }

    return res.status(200).json({
      success: true,
      message: 'Webhook processed successfully',
    });
  } catch (error) {
    logger.error(
      { err: error, eventType: event?.type },
      'Failed to process Clerk webhook'
    );

    return res.status(500).json({
      success: false,
      message: 'Failed to process webhook',
    });
  }
}