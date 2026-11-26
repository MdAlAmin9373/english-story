import pyttsx3
import os
import re
import json
import time

with open('words.json', 'r', encoding='utf-8') as f:
    words = json.load(f)

output_dir = "public/audio/words"
os.makedirs(output_dir, exist_ok=True)

print(f"Generating WAV audio for {len(words)} words...")

for i, word in enumerate(words, 1):
    filename = re.sub(r'[^a-z0-9]+', '-', word.lower().strip()) + ".wav"
    filepath = os.path.join(output_dir, filename)
    
    # যদি ফাইল আগে থেকেই তৈরি হয়ে থাকে, তবে স্কিপ করবে
    if os.path.exists(filepath) and os.path.getsize(filepath) > 1000:
        print(f"[{i}/{len(words)}] Skipped: {filename}")
        continue

    try:
        # প্রতিবার নতুন করে ইঞ্জিন চালু করা (যাতে Windows হ্যাং না করে)
        engine = pyttsx3.init()
        engine.setProperty('rate', 130)
        engine.save_to_file(word, filepath)
        engine.runAndWait()
        engine.stop() 
        time.sleep(0.5) # ০.৫ সেকেন্ড বিরতি
        
        print(f"[{i}/{len(words)}] Saved: {filename}")
    except Exception as e:
        print(f"Error ({word}): {e}")

print("Done!")