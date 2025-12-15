# OCR Integration - Image & PDF Text Extraction

## Overview

This integration adds comprehensive OCR (Optical Character Recognition) capabilities to your application, supporting both **image files** and **PDF documents** with intelligent text extraction and language detection.

## Features

### ✨ Image OCR
- **Multi-format support**: JPG, PNG, GIF, BMP, WebP
- **Multi-language support**: 13+ languages (English, Spanish, French, German, Italian, Portuguese, Russian, Chinese, Japanese, Korean, Arabic, Hindi)
- **Text extraction** with confidence scores
- **Language detection** from images
- **Structured data** extraction (tables, etc.)
- **Word and line-level** analysis with bounding boxes
- Maximum file size: **10MB**

### 📄 PDF OCR
- **Two extraction modes**:
  1. **OCR Mode**: Converts PDF pages to images and extracts text using Tesseract
  2. **Direct Mode**: Extracts embedded text directly from PDF (faster for text-based PDFs)
- **Multi-language OCR** on each PDF page
- **Page-by-page** processing with confidence scores
- **Batch processing** of multiple pages
- Maximum file size: **50MB**

### 🎯 Advanced Features
- Real-time **progress tracking**
- **Drag-and-drop** file upload
- **Preview** before processing
- **Copy to clipboard** functionality
- **Statistics** display (confidence, processing time, word count)
- **Detailed results** with word and line breakdowns
- **Error handling** with user-friendly messages

## Installation

### 1. Install Dependencies

Run this command to install all required packages:

```bash
npm install
```

Required packages added:
- `tesseract.js` - OCR engine
- `pdf-parse` - PDF text extraction
- `pdf2pic` - PDF to image conversion
- Other existing dependencies

### 2. Directory Structure

The following directories are created automatically:
```
uploads/
├── images/      # Uploaded image files
├── pdfs/        # Uploaded PDF files
└── temp/        # Temporary processing files
```

### 3. Environment Configuration

Ensure your `.env` file includes (if using Azure OpenAI for additional services):
```
MONGODB_URI=mongodb://localhost:27017/copilot-chat
JWT_SECRET=your-jwt-secret
SESSION_SECRET=your-session-secret
```

## API Endpoints

### Image OCR

#### Extract Text from Image
```
POST /api/ocr/extract
Content-Type: multipart/form-data

Parameters:
- image: File (required) - Image file to process
- language: String (optional) - Language code (default: 'eng')
- verbose: Boolean (optional) - Enable detailed logging

Response:
{
  "success": true,
  "data": {
    "text": "Extracted text content...",
    "confidence": 85.5,
    "processingTime": 3500,
    "language": "eng",
    "wordCount": 150,
    "lineCount": 25,
    "words": [...],
    "lines": [...],
    "paragraphs": [...]
  }
}
```

#### Detect Language from Image
```
POST /api/ocr/detect-language
Content-Type: multipart/form-data

Parameters:
- image: File (required) - Image file to analyze

Response:
{
  "success": true,
  "detectedLanguage": "eng",
  "allResults": [...]
}
```

#### Extract Text from Image URL
```
POST /api/ocr/extract-url
Content-Type: application/json

Request Body:
{
  "imageUrl": "https://example.com/image.jpg",
  "language": "eng"
}
```

#### Extract Structured Data (Tables)
```
POST /api/ocr/extract-structured
Content-Type: multipart/form-data

Parameters:
- image: File (required) - Image file containing tables
- language: String (optional) - Language code

Response:
{
  "success": true,
  "data": {
    "text": "Extracted text...",
    "structuredData": {
      "tables": [...],
      "totalTables": 2,
      "hasStructuredData": true
    },
    "rawLines": [...]
  }
}
```

### PDF OCR

#### Extract Text from PDF with OCR
```
POST /api/ocr/extract-pdf
Content-Type: multipart/form-data

Parameters:
- pdf: File (required) - PDF file to process
- language: String (optional) - Language code (default: 'eng')
- verbose: Boolean (optional) - Enable detailed logging

Response:
{
  "success": true,
  "data": {
    "text": "Page 1 content...\n---\nPage 2 content...",
    "confidence": 82.3,
    "processingTime": 8500,
    "language": "eng",
    "totalPages": 10,
    "processedPages": 10,
    "pages": [
      {
        "pageNumber": 1,
        "text": "...",
        "confidence": 85.5,
        "words": [...],
        "lines": [...]
      }
    ]
  }
}
```

