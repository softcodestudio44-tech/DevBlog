import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Loader2, Image, X, Bold, Italic, Code, Heading1, Link, Quote, List, Save, CalendarClock, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePosts } from '../hooks/usePosts';
import { useToast } from '../context/ToastContext';
import { uploadFiles } from '../lib/storage';
import SEO from '../components/SEO';

const SUGGESTED_TAGS = [
  'react', 'javascript', 'typescript', 'python', 'css', 'node', 'next.js', 'tailwind',
  'backend', 'frontend', 'ai', 'devops', 'tutorial', 'showcase',
];

const CreatePost = () => {
  const { user } = useAuth();
  const { createPost } = usePosts();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const contentRef = useRef(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [images, setImages] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [showTags, setShowTags] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState(null);

  const saveDraft = () => {
    if (!title && !content && !tags && images.length === 0) {
      toast({ type: 'notification', title: 'Nothing to save', body: 'Write something first.' });
      return;
    }
    localStorage.setItem('postDraft', JSON.stringify({ title, content, tags, images, scheduledAt }));
    setDraftSavedAt(new Date());
    toast({ type: 'success', title: 'Draft saved', body: 'Your draft was saved to this device.' });
  };

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
        setScheduledAt(parsed.scheduledAt || '');
        if (parsed.title || parsed.content) setDraftSavedAt(new Date());
      } catch (e) {
        console.error('Error parsing draft:', e);
      }
    }
  }, []);

  // Auto-save to localStorage every 3 seconds
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (title || content) {
        localStorage.setItem('postDraft', JSON.stringify({ title, content, tags, images, scheduledAt }));
        setDraftSavedAt(new Date());
      }
    }, 3000);
    return () => clearTimeout(timeout);
  }, [title, content, tags, images, scheduledAt]);

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingImages(true);
    try {
      const urls = await uploadFiles('post-images', user?.id || 'anonymous', files);
      setImages((prev) => [...prev, ...urls]);
    } catch (error) {
      console.error('Image upload error:', error);
      toast({ type: 'notification', title: 'Upload failed', body: 'Could not upload images.' });
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const toggleTag = (tag) => {
    const current = tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
    const next = current.includes(tag)
      ? current.filter((t) => t !== tag)
      : [...current, tag];
    setTags(next.join(', '));
  };

  const wrapSelection = (before, after = before) => {
    const el = contentRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = content.slice(start, end);
    const replacement = `${before}${selected}${after}`;
    setContent(content.slice(0, start) + replacement + content.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  };

  const handlePublish = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    if (loading) return;

    const hasSchedule = !!scheduledAt && new Date(scheduledAt) > new Date();

    setLoading(true);
    try {
      const { data, error } = await createPost({
        title,
        content,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        images,
        isDraft: hasSchedule,
        scheduledAt: hasSchedule ? new Date(scheduledAt).toISOString() : null,
      });

      if (error) throw new Error(error);

      localStorage.removeItem('postDraft');
      if (hasSchedule) {
        toast({
          type: 'success',
          title: 'Post scheduled',
          body: `Will be published on ${new Date(scheduledAt).toLocaleString()}.`,
        });
        navigate(`/user/${user?.id}`);
      } else {
        navigate(`/post/${data.id}`);
      }
    } catch (error) {
      console.error('Publish error:', error);
      toast({ type: 'notification', title: 'Publish failed', body: 'Could not publish the post.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDiscard = () => {
    if (window.confirm('Discard this draft?')) {
      setTitle('');
      setContent('');
      setTags('');
      setImages([]);
      setScheduledAt('');
      setDraftSavedAt(null);
      localStorage.removeItem('postDraft');
      toast({ type: 'notification', title: 'Draft discarded', body: 'The local draft was cleared.' });
    }
  };

  const toolbarButtons = [
    { label: 'Bold', icon: Bold, action: () => wrapSelection('**') },
    { label: 'Italic', icon: Italic, action: () => wrapSelection('_') },
    { label: 'Code', icon: Code, action: () => wrapSelection('`') },
    { label: 'Heading', icon: Heading1, action: () => wrapSelection('## ', '\n') },
    { label: 'Link', icon: Link, action: () => wrapSelection('[', '](https://)') },
    { label: 'Quote', icon: Quote, action: () => wrapSelection('> ') },
    { label: 'List', icon: List, action: () => wrapSelection('- ') },
  ];

  const minDateTime = new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16);

  return (
    <>
      <SEO title="Write Post — DevBlog" description="Create a new blog post" />
      <div className="min-h-screen pt-24 pb-12 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Write Post</h1>
              {draftSavedAt && (
                <p className="text-xs text-white/40 mt-1 flex items-center gap-1.5">
                  <Save className="w-3 h-3" />
                  Draft saved {draftSavedAt.toLocaleTimeString()}
                </p>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={saveDraft}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-white/80 hover:text-white hover:bg-white/[0.05] transition-all border border-white/10"
              >
                <Save className="w-4 h-4" />
                Save Draft
              </button>
              <button
                onClick={handleDiscard}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-white/60 hover:text-red-400 hover:bg-red-500/10 transition-all border border-white/10"
              >
                <Trash2 className="w-4 h-4" />
                Discard
              </button>
              <button
                onClick={handlePublish}
                disabled={loading || !title.trim() || !content.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm bg-gradient-to-br from-primary-500 to-primary-600 text-white hover:from-primary-400 hover:to-primary-500 transition-all disabled:opacity-30 shadow-lg shadow-blue-500/15"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {scheduledAt ? 'Schedule' : 'Publish'}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <input
              type="text"
              placeholder="Post title..."
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-primary/50 focus:bg-white/[0.05] transition-all text-xl font-semibold"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <div>
              <input
                type="text"
                placeholder="Tags (comma separated)..."
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-primary/50 focus:bg-white/[0.05] transition-all"
                value={tags}
                onFocus={() => setShowTags(true)}
                onChange={(e) => setTags(e.target.value)}
              />
              {showTags && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {SUGGESTED_TAGS.map((tag) => {
                    const active = tags.split(',').map((t) => t.trim().toLowerCase()).includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`px-2.5 py-1 rounded-full text-xs border transition-all ${
                          active
                            ? 'border-violet-400/50 text-violet-200 bg-[#2b1b40]'
                            : 'border-white/10 text-white/50 hover:text-white hover:border-violet-400/30'
                        }`}
                      >
                        {active ? '✓ ' : '+ '}{tag}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Schedule */}
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-white/70">
                <CalendarClock className="w-4 h-4 text-violet-300" />
                Schedule publish
              </div>
              <input
                type="datetime-local"
                min={minDateTime}
                className="bg-[#12141b] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-400/40 transition-all"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>
            {scheduledAt && (
              <p className="text-xs text-violet-300/80">
                This post will be published on {new Date(scheduledAt).toLocaleString()} and stay a draft until then.
              </p>
            )}

            <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-white">Images ({images.length})</span>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImages}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 text-white hover:text-white hover:bg-white/[0.08] transition-all text-sm disabled:opacity-30"
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

            {/* Editor toolbar */}
            <div className="flex items-center gap-1 flex-wrap">
              {toolbarButtons.map(({ label, icon: Icon, action }) => (
                <button
                  key={label}
                  type="button"
                  title={label}
                  onClick={action}
                  className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white/50 hover:text-white hover:bg-white/[0.08] transition-all"
                >
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>

            <textarea
              ref={contentRef}
              placeholder="Write your post content in Markdown..."
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-primary/50 focus:bg-white/[0.05] transition-all min-h-[300px] sm:min-h-[400px] resize-y font-mono text-sm leading-relaxed"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default CreatePost;
