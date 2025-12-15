// AI PDF Generator using Hugging Face API and jsPDF
// This script generates text using Llama-3-8b model and creates a PDF

// Note: You'll need to include jsPDF in your HTML or install it via npm
// For browser: <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
// For Node.js: npm install jspdf

async function createAIPdf() {
  try {
    // Replace with your actual Hugging Face API key
    const API_KEY = process.env.HUGGINGFACE_API_KEY || "YOUR_API_KEY";
    
    console.log("Generating AI text...");
    
    const response = await fetch("https://api-inference.huggingface.co/models/meta-llama/Llama-3-8b", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ 
        inputs: "Write a comprehensive paragraph about IoT (Internet of Things) including its applications and benefits." 
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Handle different response formats
    let text;
    if (Array.isArray(data) && data[0]?.generated_text) {
      text = data[0].generated_text;
    } else if (data.generated_text) {
      text = data.generated_text;
    } else {
      throw new Error("Unexpected response format from API");
    }

    console.log("Generated text:", text);

    // Create PDF
    const { jsPDF } = window.jsPDF || require('jspdf');
    const pdf = new jsPDF();
    
    // Set font and add title
    pdf.setFontSize(16);
    pdf.text("AI-Generated Content", 10, 20);
    
    pdf.setFontSize(12);
    pdf.text("Generated using Llama-3-8b model", 10, 30);
    
    // Add the generated text with word wrapping
    pdf.setFontSize(10);
    const splitText = pdf.splitTextToSize(text, 180);
    pdf.text(splitText, 10, 50);
    
    // Save the PDF
    pdf.save("AI-Generated-IoT.pdf");
    
    console.log("PDF saved successfully!");
    return pdf;

  } catch (error) {
    console.error("Error creating AI PDF:", error);
    throw error;
  }
}

// Example usage
async function testAIPdfGeneration() {
  try {
    await createAIPdf();
  } catch (error) {
    console.error("Failed to create AI PDF:", error.message);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createAIPdf, testAIPdfGeneration };
}