import React, { useEffect, useRef, useState } from 'react';
import { FileText, Image, Paperclip, Upload, X } from 'lucide-react';
import { formatFileSize } from '../utils/files';

const ACCEPT = '.jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.log,.json,.zip,.7z';
const MAX_FILES = 10;
const MAX_SIZE = 20 * 1024 * 1024;

export default function AttachmentPicker({ files, onChange, disabled = false }) {
  const inputRef = useRef(null);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [previews, setPreviews] = useState({});

  useEffect(() => {
    const next = {};
    files.filter(file => file.type.startsWith('image/')).forEach(file => { next[`${file.name}-${file.lastModified}`] = URL.createObjectURL(file); });
    setPreviews(next);
    return () => Object.values(next).forEach(URL.revokeObjectURL);
  }, [files]);

  const addFiles = (selected) => {
    setError('');
    const incoming = Array.from(selected || []);
    if (files.length + incoming.length > MAX_FILES) return setError(`每次最多上传 ${MAX_FILES} 个文件`);
    const oversized = incoming.find(file => file.size > MAX_SIZE);
    if (oversized) return setError(`${oversized.name} 超过 20 MB`);
    const merged = [...files];
    incoming.forEach(file => {
      if (!merged.some(item => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified)) merged.push(file);
    });
    onChange(merged);
  };

  return (
    <div className="attachment-picker">
      <button type="button" disabled={disabled} className={`attachment-dropzone ${dragging ? 'dragging' : ''}`} onClick={() => inputRef.current?.click()} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); addFiles(event.dataTransfer.files); }}>
        <Upload size={19} />
        <span><strong>选择或拖入图片与附件</strong><small>最多 10 个，单个不超过 20 MB</small></span>
      </button>
      <input ref={inputRef} hidden type="file" multiple accept={ACCEPT} onChange={(event) => { addFiles(event.target.files); event.target.value = ''; }} />
      {error && <div className="attachment-error">{error}</div>}
      {files.length > 0 && <div className="attachment-selection">
        {files.map((file, index) => {
          const key = `${file.name}-${file.lastModified}`;
          return <div className="attachment-selected" key={key}>
            {previews[key] ? <img src={previews[key]} alt="" /> : file.type.startsWith('image/') ? <Image size={18} /> : <FileText size={18} />}
            <span><strong>{file.name}</strong><small>{formatFileSize(file.size)}</small></span>
            <button type="button" title="移除附件" onClick={() => onChange(files.filter((_, itemIndex) => itemIndex !== index))}><X size={15} /></button>
          </div>;
        })}
      </div>}
      {files.length > 0 && <div className="attachment-count"><Paperclip size={13} />已选择 {files.length} 个文件</div>}
    </div>
  );
}
