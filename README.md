<p align="center">
  <img src="public/github-banner-v3.png" alt="ElevenLabs WebUI Banner" width="100%">
</p>

# ElevenLabs WebUI

A fast, local-first web interface for the ElevenLabs API. Built to make generating, editing, and managing audio takes easier.

---

## ⚡ Use It Instantly (No Setup Required)

If you just want to use the tool, you **do not** need to install anything.

👉 **[Launch ElevenLabs WebUI](https://elevenlabs-all-in-one.vercel.app)** 

This live version runs the exact same code you see in this repository. Just open the link, paste your API key in the settings, and start creating.

---

## 🛡️ Privacy & Zero Data Collection

This application has **no database** and **no backend**. 

- **Local Storage:** Your API key, generated audio history, and workspace settings are saved strictly in your browser using `IndexedDB` and `localStorage`.
- **Zero Logging:** Your text and audio are never tracked, logged, or intercepted. 
- **Verifiable:** The code is 100% open-source. You can read it yourself to verify how your data is handled.

---

## 🏢 For Teams & Agencies (Shared API Key)

If you have a team using a single corporate ElevenLabs account, you can self-host this UI to share access without exposing your API key to everyone.

1. Clone or download this repository.
2. Create a `.env.local` file in the root folder.
3. Add your corporate key: `ELEVENLABS_API_KEY=your_key_here`
4. Run or deploy the app.

When configured this way, the Next.js server acts as a secure proxy. Team members can use the UI without needing to enter a key, and the API key never reaches their browsers.

---

## 🛠️ Local Development

If you want to run the project locally or modify the code:

1. Clone this repository.
2. Run `npm install`
3. Run `npm run dev`
4. Open `http://localhost:3000`
