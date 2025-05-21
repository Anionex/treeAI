import React, { useState, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileUp, X } from 'lucide-react';
import { extractTextFromFiles } from '../utils/fileUtils';
import { FileExtractResult } from '../types';

interface FileUploadButtonProps {
  onUploadComplete: (text: string) => void;
}

const FileUploadButton: React.FC<FileUploadButtonProps> = ({ onUploadComplete }) => {
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
      } catch (err: any) {
        setError(err.message || 'Failed to extract text from files');
        setIsUploading(false);
      }
    },
  });

  return (
    <>
      <button
        className="flex items-center space-x-2 gradient-outline-button text-indigo-600 px-3 py-2 rounded-md transition-colors"
        onClick={() => setShowDropzone(true)}
      >
        <FileUp size={16} />
        <span>Upload File</span>
      </button>

      {showDropzone && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div 
            ref={dropzoneRef}
            className="bg-white rounded-lg shadow-xl max-w-md w-full"
          >
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Upload Files</h2>
              <button 
                className="text-gray-500 hover:text-gray-700"
                onClick={() => setShowDropzone(false)}
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-4">
              <div
                {...getRootProps()}
                className={`border-2 border-dashed p-6 rounded-lg text-center cursor-pointer ${
                  isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400'
                }`}
              >
                <input {...getInputProps()} />
                
                {isUploading ? (
                  <div className="text-center py-4">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500 mb-2"></div>
                    <p>Processing files...</p>
                  </div>
                ) : extractedFiles.length > 0 ? (
                  <div className="text-center py-2 text-green-600">
                    <svg 
                      className="mx-auto h-12 w-12 text-green-500" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M5 13l4 4L19 7" 
                      />
                    </svg>
                    <p className="mt-2 font-medium">Text extracted successfully!</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {extractedFiles.length} file(s) processed
                    </p>
                  </div>
                ) : (
                  <>
                    <FileUp className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600">
                      Drag & drop files here, or click to select files
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Supports PDF, DOCX, TXT, MD files
                    </p>
                  </>
                )}
                
                {error && (
                  <div className="mt-3 text-sm text-red-500">
                    {error}
                  </div>
                )}
              </div>
              
              {extractedFiles.length > 0 && (
                <div className="mt-4 border border-gray-200 rounded-md overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700">
                    Processed Files
                  </div>
                  <ul className="divide-y divide-gray-200">
                    {extractedFiles.map((file, index) => (
                      <li key={index} className="px-4 py-2 text-sm flex justify-between">
                        <span className="truncate">{file.filename}</span>
                        <span className="text-gray-500">{file.text.length} chars</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            <div className="bg-gray-50 px-4 py-3 flex justify-end rounded-b-lg">
              <button
                className="px-4 py-2 gradient-primary-button text-white rounded-md transition-colors"
                onClick={() => setShowDropzone(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FileUploadButton;