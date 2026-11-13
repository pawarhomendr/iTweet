import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PenIcon, VideoIcon, CloseIcon } from '@/components/ui/Icons';
import toast from 'react-hot-toast';
import { PageBackButton } from '@/components/layout/PageBackButton';

export const EditorPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'post' | 'reel'>('post');

  // Common fields
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('news');
  const [tags, setTags] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');

  // Post image files & previews
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);

  // Reel video file & preview
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle cover image selection
  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Cover must be an image file');
      return;
    }
    setCoverFile(file);
    if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
    setCoverPreviewUrl(URL.createObjectURL(file));
  };

  const clearCover = () => {
    if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
    setCoverFile(null);
    setCoverPreviewUrl(null);
  };

  // Handle gallery image selection
  const handleGallerySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    if (galleryFiles.length + files.length > 5) {
      toast.error('Maximum 5 gallery images allowed');
      return;
    }

    const validFiles = files.filter((f) => f.type.startsWith('image/'));
    const newPreviews = validFiles.map((f) => URL.createObjectURL(f));

    setGalleryFiles((prev) => [...prev, ...validFiles]);
    setGalleryPreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeGalleryItem = (index: number) => {
    URL.revokeObjectURL(galleryPreviews[index]);
    setGalleryFiles((prev) => prev.filter((_, i) => i !== index));
    setGalleryPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle video selection for Reel
  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      toast.error('Please select a valid MP4 or WebM video');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error('Video file size must be less than 50MB');
      return;
    }

    setVideoFile(file);
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    const url = URL.createObjectURL(file);
    setVideoPreviewUrl(url);

    // Auto-fill title if empty
    if (!title.trim()) {
      const name = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setTitle(name.slice(0, 80));
    }
  };

  const clearVideo = () => {
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    setVideoFile(null);
    setVideoPreviewUrl(null);
    setVideoDuration(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const postMutation = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      form.append('title', title.trim());
      form.append('excerpt', excerpt.trim());
      form.append('body', body.trim());
      form.append('category', category);
      form.append('tags', tags);
      form.append('mediaType', activeTab);

      if (sourceUrl) form.append('sourceUrl', sourceUrl);
      if (coverFile) form.append('cover', coverFile);

      if (galleryFiles.length > 0) {
        galleryFiles.forEach((file) => form.append('images', file));
      }

      if (activeTab === 'reel' && videoFile) {
        form.append('video', videoFile);
      }

      return api.post('/posts', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      toast.success(
        activeTab === 'reel'
          ? 'Reel submitted for moderation review!'
          : 'Article submitted for moderation review!'
      );
      navigate('/');
    },
    onError: (err: any) => {
      const errors = err.response?.data?.errors;
      if (Array.isArray(errors) && errors.length > 0) {
        errors.forEach((error: { field?: string; message?: string }) => {
          toast.error(`${error.field || 'Field'}: ${error.message || 'Invalid value'}`);
        });
        return;
      }
      toast.error(err.response?.data?.message || 'Failed to submit post');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Please provide a title or caption');
      return;
    }

    if (activeTab === 'reel' && !videoFile) {
      toast.error('Please attach a video file for your reel');
      return;
    }

    if (activeTab === 'post' && !body.trim()) {
      toast.error('Article content is required');
      return;
    }

    postMutation.mutate();
  };

  return (
    <div className="shell page-content" style={{ maxWidth: '780px' }}>
      <PageBackButton fallback="/" />
      <div style={{ marginBottom: '24px' }}>
        <p className="eyebrow">{'// studio & publisher'}</p>
        <h1
          style={{
            fontFamily: 'var(--heading)',
            fontSize: '32px',
            fontWeight: 600,
            letterSpacing: '-.02em',
            color: 'var(--ink)',
            marginTop: '4px',
            marginBottom: '6px',
          }}
        >
          Create Content
        </h1>
        <p className="dim" style={{ fontFamily: 'var(--prose)', fontSize: '15px' }}>
          Publish written articles, share code discoveries, or post engineering reels.
        </p>
      </div>

      {/* Mode Selector Tabs: Post vs Reel */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '28px',
          borderBottom: '1px solid var(--rule)',
          paddingBottom: '12px',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('post')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 18px',
            borderRadius: 'var(--radius-sm)',
            fontFamily: 'var(--display)',
            fontSize: '14px',
            fontWeight: activeTab === 'post' ? 600 : 500,
            color: activeTab === 'post' ? '#fff' : 'var(--ink-2)',
            background: activeTab === 'post' ? 'var(--accent)' : 'transparent',
            border: activeTab === 'post' ? '1px solid var(--accent)' : '1px solid var(--rule)',
            cursor: 'pointer',
            transition: 'all .15s ease',
          }}
        >
          <PenIcon />
          <span>Write Post</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reel')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 18px',
            borderRadius: 'var(--radius-sm)',
            fontFamily: 'var(--display)',
            fontSize: '14px',
            fontWeight: activeTab === 'reel' ? 600 : 500,
            color: activeTab === 'reel' ? '#fff' : 'var(--ink-2)',
            background: activeTab === 'reel' ? 'var(--accent)' : 'transparent',
            border: activeTab === 'reel' ? '1px solid var(--accent)' : '1px solid var(--rule)',
            cursor: 'pointer',
            transition: 'all .15s ease',
          }}
        >
          <VideoIcon />
          <span>Create Reel</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
        {/* REEL CREATION MODE */}
        {activeTab === 'reel' && (
          <div
            className="card"
            style={{
              padding: '24px',
              background: 'var(--surface-2)',
              border: '1.5px dashed var(--rule)',
              borderRadius: 'var(--radius)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--ink)' }}>
                  Video Attachment (MP4 or WebM)
                </h3>
                <p className="dim mono" style={{ fontSize: '11px', marginTop: '2px' }}>
                  Maximum file size: 50MB · Up to 2 minutes recommended
                </p>
              </div>

              {videoPreviewUrl && (
                <button
                  type="button"
                  onClick={clearVideo}
                  className="btn btn-sm btn-ghost"
                  style={{ gap: '4px' }}
                >
                  <CloseIcon />
                  <span>Remove video</span>
                </button>
              )}
            </div>

            {videoPreviewUrl ? (
              <div style={{ borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: '#000', maxHeight: '420px', display: 'flex', justifyContent: 'center' }}>
                <video
                  ref={videoRef}
                  src={videoPreviewUrl}
                  controls
                  onLoadedMetadata={() => {
                    if (videoRef.current) {
                      setVideoDuration(Math.round(videoRef.current.duration));
                    }
                  }}
                  style={{ width: '100%', maxHeight: '420px', objectFit: 'contain' }}
                />
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: '48px 24px',
                  textAlign: 'center',
                  background: 'var(--surface)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  border: '1px dashed var(--rule)',
                  transition: 'border-color .15s ease',
                }}
              >
                <div style={{ fontSize: '32px', marginBottom: '8px', color: 'var(--accent)' }}>▶</div>
                <p style={{ fontWeight: 600, fontSize: '15px' }}>Click to upload reel video</p>
                <p className="dim mono" style={{ fontSize: '12px', marginTop: '4px' }}>
                  Select an MP4 or WebM short video from your device
                </p>
              </div>
            )}

            <input
              type="file"
              ref={fileInputRef}
              accept="video/mp4,video/webm"
              onChange={handleVideoSelect}
              style={{ display: 'none' }}
            />

            {videoDuration !== null && (
              <p className="dim mono" style={{ fontSize: '11.5px' }}>
                Video duration: {videoDuration} seconds · File: {videoFile?.name} ({(videoFile?.size ? (videoFile.size / (1024 * 1024)).toFixed(1) : 0)} MB)
              </p>
            )}
          </div>
        )}

        {/* Title / Caption */}
        <div className="field">
          <label htmlFor="post-title">
            {activeTab === 'reel' ? 'Reel Caption / Headline' : 'Article Headline'}
          </label>
          <input
            id="post-title"
            type="text"
            placeholder={
              activeTab === 'reel'
                ? 'e.g. Visualizing memory leak in React useEffect hook'
                : 'A compelling, descriptive title...'
            }
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            style={{ fontSize: '16px', fontWeight: 500 }}
          />
        </div>

        {/* Category & Excerpt row */}
        <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '16px' }}>
          <div className="field">
            <label htmlFor="post-category">Category</label>
            <select
              id="post-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="news">News</option>
              <option value="tutorial">Tutorial</option>
              <option value="opinion">Opinion</option>
              <option value="showcase">Showcase</option>
              <option value="discussion">Discussion</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="post-excerpt">Short summary (optional)</label>
            <input
              id="post-excerpt"
              type="text"
              placeholder="One sentence summary for feed previews..."
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
            />
          </div>
        </div>

        {/* Cover image (Post mode) */}
        {activeTab === 'post' && (
          <div className="field">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label htmlFor="post-cover">Cover image (optional)</label>
              {coverPreviewUrl && (
                <button
                  type="button"
                  onClick={clearCover}
                  style={{ fontSize: '11.5px', color: 'var(--error)', cursor: 'pointer' }}
                >
                  Remove cover
                </button>
              )}
            </div>

            {coverPreviewUrl ? (
              <div style={{ position: 'relative', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                <img
                  src={coverPreviewUrl}
                  alt="Cover preview"
                  style={{ width: '100%', maxHeight: '200px', objectFit: 'cover' }}
                />
              </div>
            ) : (
              <input
                id="post-cover"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleCoverSelect}
                style={{ padding: '8px 12px' }}
              />
            )}
          </div>
        )}

        {/* Content body */}
        <div className="field">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label htmlFor="post-body">
              {activeTab === 'reel' ? 'Detailed Notes / Code Snippet' : 'Article Content'}
            </label>
            <span className="mono dim" style={{ fontSize: '11px' }}>
              {body.length} characters
            </span>
          </div>
          <textarea
            id="post-body"
            rows={activeTab === 'reel' ? 6 : 14}
            placeholder={
              activeTab === 'reel'
                ? 'Add code snippets, links, or explanation for this reel...'
                : 'Write your article here using plain text or HTML formatting...'
            }
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            style={{
              fontFamily: 'var(--mono)',
              fontSize: '13.5px',
              lineHeight: 1.65,
            }}
          />
        </div>

        {/* Gallery Attachments (Post mode) */}
        {activeTab === 'post' && (
          <div className="field">
            <label>Image attachments (up to 5 images)</label>
            {galleryPreviews.length > 0 && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                  gap: '10px',
                  marginBottom: '10px',
                }}
              >
                {galleryPreviews.map((preview, i) => (
                  <div key={i} style={{ position: 'relative', borderRadius: '6px', overflow: 'hidden', height: '80px', border: '1px solid var(--rule)' }}>
                    <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      type="button"
                      onClick={() => removeGalleryItem(i)}
                      aria-label="Remove image"
                      style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        background: 'rgba(0,0,0,0.6)',
                        color: '#fff',
                        borderRadius: '50%',
                        width: '20px',
                        height: '20px',
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: '10px',
                        cursor: 'pointer',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {galleryFiles.length < 5 && (
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleGallerySelect}
                style={{ padding: '8px 12px' }}
              />
            )}
          </div>
        )}

        {/* Tags */}
        <div className="field">
          <label htmlFor="post-tags">Tags (comma-separated hashtags)</label>
          <input
            id="post-tags"
            type="text"
            placeholder="react, perf, databases, profiling"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
        </div>

        {/* Source link */}
        <div className="field">
          <label htmlFor="post-source">Source link / GitHub repo (optional)</label>
          <input
            id="post-source"
            type="url"
            placeholder="https://github.com/... or https://..."
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
          />
        </div>

        {/* Action buttons */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            marginTop: '8px',
            paddingTop: '20px',
            borderTop: '1px solid var(--rule)',
          }}
        >
          <button
            type="submit"
            className="btn btn-accent"
            disabled={postMutation.isPending}
          >
            {postMutation.isPending
              ? 'Submitting...'
              : activeTab === 'reel'
              ? 'Publish Reel for Review'
              : 'Submit Post for Review'}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => navigate(-1)}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};