#### Extract Text Directly from PDF
```
POST /api/ocr/extract-pdf-direct
Content-Type: multipart/form-data

Parameters:
- pdf: File (required) - PDF file to process

Response:
{
  "success": true,
  "data": {
    "text": "Extracted embedded text...",
    "totalPages": 5,
    "version": "1.4",
    "info": {...}
  }
}
```

### Utility Endpoints

#### Get Supported Languages
```
GET /api/ocr/languages

Response:
{
  "success": true,
  "languages": [
    { "code": "eng", "name": "English" },
    { "code": "spa", "name": "Spanish" },
    ...
  ]
}
```

#### Test OCR Functionality
```
GET /api/ocr/test

Response:
{
  "success": true,
  "testAvailable": true,
  "testResult": {
    "text": "Sample extracted text...",
    "confidence": 88.5,
    "processingTime": 2300
  }
}
```

## Web Interface

### File: `ocr-integrated.html`

A comprehensive, modern web interface with:

#### Features:
- **Split-view layout**: Image OCR on left, PDF OCR on right
- **Real-time preview**: See uploaded files before processing
- **Language selection**: Choose from 13+ languages
- **Multiple extraction modes**: Regular OCR, language detection, structured data
- **Progress tracking**: Visual progress bar during processing
- **Tabbed results display**:
  - Extracted Text
  - Statistics (confidence, processing time)
  - Words (with confidence scores)
  - Lines (with confidence scores)
  - Pages (for PDFs)
- **Copy to clipboard**: Easy sharing of results
- **Drag-and-drop support**: Drop files anywhere
- **Mobile responsive**: Works on all screen sizes

### Usage:
1. Open `ocr-integrated.html` in your browser
2. Select either an image or PDF
3. Choose your language
4. Click appropriate button ("Extract Text", "Extract with OCR", etc.)
5. View results in tabbed interface

## Code Integration

### Service Layer: `services/ocrService.js`

Main OCR service class with methods:

```javascript
const ocrService = new OCRService();

// Image OCR
await ocrService.extractText(imagePath, language, options);
await ocrService.detectLanguage(imagePath);
await ocrService.extractStructuredData(imagePath, language);
await ocrService.extractTextFromMultiple(imagePaths, language);

// PDF OCR
await ocrService.extractTextFromPdf(pdfPath, language, options);
await ocrService.extractTextDirectlyFromPdf(pdfPath);

// Validation
ocrService.validateImageFile(file);
ocrService.validatePdfFile(file);

// Utilities
ocrService.getSupportedLanguages();
ocrService.parseStructuredText(lines);
```

### Routes: `routes/ocr.js`

All OCR endpoints with error handling and file validation.

### Server Integration: `server.js`

Added OCR routes to Express server:
```javascript
const ocrRoutes = require('./routes/ocr');
app.use('/api/ocr', ocrRoutes);
```

## Supported Languages

| Code | Language |
|------|----------|
| eng | English |
| spa | Spanish |
| fra | French |
| deu | German |
| ita | Italian |
| por | Portuguese |
| rus | Russian |
| chi_sim | Chinese (Simplified) |
| chi_tra | Chinese (Traditional) |
| jpn | Japanese |
| kor | Korean |
| ara | Arabic |
| hin | Hindi |

## Error Handling

All endpoints include comprehensive error handling:

- **Validation errors**: File type, size limits
- **Processing errors**: OCR failures, PDF parsing issues
- **Timeout errors**: Long-running operations
- **User-friendly messages**: Clear error descriptions

Example error response:
```json
{
  "success": false,
  "error": "File too large. Maximum size is 10MB."
}
```

## Performance Considerations

### Image Processing:
- **Small images** (<500KB): 1-3 seconds
- **Large images** (5-10MB): 5-15 seconds
- **Multi-language detection**: +2-3 seconds per language

