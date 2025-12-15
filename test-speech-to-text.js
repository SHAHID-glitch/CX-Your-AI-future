require('dotenv').config();
const fs = require('fs');

async function speechToText() {
  try {
    // Check if audio file exists
    const audioPath = "voice.wav";
    
    if (!fs.existsSync(audioPath)) {
      console.log('❌ Audio file not found: voice.wav');
      console.log('📝 Please add a voice.wav file to test speech-to-text');
      console.log('💡 You can record audio or use any .wav audio file');
      return;
    }

    console.log('🎤 Processing speech-to-text...');
    console.log('Using Hugging Face Serverless Inference API');
    console.log('Model: openai/whisper-tiny.en');
    
    const audioData = fs.readFileSync(audioPath);
    
    // Try with Hugging Face Serverless Inference API
    const response = await fetch(
      "https://api-inference.huggingface.co/models/openai/whisper-tiny.en",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.HUGGINGFACE_API_KEY}`
        },
        body: audioData
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Response status:', response.status);
      console.error('Response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    console.log('\n✅ Transcription successful!');
    console.log('📝 Text:', result.text);
    
    // Save transcription to file
    fs.writeFileSync('transcription.txt', result.text);
    console.log('\n💾 Transcription saved to: transcription.txt');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      const errorText = await error.response.text();
      console.error('Response:', errorText);
    }
  }
}

speechToText();
