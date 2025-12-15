# OCR Integration Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     USER INTERFACE LAYER                     │
│                  (ocr-integrated.html)                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Image Upload Section │ PDF Upload Section            │   │
│  │ - Drag & Drop       │ - Drag & Drop                  │   │
│  │ - Preview           │ - File Info                    │   │
│  │ - Language Select   │ - Language Select              │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Results Display (Tabbed Interface)           │   │
│  │ - Extracted Text    │ Statistics   │ Words           │   │
│  │ - Lines             │ Pages        │ Copy Button      │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
         ↓ (HTTP POST with FormData)
┌─────────────────────────────────────────────────────────────┐
│                    API GATEWAY LAYER                         │
│                    (Express Server)                          │
├─────────────────────────────────────────────────────────────┤
│  CORS Middleware │ Authentication │ File Upload Handler     │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────┐
│                   ROUTE HANDLER LAYER                        │
│                    (routes/ocr.js)                           │
├─────────────────────────────────────────────────────────────┤
│  Image Endpoints:              PDF Endpoints:                │
│  ├─ /extract                   ├─ /extract-pdf              │
│  ├─ /extract-url               ├─ /extract-pdf-direct       │
│  ├─ /detect-language           └─ (Future)                  │
│  ├─ /extract-structured                                     │
│  ├─ /languages                                              │
│  └─ /test                                                   │
│                                                              │
│  For each endpoint:                                         │
│  1. Upload validation                                       │
│  2. File type check                                         │
│  3. Size verification                                       │
│  4. Call OCR Service                                        │
│  5. File cleanup                                            │
│  6. Response formatting                                     │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────┐
│                   BUSINESS LOGIC LAYER                       │
│                (services/ocrService.js)                      │
├─────────────────────────────────────────────────────────────┤
│  OCRService Class                                            │
│                                                              │
│  IMAGE METHODS:           PDF METHODS:                       │
│  ├─ extractText()          ├─ extractTextFromPdf()          │
│  ├─ detectLanguage()       ├─ extractTextDirectlyFromPdf()  │
│  ├─ extractStructured()    └─ validatePdfFile()            │
│  ├─ extractTextFromMultiple() UTILITY METHODS:              │
│  ├─ validateImageFile()    ├─ getSupportedLanguages()      │
│  ├─ parseStructuredText()  ├─ parseStructuredText()        │
│  └─ (utilities)            └─ (file validation)            │
│                                                              │
│  INTEGRATED LIBRARIES:                                       │
│  ├─ Tesseract.js (OCR engine)                              │
│  ├─ pdf-parse (PDF text extraction)                        │
│  ├─ pdf2pic (PDF to image conversion)                      │
│  ├─ multer (File upload handling)                          │
│  └─ fs (File system operations)                            │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────┐
│                    STORAGE LAYER                             │
│                 (File System & Temp)                         │
├─────────────────────────────────────────────────────────────┤
│  uploads/                                                    │
│  ├── images/          (Uploaded image files)                │
│  │   └── [temp files during processing]                     │
│  ├── pdfs/            (Uploaded PDF files)                  │
│  │   └── [temp files during processing]                     │
│  └── temp/            (Temporary processing files)          │
│      ├── [converted PDF pages]                              │
│      ├── [intermediate images]                              │
│      └── [processing cache]                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagrams

### IMAGE OCR FLOW

```
User Selects Image
        ↓
[ocr-integrated.html]
- Display preview
- Validate file type & size
        ↓
User Clicks "Extract Text"
        ↓
POST /api/ocr/extract
        ↓
[routes/ocr.js] - /extract handler
- Validate using multer
- Check file size/type
        ↓
[ocrService.extractText()]
- Load image file
- Initialize Tesseract
- Run OCR with selected language
- Extract: text, confidence, words, lines
        ↓
Process Results
- Format response
- Include statistics
- Cleanup temp files
        ↓
Return JSON Response
        ↓
[ocr-integrated.html]
- Display extracted text
- Show statistics
- Show words/lines breakdown
- Enable copy to clipboard
```

### PDF OCR FLOW (with OCR)

```
User Selects PDF
        ↓
[ocr-integrated.html]
- Validate file type & size
- Show file info
        ↓
User Clicks "Extract with OCR"
        ↓
POST /api/ocr/extract-pdf
        ↓
[routes/ocr.js] - /extract-pdf handler
- Validate using multer
- Check file size (max 50MB)
        ↓
[ocrService.extractTextFromPdf()]
- Read PDF file buffer
- Parse PDF structure
- Get total page count
        ↓
For Each Page (up to 20):
  ├─ Convert page to image using pdf2pic
  ├─ Run OCR on image using Tesseract
  ├─ Extract: text, confidence, words, lines
  ├─ Store results per page
  └─ Cleanup temp image
        ↓
Aggregate Results
- Combine text from all pages
- Calculate average confidence
- Build page-by-page breakdown
        ↓
Return JSON Response
        ↓
[ocr-integrated.html]
- Display combined text
- Show page statistics
- Show per-page breakdown
- Enable page navigation
```

