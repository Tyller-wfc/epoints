import React, { useEffect, useState } from 'react';
import { Download, FileText, Image, Paperclip, X } from 'lucide-react';
import { getAttachmentBlob } from '../data/mockData';
import { formatFileSize } from '../utils/files';

export default function AttachmentList({ attachments = [] }) {
  const [imageUrls, setImageUrls] = useState({});
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    let disposed = false;
    const urls = {};
    Promise.all(attachments.filter(item => item.isImage).map(async item => {
      try {
        const blob = await getAttachmentBlob(item.url);
        urls[item.id] = URL.createObjectURL(blob);
      } catch {
        // The file row remains downloadable even if a thumbnail cannot load.
      }
    })).then(() => { if (!disposed) setImageUrls(urls); });
    return () => { disposed = true; Object.values(urls).forEach(URL.revokeObjectURL); };
  }, [attachments]);

  const download = async (attachment) => {
    try {
      const blob = await getAttachmentBlob(attachment.url);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = attachment.originalName;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      window.alert(`附件下载失败：${error.message}`);
    }
  };

  if (!attachments.length) return null;
  return <>
    <div className="attachment-list">
      <div className="attachment-list-title"><Paperclip size={14} />附件 {attachments.length}</div>
      <div className="attachment-grid">
        {attachments.map(attachment => <div className="attachment-item" key={attachment.id}>
          <button type="button" className="attachment-preview" title={attachment.isImage ? '预览图片' : '下载附件'} onClick={() => attachment.isImage && imageUrls[attachment.id] ? setPreview({ ...attachment, src: imageUrls[attachment.id] }) : download(attachment)}>
            {attachment.isImage && imageUrls[attachment.id] ? <img src={imageUrls[attachment.id]} alt={attachment.originalName} /> : attachment.isImage ? <Image size={20} /> : <FileText size={20} />}
          </button>
          <span><strong title={attachment.originalName}>{attachment.originalName}</strong><small>{formatFileSize(attachment.fileSize)}</small></span>
          <button type="button" className="attachment-download" title="下载附件" onClick={() => download(attachment)}><Download size={15} /></button>
        </div>)}
      </div>
    </div>
    {preview && <div className="attachment-modal" role="dialog" aria-modal="true" onClick={() => setPreview(null)}>
      <button type="button" title="关闭预览" onClick={() => setPreview(null)}><X size={20} /></button>
      <img src={preview.src} alt={preview.originalName} onClick={event => event.stopPropagation()} />
      <span>{preview.originalName}</span>
    </div>}
  </>;
}
