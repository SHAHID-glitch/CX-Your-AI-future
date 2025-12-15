const express = require('express');
const { OCRService, uploadSingle, uploadPdfSingle } = require('../services/ocrService');
const path = require('path');
const fs = require('fs');

const router = express.Router();
const ocrService = new OCRService();

/**
 * POST /api/ocr/extract
 * Extract text from uploaded image
 */
router.post('/extract', (req, res) => {
    uploadSingle(req, res, async (err) => {
        if (err) {
            console.error('❌ Upload error:', err);
            return res.status(400).json({
                success: false,
                error: err.message
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No image file provided'
            });
        }

        try {
            // Validate file
            const validation = ocrService.validateImageFile(req.file);
            if (!validation.valid) {
                // Clean up uploaded file
                fs.unlinkSync(req.file.path);
                return res.status(400).json({
                    success: false,
                    error: validation.error
                });
            }

            const language = req.body.language || 'eng';
            const verbose = req.body.verbose === 'true';

            console.log(`🔍 Processing OCR request for: ${req.file.filename}`);
            console.log(`📝 Language: ${language}`);

            // Extract text
            const result = await ocrService.extractText(req.file.path, language, { verbose });

            // Clean up uploaded file after processing
            fs.unlinkSync(req.file.path);

            if (result.success) {
                res.json({
                    success: true,
                    data: {
                        text: result.text,
                        confidence: result.confidence,
                        processingTime: result.processingTime,
                        language: result.language,
                        wordCount: result.words?.length || 0,
                        lineCount: result.lines?.length || 0,
                        words: result.words,
                        lines: result.lines,
                        paragraphs: result.paragraphs
                    }
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: result.error
                });
            }

        } catch (error) {
            console.error('❌ OCR processing error:', error);
            
            // Clean up file on error
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }

            res.status(500).json({
                success: false,
                error: 'Failed to process image for OCR'
            });
        }
    });
});

/**
 * POST /api/ocr/extract-url
 * Extract text from image URL
 */
router.post('/extract-url', async (req, res) => {
    try {
        const { imageUrl, language = 'eng' } = req.body;

        if (!imageUrl) {
            return res.status(400).json({
                success: false,
                error: 'Image URL is required'
            });
        }

        console.log(`🔍 Processing OCR for URL: ${imageUrl}`);

        const result = await ocrService.extractText(imageUrl, language);

        if (result.success) {
            res.json({
                success: true,
                data: {
                    text: result.text,
                    confidence: result.confidence,
                    processingTime: result.processingTime,
                    language: result.language,
                    wordCount: result.words?.length || 0,
                    lineCount: result.lines?.length || 0
                }
            });
        } else {
            res.status(500).json({
                success: false,
                error: result.error
            });
        }

    } catch (error) {
        console.error('❌ OCR URL processing error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process image URL for OCR'
        });
    }
});

/**
 * POST /api/ocr/detect-language
 * Detect language from uploaded image
 */
router.post('/detect-language', (req, res) => {
    uploadSingle(req, res, async (err) => {
        if (err) {
            return res.status(400).json({
                success: false,
                error: err.message
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No image file provided'
            });
        }

        try {
            console.log(`🌐 Detecting language for: ${req.file.filename}`);

            const result = await ocrService.detectLanguage(req.file.path);

            // Clean up uploaded file
            fs.unlinkSync(req.file.path);

            res.json(result);

        } catch (error) {
            console.error('❌ Language detection error:', error);
            
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }

            res.status(500).json({
                success: false,
                error: 'Failed to detect language from image'
            });
        }
    });
});

/**
 * POST /api/ocr/extract-structured
 * Extract structured data (tables) from uploaded image
 */
router.post('/extract-structured', (req, res) => {
    uploadSingle(req, res, async (err) => {
        if (err) {
            return res.status(400).json({
                success: false,
                error: err.message
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No image file provided'
            });
        }

        try {
            const language = req.body.language || 'eng';

            console.log(`📊 Extracting structured data from: ${req.file.filename}`);

            const result = await ocrService.extractStructuredData(req.file.path, language);

            // Clean up uploaded file
            fs.unlinkSync(req.file.path);

            if (result.success) {
                res.json({
                    success: true,
                    data: {
                        text: result.text,
                        confidence: result.confidence,
                        processingTime: result.processingTime,
                        structuredData: result.structuredData,
                        rawLines: result.rawLines,
                        language: result.language
                    }
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: result.error
                });
            }

        } catch (error) {
            console.error('❌ Structured data extraction error:', error);
            
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }

            res.status(500).json({
                success: false,
                error: 'Failed to extract structured data from image'
            });
        }
    });
});

/**
 * GET /api/ocr/languages
 * Get supported languages
 */
