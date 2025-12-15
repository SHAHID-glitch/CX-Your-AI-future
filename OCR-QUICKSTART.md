# OCR Integration - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Install Dependencies
```bash
npm install
```

This installs:
- `tesseract.js` - OCR engine
- `pdf-parse` - PDF text extraction  
- `pdf2pic` - PDF to image conversion

### Step 2: Start Your Server
```bash
npm start
# or for development with auto-reload:
npm run dev
```

You should see:
```
✅ Server running on http://localhost:3000
📁 Upload directories ready
🔍 OCR service initialized
```

### Step 3: Open the Web Interface
Open your browser and navigate to:
```
http://localhost:3000/ocr-integrated.html
```

### Step 4: Test Image OCR

1. **Select an Image**
   - Click the image upload zone or drag-and-drop
   - Supported formats: JPG, PNG, GIF, BMP, WebP
   - Max size: 10MB

2. **Choose Language** (default: English)
   - 13+ languages available
   - Select from dropdown

3. **Click "Extract Text"**
   - Wait for processing (usually 1-5 seconds)
   - View extracted text in results tab

4. **Explore Results**
   - **Extracted Text**: Full text content
   - **Statistics**: Confidence score, processing time
   - **Words**: Individual words with confidence
   - **Lines**: Lines of text with confidence

### Step 5: Test PDF OCR

1. **Select a PDF**
   - Click PDF upload zone or drag-and-drop
   - Supported format: PDF only
   - Max size: 50MB

2. **Choose Extraction Mode**
   - **"Extract with OCR"**: Converts pages to images (slower, works for scanned PDFs)
   - **"Extract Text"**: Extracts embedded text (faster, for digital PDFs)

3. **Check Results**
   - View full PDF content
   - See page-by-page breakdown
   - View statistics

### Step 6: Try Language Detection

1. Upload an image
2. Click **"Detect Language"** button
3. System automatically detects language and updates dropdown
4. Then click "Extract Text"

## 📊 API Usage Examples

### Using cURL

**Extract text from image:**
```bash
curl -X POST http://localhost:3000/api/ocr/extract \
  -F "image=@my-image.jpg" \
  -F "language=eng"
```

**Extract text from PDF:**
```bash
curl -X POST http://localhost:3000/api/ocr/extract-pdf \
  -F "pdf=@my-document.pdf" \
  -F "language=eng"
```

**Get supported languages:**
```bash
curl http://localhost:3000/api/ocr/languages
```

### Using JavaScript/Fetch

```javascript
// Extract text from image
async function extractText(imageFile) {
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('language', 'eng');
    
    const response = await fetch('http://localhost:3000/api/ocr/extract', {
        method: 'POST',
        body: formData
    });
    
    const result = await response.json();
    console.log(result.data.text); // Extracted text
    console.log(result.data.confidence); // Confidence %
}

// Extract from PDF
async function extractPdfText(pdfFile) {
    const formData = new FormData();
    formData.append('pdf', pdfFile);
    formData.append('language', 'eng');
    
    const response = await fetch('http://localhost:3000/api/ocr/extract-pdf', {
        method: 'POST',
        body: formData
    });
    
    const result = await response.json();
    console.log(result.data.text); // Full extracted text
    console.log(result.data.totalPages); // Total pages
}
```

### Using Node.js (Backend)

```javascript
const { OCRService } = require('./services/ocrService');
const ocrService = new OCRService();

// Extract from image file
async function processImage() {
    const result = await ocrService.extractText(
        './uploads/images/document.jpg',
        'eng'
    );
    
    console.log('Extracted:', result.text);
    console.log('Confidence:', result.confidence + '%');
}

// Detect language
async function detectLanguage() {
    const result = await ocrService.detectLanguage(
        './uploads/images/document.jpg'
    );
    
    console.log('Detected Language:', result.detectedLanguage);
}

// Process PDF
async function processPdf() {
    const result = await ocrService.extractTextFromPdf(
        './uploads/pdfs/document.pdf',
        'eng'
    );
    
    console.log('Pages processed:', result.processedPages);
    console.log('Average confidence:', result.confidence + '%');
}
```

## 🎯 Common Tasks

### Extract Multiple Images
```javascript
const imageFiles = ['image1.jpg', 'image2.jpg', 'image3.jpg'];
const results = await ocrService.extractTextFromMultiple(imageFiles, 'eng');
results.forEach((result, i) => {
    console.log(`Image ${i + 1}:`, result.text);
});
```

### Extract Tables from Image
```javascript
const result = await ocrService.extractStructuredData('./table-image.jpg', 'eng');
console.log('Tables found:', result.structuredData.tables);
```

### Extract from PDF URL
```javascript
const result = await ocrService.extractText(
    'https://example.com/document.pdf',
    'eng'
);
```

## 📁 File Structure

```
Your Project/
├── ocr-integrated.html          ← Main UI (open in browser)
├── services/
│   └── ocrService.js            ← OCR logic
├── routes/
│   └── ocr.js                   ← API endpoints
├── server.js                    ← Express server
├── uploads/
│   ├── images/                  ← Uploaded images
│   ├── pdfs/                    ← Uploaded PDFs
│   └── temp/                    ← Processing temp files
└── package.json                 ← Dependencies
```

## 🐛 Troubleshooting

### Server Won't Start
```
Error: Cannot find module 'tesseract.js'
→ Run: npm install tesseract.js
```

### Upload Directory Errors
```
Error: ENOENT: no such file or directory
→ Already fixed! Directories are created automatically
```

### PDF Processing is Slow
```
→ Try "Extract Text" instead of "Extract with OCR"
→ It's much faster for text-based PDFs
```

### OCR Accuracy is Poor
```
→ Check image quality (at least 200 DPI)
→ Select correct language
→ Make sure text is upright
→ Try "Detect Language" first
```

### Memory Issues
```
Start with more memory:
node --max-old-space-size=4096 server.js
```

## ✅ Verification

To verify everything is working:

1. **Check Server Logs**
   ```bash
   npm start
   ```
   Should show no errors

2. **Test API**
   ```bash
   curl http://localhost:3000/api/ocr/languages
   ```
   Should return list of languages

3. **Open UI**
   ```
   http://localhost:3000/ocr-integrated.html
   ```
   Should load without errors

4. **Upload a File**
   - Use test image or PDF
   - Click extract button
   - Should return results

## 📚 Next Steps

After getting OCR working:

1. **Integrate with your application**
   - Add OCR button to your app
   - Call API endpoints from your code

2. **Customize the UI**
   - Modify `ocr-integrated.html`
   - Change colors, layout, features

3. **Add Database Storage**
   - Save OCR results to MongoDB
   - Track extraction history

4. **Enable Authentication**
   - Protect OCR endpoints
   - Use existing auth system

5. **Add Advanced Features**
   - Batch processing
   - Email integration
   - Export options (PDF, DOCX)

## 📞 Support

**Having Issues?**
1. Check the console for error messages
2. Review OCR-INTEGRATION-GUIDE.md for detailed docs
3. Verify file sizes and formats
4. Check server logs for detailed info

**Performance Tips:**
- Upload smaller files for faster processing
- Use language detection to optimize results
- Cache results for identical files
- Process PDFs in smaller batches

---

**Ready to go?** Open `ocr-integrated.html` in your browser! 🎉
