const fs = require('fs');
const path = require('path');
const pdfLib = require('pdf-parse');
const mammoth = require('mammoth');

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword'
];

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

async function extractDocumentText(filePath, originalName, mimeType) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found at path: ${filePath}`);
  }

  const stats = fs.statSync(filePath);
  if (stats.size === 0) {
    throw new Error('Uploaded file is empty (0 bytes).');
  }

  if (stats.size > MAX_FILE_SIZE) {
    throw new Error(`File size (${Math.round(stats.size / (1024 * 1024))}MB) exceeds maximum limit of 25MB.`);
  }

  const ext = path.extname(originalName).toLowerCase();
  let extractedText = '';
  let pageCount = 1;

  try {
    if (ext === '.pdf' || mimeType === 'application/pdf') {
      const dataBuffer = fs.readFileSync(filePath);

      if (pdfLib.PDFParse) {
        const parser = new pdfLib.PDFParse({ data: dataBuffer });
        await parser.load();
        const textObj = await parser.getText();
        extractedText = typeof textObj === 'string' ? textObj : textObj.text || '';
        pageCount = textObj.total || textObj.pages?.length || 1;
        if (parser.destroy) await parser.destroy();
      } else if (typeof pdfLib === 'function') {
        const pdfData = await pdfLib(dataBuffer);
        extractedText = pdfData.text || '';
        pageCount = pdfData.numpages || 1;
      }
    } else if (ext === '.docx' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ path: filePath });
      extractedText = result.value || '';
      pageCount = Math.max(1, Math.ceil(extractedText.split(/\s+/).length / 400));
    } else if (ext === '.txt') {
      extractedText = fs.readFileSync(filePath, 'utf8');
      pageCount = Math.max(1, Math.ceil(extractedText.split(/\s+/).length / 400));
    } else {
      throw new Error(`Unsupported document format: ${ext}. Supported formats are PDF and DOCX.`);
    }
  } catch (err) {
    throw new Error(`Document text extraction failed: ${err.message}`);
  }

  extractedText = extractedText.trim();
  if (!extractedText || extractedText.length < 10) {
    throw new Error('Document extraction returned insufficient or unreadable text.');
  }

  return {
    text: extractedText,
    pageCount,
    charCount: extractedText.length,
    wordCount: extractedText.split(/\s+/).length
  };
}

module.exports = {
  extractDocumentText,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE
};
