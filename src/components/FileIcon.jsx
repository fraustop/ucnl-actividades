import React from 'react';
import { 
  FileText, 
  FileSpreadsheet, 
  Presentation, 
  Image as ImageIcon, 
  Archive, 
  Code, 
  Music, 
  Video, 
  File 
} from 'lucide-react';

export const FileIcon = ({ category, className = "w-5 h-5", size }) => {
  const iconProps = { className, size };

  switch (category) {
    case 'pdf':
      return <FileText {...iconProps} className={`${className} text-rose-500`} />;
    case 'word':
      return <FileText {...iconProps} className={`${className} text-blue-600`} />;
    case 'excel':
      return <FileSpreadsheet {...iconProps} className={`${className} text-emerald-600`} />;
    case 'powerpoint':
      return <Presentation {...iconProps} className={`${className} text-amber-600`} />;
    case 'image':
      return <ImageIcon {...iconProps} className={`${className} text-indigo-500`} />;
    case 'archive':
      return <Archive {...iconProps} className={`${className} text-yellow-600`} />;
    case 'code':
      return <Code {...iconProps} className={`${className} text-purple-600`} />;
    case 'audio':
      return <Music {...iconProps} className={`${className} text-pink-500`} />;
    case 'video':
      return <Video {...iconProps} className={`${className} text-red-500`} />;
    default:
      return <File {...iconProps} className={`${className} text-slate-500`} />;
  }
};

export default FileIcon;
