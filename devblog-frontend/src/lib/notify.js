import { supabase } from './supabase';

export const sendNotification = async ({ userId, type, message, sourceId = null, sourceType = null, actorId = null }) => {
  if (!userId || !type || !message) return;
  try {
    await supabase.rpc('notify', {
      p_user_id: userId,
      p_type: type,
      p_message: message,
      p_source_id: sourceId,
      p_source_type: sourceType,
      p_actor_id: actorId,
    });
  } catch (error) {
    console.error('Failed to send notification:', error);
  }
};

export default sendNotification;
