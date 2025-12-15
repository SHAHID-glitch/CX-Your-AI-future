require('dotenv').config();
const { HfInference } = require('@huggingface/inference');
const fs = require('fs');

async function generateImage() {
  try {
    console.log('Generating image with Hugging Face Inference API...');
    console.log('Using model: black-forest-labs/FLUX.1-schnell');
    
    const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);
    
    const imageBlob = await hf.textToImage({
      model: "black-forest-labs/FLUX.1-schnell",
      inputs: "A futuristic cyberpunk city at night, ultra realistic, neon lights, rain, detailed architecture"
    });
    
    const buffer = Buffer.from(await imageBlob.arrayBuffer());
    fs.writeFileSync("generated-image.png", buffer);
    
    console.log('✅ Image generated successfully! Saved as generated-image.png');
    console.log('📁 File size:', (buffer.length / 1024).toFixed(2), 'KB');
  } catch (error) {
    console.error('❌ Error generating image:', error.message);
    if (error.response) {
      console.error('Response:', await error.response.text());
    }
  }
}

generateImage();
