import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileUploadProps, FileValidationError } from '../types';

const FileUpload: React.FC<FileUploadProps> = ({
  onFileUpload,
  acceptedFormats,
  maxFileSize,
  isUploading
}) => {
  const [validationError, setValidationError] = useState<FileValidationError | null>(null);

  const validateFile = useCallback((file: File): FileValidationError | null => {
    // Check file format
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedFormats.includes(fileExtension)) {
      return {
        type: 'format',
        message: `File format not supported. Please upload ${acceptedFormats.join(', ')} files.`
      };
    }

    // Check file size
    if (file.size > maxFileSize) {
      const maxSizeMB = Math.round(maxFileSize / (1024 * 1024));
      return {
        type: 'size',
        message: `File size too large. Maximum size is ${maxSizeMB}MB.`
      };
    }

    return null;
  }, [acceptedFormats, maxFileSize]);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setValidationError(null);

    if (rejectedFiles.length > 0) {
      setValidationError({
        type: 'general',
        message: 'Some files were rejected. Please check the file format and size.'
      });
      return;
    }

    if (acceptedFiles.length === 0) {
      return;
    }

    const file = acceptedFiles[0];
    if (!file) {
      return;
    }

    const error = validateFile(file);
    
    if (error) {
      setValidationError(error);
      return;
    }

    onFileUpload(file);
  }, [onFileUpload, validateFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    maxFiles: 1,
    disabled: isUploading
  });

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
          ${validationError ? 'border-red-300 bg-red-50' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center space-y-4">
          <svg
            className={`w-12 h-12 ${
              validationError ? 'text-red-400' : 'text-gray-400'
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          
          {isUploading ? (
            <div className="text-blue-600">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2" role="status" aria-label="Loading"></div>
              <p>Uploading file...</p>
            </div>
          ) : (
            <div>
              <p className="text-lg font-medium text-gray-900">
                {isDragActive
                  ? 'Drop your spreadsheet here'
                  : 'Drag & drop your spreadsheet here'
                }
              </p>
              <p className="text-sm text-gray-500 mt-1">
                or click to browse files
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Supports {acceptedFormats.join(', ')} files up to {Math.round(maxFileSize / (1024 * 1024))}MB
              </p>
            </div>
          )}
        </div>
      </div>

      {validationError && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <svg
              className="w-5 h-5 text-red-400 mr-2 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-red-700">{validationError.message}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;