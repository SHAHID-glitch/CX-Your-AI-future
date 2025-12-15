import whisper
import torch

print("🎤 Loading Whisper model...")
# Use tiny model for speed (works without GPU)
model = whisper.load_model("tiny")

audio_file = "voice.wav"
print(f"📁 Processing: {audio_file}")

# Transcribe
print("⏳ Transcribing...")
result = model.transcribe(audio_file, fp16=False)  # fp16=False for CPU

print("\n✅ Transcription complete!\n")
print("📝 Text:", result["text"])
print("\n" + "="*50)

# Save to file
with open("transcription.txt", "w", encoding="utf-8") as f:
    f.write(result["text"])
    
print("💾 Saved to: transcription.txt")
