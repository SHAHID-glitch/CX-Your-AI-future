# File Conversion Feature Guide

## 🔄 Available Conversions

### 1. PDF to DOCX ⚠️ Limited Support
Convert PDF documents to Word format (DOCX)

**⚠️ Browser Limitation:**
True PDF to DOCX conversion with full formatting requires server-side tools. Browser-based JavaScript cannot extract formatted text from PDFs.

**Recommended alternatives:**
- Adobe Acrobat Online
- Smallpdf.com
- PDF2DOC.com
- Microsoft Word (File → Open → Select PDF)

### 2. DOCX to PDF ✅ Full Support
Convert Word documents to PDF format

**How to use:**
1. Click the 📎 attachment button
2. Upload a DOCX/DOC file
3. Type in chat: "convert this docx to pdf" or "change word to pdf"

**Features:**
- ✅ Full text extraction
- ✅ Preserves all content
- ✅ Formatted PDF output

### 3. Image to PDF ✅ Full Support
Convert images (JPEG, PNG, GIF, WebP) to PDF

**How to use:**
1. Click the 📎 attachment button
2. Upload an image file
3. Type in chat: "convert this image to pdf" or "change picture to pdf"

**Features:**
- ✅ Full image quality preserved
- ✅ Auto-scales to A4 size
- ✅ Perfect visual fidelity

## 📝 Example Prompts

### PDF to DOCX
- "convert this pdf to docx"
- "change pdf to word"
- "transform this pdf to word document"
- "convert to docx"

### DOCX to PDF
- "convert this docx to pdf"
- "change word to pdf"
- "transform this word document to pdf"
- "convert to pdf"

### Image to PDF
- "convert this image to pdf"
- "change picture to pdf"
- "transform photo to pdf"
- "make pdf from image"

## ⚡ Features

### PDF to DOCX
- ✅ Text extraction from PDF
- ✅ Basic structure preservation
- ✅ Preview before download
- ✅ One-click download
- ⚠️ Note: Complex formatting may need specialized tools

### DOCX to PDF
- ✅ Full text extraction
- ✅ Formatted PDF output
- ✅ Automatic page sizing
- ✅ Metadata preservation
- ✅ Instant preview

### Image to PDF
- ✅ Maintains image quality
- ✅ Auto-scales to A4 size
- ✅ Portrait/Landscape detection
- ✅ Centered image placement
- ✅ Image dimensions preserved

## 🎯 Workflow

1. **Upload File** → Click 📎 button in chat
2. **Select File** → Choose your file
3. **Request Conversion** → Type conversion command
4. **Wait** → Processing takes a few seconds
5. **Download** → Click download button or preview first

## 🔧 Technical Details

- **Libraries Used:**
  - jsPDF (PDF creation)
  - docx (DOCX creation)
  - mammoth.js (DOCX reading)
  - pdf-lib (PDF reading)
  
- **File Size Limits:**
  - Browser-based, depends on available memory
  - Recommended: < 10MB files
  
- **Supported Formats:**
  - PDF: .pdf
  - Word: .doc, .docx
  - Images: .jpg, .jpeg, .png, .gif, .webp

## 💡 Tips

1. **Better Results:**
   - Use clear, well-formatted source files
   - Smaller files process faster
   - Test with sample files first

2. **Troubleshooting:**
   - If conversion fails, check file format
   - Ensure file is not corrupted
   - Try with a smaller file first
   - Refresh page if issues persist

3. **Limitations:**
   - PDF to DOCX: Basic text extraction only
   - Complex layouts may not preserve perfectly
   - Images in PDFs may not transfer

## 🚀 Quick Start

```
Step 1: Click 📎 → Choose file
Step 2: Type "convert to pdf" (or desired format)
Step 3: Download result!
```

## 📊 Conversion Quality

| Source → Target | Quality | Speed | Notes |
|----------------|---------|-------|-------|
| DOCX → PDF | ⭐⭐⭐⭐⭐ | Fast | Full text preserved |
| Image → PDF | ⭐⭐⭐⭐⭐ | Fast | Perfect quality |
| PDF → DOCX | ❌ | N/A | **Not supported in browser** - Use specialized tools |

## ⚠️ Important Limitations

### PDF to DOCX Conversion
**Why it doesn't work in browsers:**
- PDFs store content as rendered graphics, not editable text
- Text extraction requires complex PDF parsing
- Formatting, fonts, and layout info are encoded
- JavaScript PDF libraries (pdf-lib) cannot extract text content
- Only server-side tools (like Adobe, Python libraries) can do this properly

**What works:**
- ✅ DOCX → PDF (all text preserved)
- ✅ Image → PDF (perfect quality)
- ❌ PDF → DOCX (requires specialized software)

**Recommended tools for PDF to DOCX:**
1. **Adobe Acrobat** - Best quality
2. **Microsoft Word** - Open PDF directly
3. **Smallpdf.com** - Online converter
4. **Python + pdfminer** - For developers

---

**Last Updated:** December 12, 2025  
**Version:** 1.0
