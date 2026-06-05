import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Send, Loader2 } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import SEO from '../components/SEO';

const CreatePost = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  // Load draft on mount
  useEffect(() => {
    const draft = localStorage.getItem('postDraft');
    if (draft) {
      const parsed = JSON.parse(draft);
      setTitle(parsed.title || '');
      setContent(parsed.content || '');
      setTags(parsed.tags || '');
    }
  }, []);

  // Auto-save draft every 3 seconds
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (title || content) {
        localStorage.setItem('postDraft', JSON.stringify({ title, content, tags }));
      }
    }, 3000);
    return () => clearTimeout(timeout);
  }, [title, content, tags]);

  const handlePublish = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setLoading(true);
    try {
      const response = await api.post('/posts', {
        title,
        content,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        isDraft: false,
      });
      
      localStorage.removeItem('postDraft');
      navigate(`/post/${response.data.id}`);
    } catch (error) {
      console.error('Publish error:', error);
      alert('Failed to publish post');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!title.trim()) return;
    
    setSavingDraft(true);
    try {
      await api.post('/posts', {
        title,
        content,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        isDraft: true,
      });
      
      localStorage.removeItem('postDraft');
      alert('Draft saved to server!');
    } catch (error) {
      console.error('Save draft error:', error);
      alert('Failed to save draft');
    } finally {
      setSavingDraft(false);
    }
  };

  const handleDiscard = () => {
    if (window.confirm('Discard this draft?')) {
      setTitle('');
      setContent('');
      setTags('');
      localStorage.removeItem('postDraft');
    }
  };

  return (
    <>
      <SEO title="Write Post — DevBlog" description="Create a new blog post" />
      <div className="min-h-screen pt-24 pb-12 px-4" style={{ background: '#050608' }}>
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold text-white">Write Post</h1>
            <div className="flex gap-2">
              <button
                onClick={handleDiscard}
                className="px-4 py-2 rounded-xl text-sm text-white/30 hover:text-white/60 hover:bg-white/[0.03] transition-all"
              >
                Discard
              </button>
              <button
                onClick={handleSaveDraft}
                disabled={savingDraft || !title.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm bg-white/[0.03] border border-white/[0.06] text-white/50 hover:text-white/80 hover:bg-white/[0.05] transition-all disabled:opacity-30"
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
              className="input-glass text-xl font-semibold py-4"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            
            <input
              type="text"
              placeholder="Tags (comma separated)..."
              className="input-glass"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
            
            <textarea
              placeholder="Write your post content in Markdown..."
              className="input-glass min-h-[400px] resize-y font-mono text-sm leading-relaxed"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            
            {title && (
              <p className="text-xs text-white/15">
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