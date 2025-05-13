import { FileExtractResult } from '../types';

export async function extractTextFromFiles(files: File[]): Promise<FileExtractResult[]> {
  const results: FileExtractResult[] = [];
  
  for (const file of files) {
    try {
      let text = '';
      
      if (file.type === 'text/plain' || file.type === 'text/markdown') {
        text = await extractTextFromTextFile(file);
      } else if (file.type === 'application/pdf') {
        text = await extractTextFromPdf(file);
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        text = await extractTextFromDocx(file);
      } else {
        throw new Error(`Unsupported file type: ${file.type}`);
      }
      
      results.push({
        text,
        filename: file.name,
        mimeType: file.type
      });
    } catch (error) {
      console.error(`Error extracting text from ${file.name}:`, error);
      results.push({
        text: `[Error extracting text: ${error instanceof Error ? error.message : 'Unknown error'}]`,
        filename: file.name,
        mimeType: file.type
      });
    }
  }
  
  return results;
}

async function extractTextFromTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      resolve(e.target?.result as string || '');
    };
    reader.onerror = (e) => {
      reject(new Error('Failed to read text file'));
    };
    reader.readAsText(file);
  });
}

async function extractTextFromPdf(file: File): Promise<string> {
  throw new Error('PDF text extraction is not implemented in this browser environment.');
  
  // In a real implementation, this would use a PDF.js or similar library
  // Example pseudo-code:
  // const pdfData = await readFileAsArrayBuffer(file);
  // const pdf = await pdfjs.getDocument(pdfData).promise;
  // let text = '';
  // for (let i = 1; i <= pdf.numPages; i++) {
  //   const page = await pdf.getPage(i);
  //   const content = await page.getTextContent();
  //   text += content.items.map(item => item.str).join(' ') + '\n';
  // }
  // return text;
}

async function extractTextFromDocx(file: File): Promise<string> {
  throw new Error('DOCX text extraction is not implemented in this browser environment.');
  
  // In a real implementation, this would use mammoth.js or similar library
  // Example pseudo-code:
  // const docxData = await readFileAsArrayBuffer(file);
  // const result = await mammoth.extractRawText({ arrayBuffer: docxData });
  // return result.value;
}

async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      resolve(e.target?.result as ArrayBuffer);
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsArrayBuffer(file);
  });
}