import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Save, Loader2, Image, X, ArrowLeft } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import SEO from '../components/SEO';

const EditPost = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [images, setImages] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPost();
  }, [id]);

  const fetchPost = async () => {
    try {
      setFetching(true);
      const response = await api.get(`/posts/${id}`);
      const post = response.data;
      setTitle(post.title || '');
      setContent(post.content || '');
      setTags(post.tags ? post.tags.join(', ') : '');
      setImages(post.images || []);
    } catch (err) {
      setError('Failed to load post');
      console.error('Fetch post error:', err);
    } finally {
      setFetching(false);
    }
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingImages(true);
    const formData = new FormData();
    files.forEach((file) => formData.append('images', file));

    try {
      const response = await api.post('/posts/upload-images', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImages([...images, ...response.data.images]);
    } catch (error) {
      console.error('Image upload error:', error);
      alert('Failed to upload images');
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setLoading(true);
    setError('');
    try {
      await api.put(`/posts/${id}`, {
        title,
        content,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        images,
      });

      navigate(`/post/${id}`);
    } catch (err) {
      console.error('Update error:', err);
      setError(err.response?.data?.message || 'Failed to update post');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-4 flex items-center justify-center">
        <div className="glass h-64 w-full max-w-3xl loading-shimmer rounded-3xl" />
      </div>
    );
  }

  return (
    <>
      <SEO title="Edit Post — DevBlog" description="Edit your blog post" />
      <div className="min-h-screen pt-24 pb-12 px-4" style={{ background: '#050608' }}>
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <button
              onClick={() => navigate(`/post/${id}`)}
              className="flex items-center gap-2 text-white/50 hover:text-emerald-300 transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to post
            </button>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
              <h1 className="text-2xl font-bold text-white">Edit Post</h1>
              <button
                onClick={handleUpdate}
                disabled={loading || !title.trim() || !content.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm bg-gradient-to-br from-emerald-500 to-emerald-600 text-white hover:from-emerald-400 hover:to-emerald-500 transition-all disabled:opacity-30 shadow-lg shadow-emerald-500/15"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Update Post
              </button>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 mb-6 text-red-300 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <input
                type="text"
                placeholder="Post title..."
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50 focus:bg-white/[0.05] transition-all text-xl font-semibold"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />

              <input
                type="text"
                placeholder="Tags (comma separated)..."
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50 focus:bg-white/[0.05] transition-all"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />

              {/* Image Upload */}
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-white/60">Images ({images.length})</span>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImages}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 text-white/70 hover:text-white hover:bg-white/[0.08] transition-all text-sm disabled:opacity-30"
                  >
                    <Image className="w-4 h-4" />
                    {uploadingImages ? 'Uploading...' : 'Add Images'}
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />

                {images.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {images.map((img, i) => (
                      <div key={i} className="relative group">
                        <img src={img} alt={`Upload ${i + 1}`} className="w-full h-32 object-cover rounded-lg" />
                        <button
                          onClick={() => removeImage(i)}
                          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <textarea
                placeholder="Write your post content in Markdown..."
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50 focus:bg-white/[0.05] transition-all min-h-[300px] sm:min-h-[400px] resize-y font-mono text-sm leading-relaxed"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default EditPost;