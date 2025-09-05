import React, { useState, useRef, ReactNode } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileUp, X, Check } from 'lucide-react';
import { extractTextFromFiles } from '../utils/fileUtils';
import { FileExtractResult } from '../types';
import { showSuccess, showInfo, showWarning, showError } from '../utils/notification';

interface FileUploadButtonProps {
  onUploadComplete: (text: string) => void;
  children?: ReactNode;
}

const FileUploadButton: React.FC<FileUploadButtonProps> = ({ onUploadComplete, children }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [showDropzone, setShowDropzone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedFiles, setExtractedFiles] = useState<FileExtractResult[]>([]);
  const dropzoneRef = useRef<HTMLDivElement>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
    },
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length === 0) return;
      
      setIsUploading(true);
      setError(null);
      
      try {
        const results = await extractTextFromFiles(acceptedFiles);
        setExtractedFiles(results);
        
        // Combine all extracted text
        const combinedText = results
          .map(result => `# From ${result.filename}\n\n${result.text}`)
          .join('\n\n');
        
        onUploadComplete(combinedText);
        
        // Auto-close after a short delay
        setTimeout(() => {
          setShowDropzone(false);
          setExtractedFiles([]);
          setIsUploading(false);
        }, 1500);
        showSuccess('文件已上传');
      } catch (err: any) {
        setError(err.message || 'Failed to extract text from files');
        showError('文件上传失败：' + err.message);
        setIsUploading(false);
      }
    },
  });

  return (
    <>
      {children ? (
        <div onClick={() => setShowDropzone(true)}>
          {children}
        </div>
      ) : (
        <button
          className="flex items-center space-x-2 px-3 py-2 bg-white border border-neutral-200 rounded-md text-neutral-700 hover:bg-neutral-50 transition-colors shadow-minimal"
          onClick={() => setShowDropzone(true)}
        >
          <FileUp size={16} />
          <span className="text-sm">上传文件</span>
        </button>
      )}

      {showDropzone && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div 
            ref={dropzoneRef}
            className="bg-white rounded-lg shadow-subtle max-w-md w-full"
          >
            <div className="flex justify-between items-center p-4 border-b border-neutral-100">
              <h2 className="text-base font-medium text-neutral-800">上传文件</h2>
              <button 
                className="text-neutral-500 hover:text-neutral-700 p-1 rounded-md hover:bg-neutral-50"
                onClick={() => setShowDropzone(false)}
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="p-5">
              <div
                {...getRootProps()}
                className={`border border-dashed p-6 rounded-lg text-center cursor-pointer ${
                  isDragActive ? 'border-neutral-500 bg-neutral-50' : 'border-neutral-300 hover:border-neutral-400'
                }`}
              >
                <input {...getInputProps()} />
                
                {isUploading ? (
                  <div className="text-center py-4">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-neutral-500 mb-2"></div>
                    <p className="text-sm text-neutral-600">处理中...</p>
                  </div>
                ) : extractedFiles.length > 0 ? (
                  <div className="text-center py-2 text-neutral-700">
                    <Check className="mx-auto h-10 w-10 text-neutral-700" />
                    <p className="mt-2 font-medium text-sm">文本提取成功!</p>
                    <p className="text-xs text-neutral-500 mt-1">
                      已处理 {extractedFiles.length} 个文件
                    </p>
                  </div>
                ) : (
                  <>
                    <FileUp className="mx-auto h-10 w-10 text-neutral-400" />
                    <p className="mt-3 text-sm text-neutral-600">
                      拖拽文件到此处，或点击选择文件
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">
                      支持 PDF, DOCX, TXT, MD 文件格式
                    </p>
                  </>
                )}
                
                {error && (
                  <div className="mt-3 text-xs text-red-500">
                    {error}
                  </div>
                )}
              </div>
              
              {extractedFiles.length > 0 && (
                <div className="mt-4 border border-neutral-200 rounded-md overflow-hidden">
                  <div className="bg-neutral-50 px-4 py-2 text-xs font-medium text-neutral-700">
                    已处理文件
                  </div>
                  <ul className="divide-y divide-neutral-100">
                    {extractedFiles.map((file, index) => (
                      <li key={index} className="px-4 py-2 text-xs flex justify-between">
                        <span className="truncate">{file.filename}</span>
                        <span className="text-neutral-500">{file.text.length} 字符</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            <div className="bg-neutral-50 px-4 py-3 flex justify-end rounded-b-lg">
              <button
                className="px-4 py-2 bg-neutral-900 text-white text-sm rounded-md hover:bg-neutral-800 transition-colors"
                onClick={() => setShowDropzone(false)}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FileUploadButton;