### PDF DIRECT TEXT EXTRACTION FLOW

```
User Selects PDF
        ↓
[ocr-integrated.html]
- Validate file type & size
        ↓
User Clicks "Extract Text"
        ↓
POST /api/ocr/extract-pdf-direct
        ↓
[routes/ocr.js] - /extract-pdf-direct handler
- Validate using multer
        ↓
[ocrService.extractTextDirectlyFromPdf()]
- Read PDF file buffer
- Use pdf-parse library
- Extract embedded text directly
- Parse PDF metadata (pages, version, info)
        ↓
Return JSON Response
(Much faster than OCR - ~1-2 seconds)
        ↓
[ocr-integrated.html]
- Display extracted text
- Show PDF metadata
```

### LANGUAGE DETECTION FLOW

```
User Uploads Image
        ↓
User Clicks "Detect Language"
        ↓
POST /api/ocr/detect-language
        ↓
[ocrService.detectLanguage()]
- Load image
- Test with multiple languages:
  ├─ English (eng)
  ├─ Spanish (spa)
  ├─ French (fra)
  ├─ German (deu)
  ├─ Chinese Simplified (chi_sim)
  └─ Arabic (ara)
        ↓
Compare Confidence Scores
        ↓
Return Best Match
        ↓
[ocr-integrated.html]
- Auto-update language dropdown
- Display detected language
```

---

## Component Interactions

### File Upload Processing

```
┌─────────────────────────────────────┐
│   Browser (ocr-integrated.html)     │
│                                     │
│  User drops file or clicks          │
│  handleImageDrop() / handlePdfDrop()│
│                                     │
│  ├─ Check file type                │
│  ├─ Check file size                │
│  ├─ Show preview (if image)        │
│  └─ Store in FileList              │
└─────────────────────────────────────┘
            ↓
┌─────────────────────────────────────┐
│   Create FormData                   │
│                                     │
│  new FormData()                     │
│  ├─ Append file                    │
│  ├─ Append language                │
│  └─ Append options                 │
└─────────────────────────────────────┘
            ↓
┌─────────────────────────────────────┐
│   Send HTTP POST Request            │
│                                     │
│  fetch('/api/ocr/extract', {       │
│    method: 'POST',                 │
│    body: formData                  │
│  })                                │
└─────────────────────────────────────┘
            ↓
┌─────────────────────────────────────┐
│   Express Server                    │
│                                     │
│  1. Receive request                │
│  2. Multer middleware              │
│     ├─ Parse FormData              │
│     ├─ Save file to uploads/       │
│     └─ Attach to req.file          │
│  3. Route handler                  │
│     ├─ Validate file               │
│     ├─ Call OCRService             │
│     └─ Clean up file               │
│  4. Send response                  │
└─────────────────────────────────────┘
            ↓
┌─────────────────────────────────────┐
│   OCRService Processing             │
│                                     │
│  1. Load file                      │
│  2. Initialize OCR library         │
│  3. Run processing                 │
│  4. Extract results                │
│  5. Return structured data         │
└─────────────────────────────────────┘
            ↓
┌─────────────────────────────────────┐
│   Response to Browser               │
│                                     │
│  {                                 │
│    success: true,                 │
│    data: {                         │
│      text: "...",                 │
│      confidence: 85.5,            │
│      ...                          │
│    }                              │
│  }                                │
└─────────────────────────────────────┘
            ↓
┌─────────────────────────────────────┐
│   Display Results                   │
│                                     │
│  ├─ Show extracted text            │
│  ├─ Show statistics                │
│  ├─ Show words/lines               │
│  ├─ Enable tabs                    │
│  └─ Enable copy button             │
└─────────────────────────────────────┘
```

---

## API Endpoint Structure

```
/api/ocr
├── POST   /extract
│   │   Headers: multipart/form-data
│   │   Fields: image, language, verbose
│   └── Response: { text, confidence, words, lines, paragraphs }
│
├── POST   /extract-url
│   │   Headers: application/json
│   │   Body: { imageUrl, language }
│   └── Response: { text, confidence, processingTime }
│
├── POST   /detect-language
│   │   Headers: multipart/form-data
│   │   Fields: image
│   └── Response: { detectedLanguage, allResults }
│
├── POST   /extract-structured
│   │   Headers: multipart/form-data
│   │   Fields: image, language
│   └── Response: { text, structuredData, rawLines }
│
├── POST   /extract-pdf
│   │   Headers: multipart/form-data
│   │   Fields: pdf, language, verbose
│   └── Response: { text, confidence, pages, totalPages, processedPages }
│
├── POST   /extract-pdf-direct
│   │   Headers: multipart/form-data
│   │   Fields: pdf
│   └── Response: { text, totalPages, version, info }
│
├── GET    /languages
│   │   Response: { languages: [ { code, name } ] }
│   │
└── GET    /test
    │   Response: { testAvailable, testResult }
    │
```

