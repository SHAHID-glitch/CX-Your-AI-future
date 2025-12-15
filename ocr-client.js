// OCR Client Module for Frontend
class OCRClient {
    constructor(apiBaseUrl = 'http://localhost:3000/api/ocr') {
        this.apiBaseUrl = apiBaseUrl;
    }

    /**
     * Extract text from an image file
     * @param {File} file - Image file
     * @param {string} language - Language code (default: 'eng')
     * @param {boolean} verbose - Verbose logging
     * @param {Function} onProgress - Progress callback
     * @returns {Promise<Object>} OCR result
     */
    async extractTextFromFile(file, language = 'eng', verbose = false, onProgress = null) {
        try {
            if (onProgress) onProgress('Preparing image...');

            const formData = new FormData();
            formData.append('image', file);
            formData.append('language', language);
            formData.append('verbose', verbose.toString());

            if (onProgress) onProgress('Processing with OCR...');

            const response = await fetch(`${this.apiBaseUrl}/extract`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (onProgress) onProgress('Complete!');

            return result;

        } catch (error) {
            console.error('❌ OCR extraction error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Extract text from image URL
     * @param {string} imageUrl - Image URL
     * @param {string} language - Language code
     * @returns {Promise<Object>} OCR result
     */
    async extractTextFromUrl(imageUrl, language = 'eng') {
        try {
            const response = await fetch(`${this.apiBaseUrl}/extract-url`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ imageUrl, language })
            });

            return await response.json();

        } catch (error) {
            console.error('❌ OCR URL extraction error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Detect language from image
     * @param {File} file - Image file
     * @returns {Promise<Object>} Language detection result
     */
    async detectLanguage(file) {
        try {
            const formData = new FormData();
            formData.append('image', file);

            const response = await fetch(`${this.apiBaseUrl}/detect-language`, {
                method: 'POST',
                body: formData
            });

            return await response.json();

        } catch (error) {
            console.error('❌ Language detection error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Extract structured data from image
     * @param {File} file - Image file
     * @param {string} language - Language code
     * @returns {Promise<Object>} Structured data result
     */
    async extractStructuredData(file, language = 'eng') {
        try {
            const formData = new FormData();
            formData.append('image', file);
            formData.append('language', language);

            const response = await fetch(`${this.apiBaseUrl}/extract-structured`, {
                method: 'POST',
                body: formData
            });

            return await response.json();

        } catch (error) {
            console.error('❌ Structured data extraction error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get supported languages
     * @returns {Promise<Array>} Supported languages
     */
    async getSupportedLanguages() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/languages`);
            const result = await response.json();
            return result.success ? result.languages : [];

        } catch (error) {
            console.error('❌ Error fetching languages:', error);
            return [];
        }
    }

    /**
     * Test OCR functionality
     * @returns {Promise<Object>} Test result
     */
    async testOCR() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/test`);
            return await response.json();

        } catch (error) {
            console.error('❌ OCR test error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Client-side OCR using Tesseract.js (fallback when backend is not available)
     * @param {File|string} image - Image file or URL
     * @param {string} language - Language code
     * @param {Function} onProgress - Progress callback
     * @returns {Promise<Object>} OCR result
     */
    async extractTextClientSide(image, language = 'eng', onProgress = null) {
        try {
            // Check if Tesseract is available
            if (typeof Tesseract === 'undefined') {
                throw new Error('Tesseract.js not loaded. Please include the library in your HTML.');
            }

            console.log('🔍 Starting client-side OCR...');
            
            const startTime = Date.now();

            const { data } = await Tesseract.recognize(
                image,
                language,
                {
                    logger: onProgress ? (m) => {
                        if (m.status === 'recognizing text') {
                            onProgress(`Processing: ${Math.round(m.progress * 100)}%`);
                        }
                    } : undefined
                }
            );

            const endTime = Date.now();
            const processingTime = endTime - startTime;

            return {
                success: true,
                data: {
                    text: data.text,
                    confidence: data.confidence,
                    processingTime,
                    language,
                    words: data.words || [],
                    lines: data.lines || [],
                    paragraphs: data.paragraphs || []
                }
            };

        } catch (error) {
            console.error('❌ Client-side OCR error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// OCR UI Helper Functions
class OCRUIHelper {
    constructor(ocrClient) {
        this.ocrClient = ocrClient;
        this.currentFile = null;
        this.currentLanguage = 'eng';
    }

    /**
     * Create OCR interface elements
     * @param {string} containerId - Container element ID
     */
    createInterface(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('❌ Container not found:', containerId);
            return;
        }

        container.innerHTML = `
            <div class="ocr-interface">
                <div class="ocr-upload-section">
                    <div class="ocr-drop-zone" onclick="document.getElementById('ocrFileInput').click()">
                        <div class="ocr-drop-content">
                            <i class="fas fa-cloud-upload-alt ocr-upload-icon"></i>
                            <p>Drop an image here or click to select</p>
                            <p class="ocr-supported-formats">Supported: JPG, PNG, GIF, BMP, WebP</p>
                        </div>
                    </div>
                    <input type="file" id="ocrFileInput" accept="image/*" style="display: none;">
                    
                    <div class="ocr-options">
                        <label for="ocrLanguageSelect">Language:</label>
                        <select id="ocrLanguageSelect">
                            <option value="eng">English</option>
                            <option value="spa">Spanish</option>
                            <option value="fra">French</option>
                            <option value="deu">German</option>
                            <option value="chi_sim">Chinese (Simplified)</option>
                        </select>
                        
                        <div class="ocr-buttons">
                            <button id="ocrExtractBtn" disabled>Extract Text</button>
                            <button id="ocrDetectLangBtn" disabled>Detect Language</button>
                            <button id="ocrStructuredBtn" disabled>Extract Tables</button>
                        </div>
                    </div>
                </div>

                <div class="ocr-preview-section" style="display: none;">
                    <h3>Image Preview</h3>
                    <img id="ocrImagePreview" style="max-width: 100%; max-height: 300px; border-radius: 8px;">
                </div>

                <div class="ocr-progress" style="display: none;">
                    <div class="ocr-progress-bar">
                        <div class="ocr-progress-fill"></div>
                    </div>
                    <p id="ocrProgressText">Processing...</p>
                </div>

                <div class="ocr-results-section" style="display: none;">
                    <h3>Results</h3>
                    <div class="ocr-result-tabs">
                        <button class="ocr-tab-btn active" onclick="ocrUIHelper.showTab('text')">Text</button>
                        <button class="ocr-tab-btn" onclick="ocrUIHelper.showTab('details')">Details</button>
                        <button class="ocr-tab-btn" onclick="ocrUIHelper.showTab('structured')">Tables</button>
                    </div>
                    
                    <div id="ocr-tab-text" class="ocr-tab-content">
                        <textarea id="ocrExtractedText" placeholder="Extracted text will appear here..." rows="10"></textarea>
                        <button onclick="ocrUIHelper.copyText()" class="ocr-copy-btn">
                            <i class="fas fa-copy"></i> Copy Text
                        </button>
                    </div>
                    
                    <div id="ocr-tab-details" class="ocr-tab-content" style="display: none;">
                        <div id="ocrDetails"></div>
                    </div>
                    
                    <div id="ocr-tab-structured" class="ocr-tab-content" style="display: none;">
                        <div id="ocrStructuredData"></div>
                    </div>
                </div>
            </div>
        `;

        this.setupEventListeners();
        this.loadSupportedLanguages();
    }

    /**
     * Setup event listeners for OCR interface
     */
    setupEventListeners() {
        const fileInput = document.getElementById('ocrFileInput');
        const extractBtn = document.getElementById('ocrExtractBtn');
        const detectLangBtn = document.getElementById('ocrDetectLangBtn');
        const structuredBtn = document.getElementById('ocrStructuredBtn');
        const dropZone = document.querySelector('.ocr-drop-zone');

        // File input change
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileSelect(e.target.files[0]);
            }
        });

        // Drag and drop
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0 && files[0].type.startsWith('image/')) {
                this.handleFileSelect(files[0]);
            }
        });

        // Button clicks
        extractBtn.addEventListener('click', () => this.extractText());
        detectLangBtn.addEventListener('click', () => this.detectLanguage());
        structuredBtn.addEventListener('click', () => this.extractStructured());

        // Language selection
        document.getElementById('ocrLanguageSelect').addEventListener('change', (e) => {
            this.currentLanguage = e.target.value;
        });
    }

    /**
     * Handle file selection
     * @param {File} file - Selected file
     */
    handleFileSelect(file) {
        this.currentFile = file;
        
        // Show preview
        const preview = document.getElementById('ocrImagePreview');
        const previewSection = document.querySelector('.ocr-preview-section');
        
        const reader = new FileReader();
        reader.onload = (e) => {
            preview.src = e.target.result;
            previewSection.style.display = 'block';
        };
        reader.readAsDataURL(file);

        // Enable buttons
        document.getElementById('ocrExtractBtn').disabled = false;
        document.getElementById('ocrDetectLangBtn').disabled = false;
        document.getElementById('ocrStructuredBtn').disabled = false;
    }

    /**
     * Extract text from selected image
     */
    async extractText() {
        if (!this.currentFile) return;

        this.showProgress('Extracting text...');
        
        try {
            const result = await this.ocrClient.extractTextFromFile(
                this.currentFile, 
                this.currentLanguage,
                false,
                (status) => this.updateProgress(status)
            );

            this.hideProgress();

            if (result.success) {
                this.showResults({
                    text: result.data.text,
                    confidence: result.data.confidence,
                    processingTime: result.data.processingTime,
                    wordCount: result.data.wordCount,
                    lineCount: result.data.lineCount
                });
            } else {
                this.showError(result.error);
            }

        } catch (error) {
            this.hideProgress();
            this.showError(error.message);
        }
    }

    /**
     * Detect language from selected image
     */
    async detectLanguage() {
        if (!this.currentFile) return;

        this.showProgress('Detecting language...');
        
        try {
            const result = await this.ocrClient.detectLanguage(this.currentFile);
            this.hideProgress();

            if (result.success) {
                const langSelect = document.getElementById('ocrLanguageSelect');
                langSelect.value = result.detectedLanguage;
                this.currentLanguage = result.detectedLanguage;
                
                alert(`Detected language: ${result.detectedLanguage}`);
            } else {
                this.showError(result.error);
            }

        } catch (error) {
            this.hideProgress();
            this.showError(error.message);
        }
    }

    /**
     * Extract structured data from selected image
     */
    async extractStructured() {
        if (!this.currentFile) return;

        this.showProgress('Extracting structured data...');
        
        try {
            const result = await this.ocrClient.extractStructuredData(
                this.currentFile, 
                this.currentLanguage
            );

            this.hideProgress();

            if (result.success) {
                this.showResults({
                    text: result.data.text,
                    confidence: result.data.confidence,
                    processingTime: result.data.processingTime,
                    structuredData: result.data.structuredData
                });
                this.showTab('structured');
            } else {
                this.showError(result.error);
            }

        } catch (error) {
            this.hideProgress();
            this.showError(error.message);
        }
    }

    /**
     * Show progress indicator
     * @param {string} message - Progress message
     */
    showProgress(message) {
        const progress = document.querySelector('.ocr-progress');
        const progressText = document.getElementById('ocrProgressText');
        
        progress.style.display = 'block';
        progressText.textContent = message;
    }

    /**
     * Update progress message
     * @param {string} message - Progress message
     */
    updateProgress(message) {
        const progressText = document.getElementById('ocrProgressText');
        if (progressText) {
            progressText.textContent = message;
        }
    }

    /**
     * Hide progress indicator
     */
    hideProgress() {
        const progress = document.querySelector('.ocr-progress');
        progress.style.display = 'none';
    }

    /**
     * Show OCR results
     * @param {Object} results - OCR results
     */
    showResults(results) {
        const resultsSection = document.querySelector('.ocr-results-section');
        const textArea = document.getElementById('ocrExtractedText');
        const details = document.getElementById('ocrDetails');
        const structured = document.getElementById('ocrStructuredData');

        // Show results section
        resultsSection.style.display = 'block';

        // Populate text tab
        textArea.value = results.text || '';

        // Populate details tab
        details.innerHTML = `
            <div class="ocr-detail-item">
                <strong>Confidence:</strong> ${(results.confidence || 0).toFixed(2)}%
            </div>
            <div class="ocr-detail-item">
                <strong>Processing Time:</strong> ${results.processingTime || 0}ms
            </div>
            <div class="ocr-detail-item">
                <strong>Word Count:</strong> ${results.wordCount || 0}
            </div>
            <div class="ocr-detail-item">
                <strong>Line Count:</strong> ${results.lineCount || 0}
            </div>
            <div class="ocr-detail-item">
                <strong>Language:</strong> ${this.currentLanguage}
            </div>
        `;

        // Populate structured data tab
        if (results.structuredData && results.structuredData.tables.length > 0) {
            let structuredHTML = '<h4>Detected Tables:</h4>';
            results.structuredData.tables.forEach((table, index) => {
                structuredHTML += `
                    <div class="ocr-table">
                        <h5>Table ${index + 1}</h5>
                        <table class="ocr-data-table">
                            <thead>
                                <tr>
                                    ${table.headers.map(header => `<th>${header}</th>`).join('')}
                                </tr>
                            </thead>
                            <tbody>
                                ${table.rows.map(row => 
                                    `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`
                                ).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            });
            structured.innerHTML = structuredHTML;
        } else {
            structured.innerHTML = '<p>No structured data detected.</p>';
        }
    }

    /**
     * Show error message
     * @param {string} error - Error message
     */
    showError(error) {
        alert('OCR Error: ' + error);
    }

    /**
     * Show specific result tab
     * @param {string} tabName - Tab name
     */
    showTab(tabName) {
        // Hide all tabs
        document.querySelectorAll('.ocr-tab-content').forEach(tab => {
            tab.style.display = 'none';
        });
        
        // Remove active class from all buttons
        document.querySelectorAll('.ocr-tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Show selected tab
        const selectedTab = document.getElementById(`ocr-tab-${tabName}`);
        if (selectedTab) {
            selectedTab.style.display = 'block';
        }

        // Add active class to selected button
        const selectedBtn = document.querySelector(`.ocr-tab-btn[onclick*="${tabName}"]`);
        if (selectedBtn) {
            selectedBtn.classList.add('active');
        }
    }

    /**
     * Copy extracted text to clipboard
     */
    copyText() {
        const textArea = document.getElementById('ocrExtractedText');
        textArea.select();
        document.execCommand('copy');
        alert('Text copied to clipboard!');
    }

    /**
     * Load supported languages into select dropdown
     */
    async loadSupportedLanguages() {
        try {
            const languages = await this.ocrClient.getSupportedLanguages();
            const select = document.getElementById('ocrLanguageSelect');
            
            select.innerHTML = '';
            languages.forEach(lang => {
                const option = document.createElement('option');
                option.value = lang.code;
                option.textContent = lang.name;
                select.appendChild(option);
            });

        } catch (error) {
            console.error('❌ Error loading languages:', error);
        }
    }
}

// Initialize OCR functionality
let ocrClient, ocrUIHelper;

document.addEventListener('DOMContentLoaded', () => {
    ocrClient = new OCRClient();
    ocrUIHelper = new OCRUIHelper(ocrClient);
});