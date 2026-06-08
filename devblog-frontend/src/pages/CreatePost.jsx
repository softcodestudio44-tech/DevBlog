import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Send, Loader2, Image, X } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import SEO from '../components/SEO';

const CreatePost = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [images, setImages] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  // Load localStorage draft on mount
  useEffect(() => {
    const draft = localStorage.getItem('postDraft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        setTitle(parsed.title || '');
        setContent(parsed.content || '');
        setTags(parsed.tags || '');
        setImages(parsed.images || []);
      } catch (e) {
        console.error('Error parsing draft:', e);
      }
    }
  }, []);

  // Auto-save to localStorage every 3 seconds
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (title || content) {
        localStorage.setItem('postDraft', JSON.stringify({ title, content, tags, images }));
      }
    }, 3000);
    return () => clearTimeout(timeout);
  }, [title, content, tags, images]);

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

  const handlePublish = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setLoading(true);
    try {
      const response = await api.post('/posts', {
        title,
        content,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        images,
      });

      localStorage.removeItem('postDraft');
      navigate(`/post/${response.data.post.id}`);
    } catch (error) {
      console.error('Publish error:', error);
      alert('Failed to publish post');
    } finally {
      setLoading(false);
    }
  };

  // Save draft to localStorage only (no server)
  const handleSaveDraft = () => {
    if (!title.trim()) {
      alert('Please add a title before saving draft');
      return;
    }
    localStorage.setItem('postDraft', JSON.stringify({ title, content, tags, images }));
    alert('Draft saved locally!');
  };

  const handleDiscard = () => {
    if (window.confirm('Discard this draft?')) {
      setTitle('');
      setContent('');
      setTags('');
      setImages([]);
      localStorage.removeItem('postDraft');
    }
  };

  return (
    <>
      <SEO title="Write Post — DevBlog" description="Create a new blog post" />
      <div className="min-h-screen pt-24 pb-12 px-4" style={{ background: '#050608' }}>
        <div className="max-w-3xl mx-auto">
          {/* Mobile-friendly header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
            <h1 className="text-2xl font-bold text-white">Write Post</h1>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleDiscard}
                className="px-4 py-2 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/[0.05] transition-all border border-white/10"
              >
                Discard
              </button>
              <button
                onClick={handleSaveDraft}
                disabled={savingDraft || !title.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm bg-white/[0.05] border border-white/10 text-white/70 hover:text-white hover:bg-white/[0.08] transition-all disabled:opacity-30"
              >
                {savingDraft ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Draft
              </button>
              <button
                onClick={handlePublish}
                disabled={loading || !title.trim() || !content.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm bg-gradient-to-br from-emerald-500 to-emerald-600 text-white hover:from-emerald-400 hover:to-emerald-500 transition-all disabled:opacity-30 shadow-lg shadow-emerald-500/15"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Publish
              </button>
            </div>
          </div>

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

            {title && (
              <p className="text-xs text-white/30">
                Auto-saving to local draft...
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default CreatePost;