---

## Error Handling Flow

```
User Action
    ↓
┌─────────────────────────┐
│ Validation Layer        │
├─────────────────────────┤
│ ✓ File selected?       │
│ ✓ File type correct?   │
│ ✓ File size OK?        │
└─────────────────────────┘
    ↓ (Error?)
    ├─→ showAlert('error message')
    │   └─→ User sees friendly error
    │
    ✓ (All good)
    ↓
┌─────────────────────────┐
│ Processing Layer        │
├─────────────────────────┤
│ ✓ Multer upload OK?    │
│ ✓ OCR processing OK?   │
│ ✓ File cleanup OK?     │
└─────────────────────────┘
    ↓ (Error?)
    ├─→ Cleanup files
    ├─→ Return error response
    ├─→ showAlert('error message')
    │   └─→ User sees friendly error
    │
    ✓ (Success)
    ↓
┌─────────────────────────┐
│ Display Results         │
├─────────────────────────┤
│ ✓ Format response      │
│ ✓ Show success message │
│ ✓ Populate results     │
└─────────────────────────┘
```

---

## Security & Validation

```
REQUEST VALIDATION LAYERS

1. Client Side (ocr-integrated.html)
   ├─ File type check (before upload)
   ├─ File size check (before upload)
   └─ Preview validation

2. Multer Middleware (routes/ocr.js)
   ├─ MIME type verification
   ├─ Size limit enforcement
   └─ Storage path validation

3. Route Handler (routes/ocr.js)
   ├─ File object validation
   ├─ Custom validation method
   └─ Error response generation

4. Service Layer (services/ocrService.js)
   ├─ File existence check
   ├─ Read permission check
   └─ Data sanitization

5. Post-Processing
   ├─ Automatic file cleanup
   ├─ Temp file deletion
   └─ Resource deallocation
```

---

## Performance Optimization

```
OPTIMIZATION STRATEGIES

Client Side:
├─ Preview caching (don't reload on preview)
├─ Progress UI updates (smooth animation)
└─ Response streaming (large results)

Server Side:
├─ Multer streaming (don't load full file)
├─ Tesseract caching (reuse initialized instances)
├─ File cleanup (immediate after processing)
└─ Memory management (garbage collection)

Network:
├─ FormData compression (if supported)
├─ Chunked uploads (for large files)
└─ Response pagination (for large results)

Database (if integrated):
├─ Indexed searches (for results)
├─ Caching layer (Redis/Memcached)
└─ Batch operations (bulk inserts)
```

---

## Scalability Considerations

```
HORIZONTAL SCALING

┌─────────────────────────────────────────┐
│   Load Balancer (nginx/HAProxy)         │
└─────────────────────────────────────────┘
         ↓
    ┌────┴─────┬────────┐
    ↓          ↓        ↓
┌────────┐ ┌────────┐ ┌────────┐
│Server 1│ │Server 2│ │Server 3│
└────────┘ └────────┘ └────────┘
    ↓          ↓        ↓
    └────┬─────┴────────┘
         ↓
┌─────────────────────────────────────────┐
│  Shared Storage (S3/Azure Blob)         │
│  - uploads/images                       │
│  - uploads/pdfs                         │
│  - uploads/temp                         │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│  Cache Layer (Redis)                    │
│  - OCR results                          │
│  - Language detection                   │
│  - Supported languages list             │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│  Job Queue (Bull/RabbitMQ)              │
│  - Async OCR processing                 │
│  - PDF batch jobs                       │
│  - Language detection queue             │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│  Monitoring & Logging (ELK Stack)       │
│  - Request logs                         │
│  - Error tracking                       │
│  - Performance metrics                  │
└─────────────────────────────────────────┘
```

---

## Integration Points

```
YOUR APPLICATION
    ↓
┌──────────────────────────┐
│  Authentication Layer    │  (Protect endpoints)
└──────────────────────────┘
    ↓
┌──────────────────────────┐
│  Database Layer          │  (Store results)
│  - Conversations         │  (Link to existing data)
│  - Messages              │
│  - OCR Results (new)     │
└──────────────────────────┘
    ↓
┌──────────────────────────┐
│  OCR Service             │  (This integration)
└──────────────────────────┘
    ↓
┌──────────────────────────┐
│  Export Layer            │  (PDF, DOCX, etc.)
└──────────────────────────┘
    ↓
┌──────────────────────────┐
│  External Services       │  (Email, Slack, etc.)
└──────────────────────────┘
```

---

This architecture is:
- ✅ **Modular**: Easy to extend and modify
- ✅ **Scalable**: Can handle growing load
- ✅ **Maintainable**: Clear separation of concerns
- ✅ **Secure**: Multi-layer validation
- ✅ **Performant**: Optimized for speed
- ✅ **Reliable**: Comprehensive error handling

