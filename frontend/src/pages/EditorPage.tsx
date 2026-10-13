import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

export const EditorPage: React.FC = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('news');
  const [tags, setTags] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<FileList | null>(null);

  const postMutation = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      form.append('title', title);
      form.append('excerpt', excerpt);
      form.append('body', body);
      form.append('category', category);
      form.append('tags', tags);
      if (sourceUrl) form.append('sourceUrl', sourceUrl);
      if (coverFile) form.append('cover', coverFile);
      if (galleryFiles) {
        for (let i = 0; i < galleryFiles.length; i++) {
          form.append('images', galleryFiles[i]);
        }
      }
      return api.post('/posts', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      toast.success('Post submitted for moderation review!');
      navigate('/');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to submit post');
    },
  });

  return (
    <div className="shell page-content" style={{ maxWidth: '780px' }}>
      <p className="eyebrow">// publisher</p>
      <h1 style={{ fontSize: '32px', marginBottom: '28px' }}>Write a new piece</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim() || !body.trim()) {
            toast.error('Title and body are required');
            return;
          }
          postMutation.mutate();
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
      >
        <div className="field">
          <label>Title</label>
          <input
            type="text"
            placeholder="A compelling headline..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label>Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="news">News</option>
            <option value="tutorial">Tutorial</option>
            <option value="opinion">Opinion</option>
            <option value="showcase">Showcase</option>
            <option value="discussion">Discussion</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="field">
          <label>Excerpt / Summary (optional)</label>
          <input
            type="text"
            placeholder="One sentence describing why readers should care..."
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Cover image (optional)</label>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
          />
        </div>

        <div className="field">
          <label>Article body (HTML / Markdown supported)</label>
          <textarea
            rows={14}
            placeholder="Write your article here..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            style={{ fontFamily: 'var(--mono)', fontSize: '13.5px' }}
          />
        </div>

        <div className="field">
          <label>Photo gallery / attachments (optional, up to 5 images)</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setGalleryFiles(e.target.files)}
          />
        </div>

        <div className="field">
          <label>Tags (comma separated)</label>
          <input
            type="text"
            placeholder="react, perf, memory, profiling"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Source link / References (optional)</label>
          <input
            type="url"
            placeholder="https://github.com/... or https://..."
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
          <button
            type="submit"
            className="btn btn-accent"
            disabled={postMutation.isPending}
          >
            {postMutation.isPending ? 'Submitting...' : 'Submit for review'}
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