### PDF Processing:
- **Direct text extraction**: 1-2 seconds (fast for text-based PDFs)
- **OCR mode**: 5-30 seconds per page (depends on image quality)
- **Multi-page PDFs**: Processes first 20 pages to prevent timeout

### Optimization Tips:
1. **Resize large images** before uploading
2. **Use direct PDF extraction** for text-based PDFs
3. **Process PDFs with fewer pages** for faster results
4. **Increase server timeout** for large files:
   ```javascript
   app.post('/api/ocr/extract-pdf', (req, res) => {
       req.setTimeout(300000); // 5 minutes
   });
   ```

## Security

- **File validation**: Type and size checking
- **File cleanup**: Automatic deletion after processing
- **CORS configuration**: Restricted origins in production
- **Rate limiting**: Can be added with `rate-limiter-flexible`

### Recommended Production Setup:

```javascript
// Add rate limiting
const rateLimit = require('rate-limiter-flexible');
const rateLimiter = new rateLimit.RateLimiterMemory({
    points: 10, // 10 requests
    duration: 60 // per 60 seconds
});

app.use('/api/ocr', async (req, res, next) => {
    try {
        await rateLimiter.consume(req.ip);
        next();
    } catch (err) {
        res.status(429).json({ success: false, error: 'Too many requests' });
    }
});
```

## Testing

### Manual Testing with cURL:

```bash
# Test image OCR
curl -X POST http://localhost:3000/api/ocr/extract \
  -F "image=@/path/to/image.jpg" \
  -F "language=eng"

# Test PDF OCR
curl -X POST http://localhost:3000/api/ocr/extract-pdf \
  -F "pdf=@/path/to/file.pdf" \
  -F "language=eng"

# Test language detection
curl -X POST http://localhost:3000/api/ocr/detect-language \
  -F "image=@/path/to/image.jpg"

# Get supported languages
curl http://localhost:3000/api/ocr/languages
```

### Browser Testing:
1. Start your server: `npm start`
2. Open `http://localhost:3000/ocr-integrated.html`
3. Test both image and PDF processing

## Troubleshooting

### Issue: "Module not found: tesseract.js"
**Solution**: Run `npm install tesseract.js`

### Issue: "ENOENT: uploads directory"
**Solution**: Directories are created automatically on first run

### Issue: PDF processing timeout
**Solution**: 
- Process smaller PDFs first
- Increase server timeout in Express
- Use direct text extraction instead of OCR mode

### Issue: Poor OCR accuracy
**Solution**:
- Ensure image quality is high (minimum 200 DPI)
- Select correct language
- Check image orientation
- Avoid skewed or rotated text

### Issue: High memory usage
**Solution**:
- Process smaller files
- Limit batch processing
- Add periodic garbage collection
- Increase Node.js heap: `node --max-old-space-size=4096 server.js`

## Next Steps

### Enhancement Ideas:
1. **Batch Processing**: Process multiple files simultaneously
2. **Caching**: Cache OCR results for identical files
3. **Background Jobs**: Use queues for long-running processes
4. **Advanced Formatting**: Return formatted documents (DOCX, PDF)
5. **Table Extraction**: Improved table detection and export
6. **Handwriting Recognition**: Support for handwritten text
7. **Invoice/Receipt Parsing**: Specialized extraction for receipts
8. **Document Classification**: Automatic document type detection

### Integration Points:
1. **Email Integration**: Extract text from document attachments
2. **Database Storage**: Save extraction results
3. **Search Index**: Index extracted text for full-text search
4. **Export Options**: Save as TXT, DOCX, PDF
5. **Analytics**: Track OCR usage and accuracy

## Support & Resources

- **Tesseract.js Docs**: https://github.com/naptha/tesseract.js
- **PDF-Parse Docs**: https://github.com/modillion/pdf-parse
- **Express Documentation**: https://expressjs.com/
- **File Upload Best Practices**: https://owasp.org/www-community/attacks/arbitrary_file_upload

## License

MIT License - See LICENSE file for details

---

**Version**: 1.0.0  
**Last Updated**: December 2025  
**Maintained By**: Your Team