router.get('/languages', (req, res) => {
    const languages = ocrService.getSupportedLanguages();
    const languageNames = {
        'eng': 'English',
        'spa': 'Spanish',
        'fra': 'French',
        'deu': 'German',
        'ita': 'Italian',
        'por': 'Portuguese',
        'rus': 'Russian',
        'chi_sim': 'Chinese (Simplified)',
        'chi_tra': 'Chinese (Traditional)',
        'jpn': 'Japanese',
        'kor': 'Korean',
        'ara': 'Arabic',
        'hin': 'Hindi'
    };

    const formattedLanguages = languages.map(code => ({
        code,
        name: languageNames[code] || code
    }));

    res.json({
        success: true,
        languages: formattedLanguages
    });
});

/**
 * GET /api/ocr/test
 * Test OCR functionality with a sample image
 */
router.get('/test', async (req, res) => {
    try {
        // You can replace this with a path to a test image
        const testImagePath = path.join(__dirname, '..', 'test-images', 'sample.jpg');
        
        if (!fs.existsSync(testImagePath)) {
            return res.json({
                success: false,
                error: 'No test image available. Upload an image to test OCR functionality.',
                testAvailable: false
            });
        }

        const result = await ocrService.extractText(testImagePath, 'eng');

        res.json({
            success: true,
            testAvailable: true,
            testResult: {
                text: result.text?.substring(0, 200) + '...',
                confidence: result.confidence,
                processingTime: result.processingTime
            }
        });

    } catch (error) {
        console.error('❌ OCR test error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to run OCR test',
            testAvailable: false
        });
    }
});

/**
 * POST /api/ocr/extract-pdf
 * Extract text from uploaded PDF using OCR
 */
router.post('/extract-pdf', (req, res) => {
    uploadPdfSingle(req, res, async (err) => {
        if (err) {
            console.error('❌ PDF upload error:', err);
            return res.status(400).json({
                success: false,
                error: err.message
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No PDF file provided'
            });
        }

        try {
            // Validate file
            const validation = ocrService.validatePdfFile(req.file);
            if (!validation.valid) {
                // Clean up uploaded file
                fs.unlinkSync(req.file.path);
                return res.status(400).json({
                    success: false,
                    error: validation.error
                });
            }

            const language = req.body.language || 'eng';
            const verbose = req.body.verbose === 'true';

            console.log(`📄 Processing PDF OCR request for: ${req.file.filename}`);
            console.log(`📝 Language: ${language}`);

            // Extract text from PDF
            const result = await ocrService.extractTextFromPdf(req.file.path, language, { verbose });

            // Clean up uploaded file after processing
            fs.unlinkSync(req.file.path);

            if (result.success) {
                res.json({
                    success: true,
                    data: {
                        text: result.text,
                        confidence: result.confidence,
                        processingTime: result.processingTime,
                        language: result.language,
                        totalPages: result.totalPages,
                        processedPages: result.processedPages,
                        pages: result.pages
                    }
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: result.error
                });
            }

        } catch (error) {
            console.error('❌ PDF OCR processing error:', error);
            
            // Clean up file on error
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }

            res.status(500).json({
                success: false,
                error: 'Failed to process PDF for OCR: ' + error.message
            });
        }
    });
});

/**
 * POST /api/ocr/extract-pdf-direct
 * Extract text directly from PDF (embedded text, no OCR)
 */
router.post('/extract-pdf-direct', (req, res) => {
    uploadPdfSingle(req, res, async (err) => {
        if (err) {
            console.error('❌ PDF upload error:', err);
            return res.status(400).json({
                success: false,
                error: err.message
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No PDF file provided'
            });
        }

        try {
            // Validate file
            const validation = ocrService.validatePdfFile(req.file);
            if (!validation.valid) {
                // Clean up uploaded file
                fs.unlinkSync(req.file.path);
                return res.status(400).json({
                    success: false,
                    error: validation.error
                });
            }

            console.log(`📄 Processing direct text extraction for PDF: ${req.file.filename}`);

            // Extract text directly from PDF
            const result = await ocrService.extractTextDirectlyFromPdf(req.file.path);

            // Clean up uploaded file after processing
            fs.unlinkSync(req.file.path);

            if (result.success) {
                res.json({
                    success: true,
                    data: {
                        text: result.text,
                        totalPages: result.totalPages,
                        version: result.version,
                        info: result.info
                    }
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: result.error
                });
            }

        } catch (error) {
            console.error('❌ Direct PDF text extraction error:', error);
            
            // Clean up file on error
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }

            res.status(500).json({
                success: false,
                error: 'Failed to extract text from PDF: ' + error.message
            });
        }
    });
});

module.exports = router;