const QUEUE_KEY = 'devblog_offline_queue';
const POSTS_CACHE_KEY = 'devblog_posts_cache';

export const isOnline = () => (typeof navigator !== 'undefined' ? navigator.onLine : true);

export const readQueue = () => {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY)) || [];
  } catch {
    return [];
  }
};

export const writeQueue = (queue) => {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // ignore storage errors
  }
};

export const enqueueAction = (action) => {
  const queue = readQueue();
  queue.push({ ...action, queuedAt: new Date().toISOString() });
  writeQueue(queue);
};

export const removeQueuedAction = (queuedAt) => {
  writeQueue(readQueue().filter((a) => a.queuedAt !== queuedAt));
};

export const cachePosts = (posts) => {
  try {
    localStorage.setItem(POSTS_CACHE_KEY, JSON.stringify(posts.slice(0, 50)));
  } catch {
    // ignore storage errors
  }
};

export const getCachedPosts = () => {
  try {
    const raw = localStorage.getItem(POSTS_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};
