import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Camera, Save, ArrowLeft, Upload, X, Github, Twitter, Linkedin, Globe, Music2, Facebook } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const EditProfile = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    bio: user?.bio || '',
    avatar: user?.avatar || '',
    github: user?.github || '',
    twitter: user?.twitter || '',
    linkedin: user?.linkedin || '',
    website: user?.website || '',
    tiktok: user?.tiktok || '',
    facebook: user?.facebook || '',
  });
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState(user?.avatar || '');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');

    try {
      const response = await api.put('/users/profile', formData);
      updateUser(response.data.user);
      navigate(`/user/${user.id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => setPreviewUrl(e.target.result);
    reader.readAsDataURL(file);

    setUploadLoading(true);
    setError('');

    const uploadData = new FormData();
    uploadData.append('avatar', file);

    try {
      const response = await api.post('/users/upload-avatar', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      setFormData({ ...formData, avatar: response.data.user.avatar });
      setPreviewUrl(response.data.user.avatar);
      updateUser(response.data.user);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.message || 'Upload failed. Please try again.');
      setPreviewUrl(user?.avatar || '');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleRemoveAvatar = () => {
    setFormData({ ...formData, avatar: '' });
    setPreviewUrl('');
    fileInputRef.current.value = '';
  };

  const avatarOptions = [
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.name || 'user'}&backgroundColor=b6e3f4`,
    `https://api.dicebear.com/7.x/bottts/svg?seed=${formData.name || 'user'}&backgroundColor=c0aede`,
    `https://api.dicebear.com/7.x/identicon/svg?seed=${formData.name || 'user'}&backgroundColor=ffdfbf`,
    `https://api.dicebear.com/7.x/initials/svg?seed=${formData.name || 'user'}&backgroundColor=d1d4f9`,
    `https://api.dicebear.com/7.x/notionists/svg?seed=${formData.name || 'user'}&backgroundColor=ffd5dc`,
  ];

  const socialInputs = [
    { key: 'github', label: 'GitHub', icon: Github, placeholder: 'github.com/username' },
    { key: 'twitter', label: 'Twitter/X', icon: Twitter, placeholder: 'twitter.com/username' },
    { key: 'linkedin', label: 'LinkedIn', icon: Linkedin, placeholder: 'linkedin.com/in/username' },
    { key: 'tiktok', label: 'TikTok', icon: Music2, placeholder: 'tiktok.com/@username' },
    { key: 'facebook', label: 'Facebook', icon: Facebook, placeholder: 'facebook.com/username' },
    { key: 'website', label: 'Website', icon: Globe, placeholder: 'yourwebsite.com' },
  ];

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-strong p-8"
        >
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-white/50 hover:text-emerald-300 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Edit Profile</h1>
            <p className="text-white/50">Customize your developer identity</p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 mb-6 text-red-300 text-sm"
            >
              {error}
            </motion.div>
          )}

          {/* Avatar Preview */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              {previewUrl || formData.avatar ? (
                <img
                  src={previewUrl || formData.avatar}
                  alt="Avatar"
                  className="w-24 h-24 rounded-2xl object-cover border-2 border-emerald-500/30"
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-3xl font-bold text-white">
                  {formData.name?.[0] || 'U'}
                </div>
              )}
              
              {(previewUrl || formData.avatar) && (
                <button
                  onClick={handleRemoveAvatar}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500/80 flex items-center justify-center hover:bg-red-500 transition-colors"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              )}
              
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadLoading}
                className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center hover:bg-emerald-400 transition-colors disabled:opacity-50 shadow-lg shadow-emerald-500/30"
              >
                {uploadLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera className="w-5 h-5 text-white" />
                )}
              </button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>

          <div className="text-center mb-6">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadLoading}
              className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-2 mx-auto disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              {uploadLoading ? 'Uploading...' : 'Upload your own photo'}
            </button>
            <p className="text-xs text-white/20 mt-1">JPG, PNG, GIF up to 5MB</p>
          </div>

          {/* Preset Avatars */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-3 text-white/70">Or choose preset</label>
            <div className="flex gap-3 justify-center flex-wrap">
              {avatarOptions.map((avatar, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setFormData({ ...formData, avatar });
                    setPreviewUrl(avatar);
                  }}
                  className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                    formData.avatar === avatar
                      ? 'border-emerald-400 shadow-lg shadow-emerald-500/30'
                      : 'border-white/10 hover:border-emerald-500/50'
                  }`}
                >
                  <img src={avatar} alt={`Avatar ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
              <button
                onClick={() => {
                  setFormData({ ...formData, avatar: '' });
                  setPreviewUrl('');
                }}
                className={`w-16 h-16 rounded-xl border-2 flex items-center justify-center transition-all ${
                  !formData.avatar
                    ? 'border-emerald-400 shadow-lg shadow-emerald-500/30'
                    : 'border-white/10 hover:border-emerald-500/50'
                }`}
              >
                <User className="w-6 h-6 text-white/50" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2 text-white/70">Display Name</label>
              <input
                type="text"
                className="input-glass"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-white/70">Bio</label>
              <textarea
                rows={3}
                placeholder="Tell us about yourself..."
                className="input-glass resize-none"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              />
            </div>

            {/* Social Links */}
            <div className="border-t border-white/10 pt-6">
              <h3 className="text-sm font-medium mb-4 text-white/70">Social Links</h3>
              <div className="space-y-4">
                {socialInputs.map(({ key, label, icon: Icon, placeholder }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium mb-2 text-white/50 flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      {label}
                    </label>
                    <input
                      type="text"
                      className="input-glass"
                      placeholder={placeholder}
                      value={formData[key]}
                      onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-neon w-full flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-emerald-300 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default EditProfile;