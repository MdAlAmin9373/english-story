from gtts import gTTS
import os
import re
import json

with open('words.json', 'r', encoding='utf-8') as f:
    words = json.load(f)

output_dir = "public/audio/words"
os.makedirs(output_dir, exist_ok=True)

print(f"Generating audio for {len(words)} words...")

for i, word in enumerate(words, 1):
    filename = re.sub(r'[^a-z0-9]+', '-', word.lower().strip()) + ".mp3"
    filepath = os.path.join(output_dir, filename)
    
    if os.path.exists(filepath):
        continue
        
    try:
        tts = gTTS(text=word, lang='en', slow=False)
        tts.save(filepath)
        print(f"[{i}/{len(words)}] Saved: {filename}")
    except Exception as e:
        print(f"Error ({word}): {e}")

print("Done!")