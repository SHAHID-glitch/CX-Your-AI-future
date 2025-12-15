# OCR (Optical Character Recognition) Integration

## Overview

This project now includes comprehensive OCR functionality using Tesseract.js to extract text from images. The implementation provides both server-side and client-side OCR capabilities.

## Features

✨ **Multi-Language Support**: English, Spanish, French, German, Chinese, Japanese, Korean, Arabic, Hindi, and more

📊 **Structured Data Extraction**: Detect and extract tables from images

🎯 **High Accuracy**: Confidence scoring and detailed extraction results

📱 **Cross-Platform**: Works on desktop, tablet, and mobile devices

🔄 **Fallback Support**: Server-side processing with client-side fallback

## Quick Start

### Basic Usage (Your Original Request)

```javascript
import Tesseract from "tesseract.js";

Tesseract.recognize(
  "image.jpg",
  "eng"
).then(({ data: { text } }) => {
  console.log(text);
});
```

### Enhanced Usage

```javascript
// With error handling and progress
async function extractText() {
  try {
    const { data: { text, confidence } } = await Tesseract.recognize(
      "path/to/image.jpg",
      "eng",
      {
        logger: m => console.log(m) // Progress logging
      }
    );
    
    console.log('Text:', text);
    console.log('Confidence:', confidence + '%');
  } catch (error) {
    console.error('OCR Error:', error);
  }
}
```

## API Endpoints

### POST `/api/ocr/extract`
Extract text from uploaded image file.

**Request**: Form data with `image` file and optional `language` parameter

**Response**:
```json
{
  "success": true,
  "data": {
    "text": "Extracted text content",
    "confidence": 95.67,
    "processingTime": 2341,
    "language": "eng",
    "wordCount": 42,
    "lineCount": 5
  }
}
```

### POST `/api/ocr/extract-url`
Extract text from image URL.

**Request**:
```json
{
  "imageUrl": "https://example.com/image.jpg",
  "language": "eng"
}
```

### POST `/api/ocr/detect-language`
Auto-detect language from image.

### POST `/api/ocr/extract-structured`
Extract structured data (tables) from image.

### GET `/api/ocr/languages`
Get list of supported languages.

### GET `/api/ocr/test`
Test OCR functionality.

## Usage in Your App

### 1. Chat Integration
The OCR functionality is integrated into your main chat interface:

- Upload an image containing text
- The system will ask if you want to extract text
- Extracted text appears in the chat with confidence scores

### 2. Dedicated OCR Interface
Visit `http://localhost:3000/ocr-test.html` for a full-featured OCR testing interface with:

- Drag & drop image upload
- Language selection
- Real-time processing
- Results with confidence scores
- Table extraction
- Copy-to-clipboard functionality

### 3. Voice Commands
Ask in the chat:
- "extract text from image"
- "OCR this image"
- "read text from image"
- "image to text"

## File Structure

```
├── services/
│   └── ocrService.js          # Core OCR service
├── routes/
│   └── ocr.js                 # API endpoints
├── ocr-client.js              # Frontend OCR client
├── ocr-test.html              # Testing interface
├── simple-ocr-example.js      # Basic examples
└── first.js                   # Integrated chat functionality
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

## Best Practices for OCR

### Image Quality Tips
- **High contrast**: Dark text on light background works best
- **Good resolution**: At least 300 DPI for printed text
- **Straight orientation**: Avoid rotated or skewed images
- **Clear lighting**: Avoid shadows and glare
- **Sharp focus**: Blurry text reduces accuracy

### File Format Support
- **JPEG/JPG**: Most common, good for photos
- **PNG**: Best for screenshots and graphics
- **GIF**: Supported but not recommended for text
- **BMP**: Uncompressed, good quality
- **WebP**: Modern format, good compression

## Error Handling

The OCR system includes comprehensive error handling:

- **File validation**: Checks file type and size
- **Processing errors**: Handles Tesseract failures gracefully  
- **Network issues**: Fallback to client-side processing
- **Auth requirements**: Proper authentication error messages

## Performance Considerations

- **Server-side processing**: Faster and more reliable
- **Client-side fallback**: Works when server is unavailable
- **File size limits**: 10MB maximum per image
- **Processing time**: Varies based on image size and complexity

## Examples

### Extract text from uploaded file
```javascript
const ocrClient = new OCRClient();
const result = await ocrClient.extractTextFromFile(file, 'eng');
if (result.success) {
  console.log('Extracted text:', result.data.text);
}
```

### Detect language automatically
```javascript
const langResult = await ocrClient.detectLanguage(file);
console.log('Detected language:', langResult.detectedLanguage);
```

### Extract tables
```javascript
const tableResult = await ocrClient.extractStructuredData(file, 'eng');
console.log('Tables found:', tableResult.data.structuredData.tables);
```

## Troubleshooting

### Common Issues

1. **"OCR service unavailable"**
   - Ensure server is running on port 3000
   - Check that tesseract.js is installed: `npm list tesseract.js`

2. **Low confidence scores**
   - Improve image quality
   - Ensure correct language is selected
   - Try preprocessing image (adjust contrast, brightness)

3. **No text extracted**
   - Verify image contains readable text
   - Check if text is too small or blurry
   - Try different language settings

4. **Server errors**
   - Check server logs for detailed error messages
   - Verify uploads directory exists and is writable
   - Ensure sufficient disk space

### Debug Mode

Enable verbose logging:
```javascript
const result = await ocrClient.extractTextFromFile(file, 'eng', true);
```

## Next Steps

- **Image preprocessing**: Add automatic image enhancement
- **Batch processing**: Process multiple images at once
- **Custom training**: Train for specific fonts or layouts
- **PDF support**: Extract text from PDF pages
- **Real-time camera**: Live OCR from camera feed

## Support

For issues or questions:
1. Check the server logs for detailed error messages
2. Test with the OCR test interface at `/ocr-test.html`
3. Verify image quality meets the recommended standards
4. Ensure proper language selection for non-English text