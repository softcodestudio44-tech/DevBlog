import { supabase } from './supabase';

const generateUniqueName = (file) => {
  const ext = file.name.split('.').pop() || 'bin';
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 10);
  return `${timestamp}-${random}.${ext}`;
};

export const getPublicUrl = (bucket, path) =>
  supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;

export const uploadFiles = async (bucket, folder, files) => {
  const urls = [];

  for (const file of files) {
    const path = `${folder}/${generateUniqueName(file)}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });
    if (error) throw error;
    urls.push(getPublicUrl(bucket, path));
  }

  return urls;
};

export const uploadAvatar = async (userId, file) => {
  const [url] = await uploadFiles('avatars', userId, [file]);
  return url;
};
