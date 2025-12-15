require('dotenv').config();
const Groq = require('groq-sdk');
const fs = require('fs');

async function speechToTextGroq() {
  try {
    const audioPath = "voice.wav";
    
    if (!fs.existsSync(audioPath)) {
      console.log('❌ Audio file not found: voice.wav');
      return;
    }

    console.log('🎤 Processing speech-to-text with Groq...');
    console.log('Using Whisper model via Groq API');
    
    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });

    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(audioPath),
      model: "whisper-large-v3",
    });

    console.log('\n✅ Transcription successful!');
    console.log('📝 Text:', transcription.text);
    
    // Save to file
    fs.writeFileSync('transcription.txt', transcription.text);
    console.log('\n💾 Saved to: transcription.txt');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

speechToTextGroq();
