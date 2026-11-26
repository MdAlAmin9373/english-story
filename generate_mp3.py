import asyncio
import edge_tts
import os
import re
import json

async def generate_audio():
    with open('words.json', 'r', encoding='utf-8') as f:
        words = json.load(f)

    output_dir = "public/audio/words"
    os.makedirs(output_dir, exist_ok=True)
    
    # মাইক্রোসফটের প্রিমিয়াম নিউরাল ভয়েস
    voice = "en-US-AriaNeural" 

    print(f"Generating MP3 audio for {len(words)} words...")

    for i, word in enumerate(words, 1):
        filename = re.sub(r'[^a-z0-9]+', '-', word.lower().strip()) + ".mp3"
        filepath = os.path.join(output_dir, filename)
        
        if os.path.exists(filepath) and os.path.getsize(filepath) > 1000:
            print(f"[{i}/{len(words)}] Skipped: {filename}")
            continue

        try:
            communicate = edge_tts.Communicate(word, voice)
            await communicate.save(filepath)
            print(f"[{i}/{len(words)}] Saved: {filename}")
        except Exception as e:
            print(f"Error ({word}): {e}")

    print("Done!")

if __name__ == "__main__":
    asyncio.run(generate_audio())