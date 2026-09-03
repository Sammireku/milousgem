# MilousGem Story Studio 📖✨

**MilousGem Story Studio** is an AI-powered interactive storybook creation platform and reading environment designed for readers of all ages, with special emphasis on early readers (Ages 5–7) and children's literature. 

It combines advanced Google Gemini story generation with 3D Pixar-style scene illustration, real-time voice narration, multi-language translation, interactive branching paths, printable keepsakes, and ambient soundscapes.

---

## 🌟 Key Features

### 🎨 1. 3D Pixar Art Style Master Standard
- Every generated scene illustration follows a **3D Pixar character model & lighting rendering protocol**.
- Character anchors and signature traits remain consistent across pages to eliminate visual drift.
- Dynamic rotational camera lenses (24mm wide-angle, 35mm low-angle action, 50mm emotional close-up) bring every page to life.

### 👶 2. Early Reader & Kids Mode Anti-Purple-Prose Engine
- Specialized children's author persona tailored for **5-to-7-year-olds (Early Readers / Kindergarten to 2nd Grade)**.
- **Strict Vocabulary & Grammar Rules**: High-frequency words, 5–10 word average sentence lengths, active voice, and maximum 1 adjective per sentence.
- **Zero Purple Prose**: Strict ban on adult vocabulary, poetic metaphors, or flowery sensory filler (e.g., words like "luminescent", "brine", or "solitude" are forbidden).
- Includes lively dialogue, cheerful sound effects (*"Whoosh!", "Splash!", "Clack!"*), and short 2–5 sentence approachable paragraphs.

### ⚡ 3. Lazy Loading & Progressive Illustration Prefetching
- **Fast Book Creation**: Initial book creation paints artwork only for the first 3 pages upfront, allowing readers to start enjoying stories instantly.
- **Background Prefetch Engine**: As the reader turns pages, upcoming chapter artwork is prefetched in the background (look-ahead of 2 pages).
- **Graceful Loading UI**: If a reader advances before an image is ready, a shimmering artwork placeholder card displays progress and automatically updates when ready.

### 🎭 4. Full Interactive Story Creator
- **Custom Cast Creator**: Design unique protagonists, companions, species, signature items, speech patterns, and visual traits.
- **Rich Story Parameters**: Select genres, subgenre mashups, target audiences, tone, themes, and moral lessons (e.g., sharing, honesty, courage, teamwork).
- **Branching Decision Engine**: Every page presents branching paths with risk indicators (*Safe, Balanced, Risky*), allowing readers to shape the narrative or type custom actions.

### 🔊 5. Voice Narration & Ambient Soundscapes
- **Multilingual Speech Synthesis**: Natural read-aloud voice narration for every page.
- **Interactive Soundscapes**: Soothing background audio environments including *Magical Forest, Rain on Tent, Cozy Bedtime, Space Station, and Ocean Waves*.

### 🌐 6. Multi-Language Reader
- Translate stories on-the-fly into multiple languages (Dutch, Spanish, French, German, Japanese, Chinese, etc.).
- Includes **Bilingual Mode** for dual-language learning and vocabulary development.

### 🖨️ 7. Keepsakes & Export Options
- **Printable PDF & Booklets**: Export full-color illustrated storybooks or monochrome line-art coloring pages for offline offline reading.
- **EPUB E-Reader & Text Export**: Export stories in standard e-reader formats.
- **Margin Notes & Bookmarks**: Save favorite pages and add personal notes to chapters.

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: React 18, Vite, Tailwind CSS, Motion (`motion/react`), Lucide Icons.
- **Backend**: Express (Node.js/TypeScript bundled via esbuild).
- **AI Models & Engines**:
  - **Text Generation**: Google Gemini API (`@google/genai`) with resilient fallback protocols.
  - **Illustration Rendering**: Pollinations AI & Gemini image prompts.
- **Persistence**: Firestore / Local state sync.

---

## 🚀 Getting Started

### Installation

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Environment Configuration**:
   Ensure `.env` contains your Gemini API key:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. **Run Development Server**:
   ```bash
   npm run dev
   ```
   The application will run at `http://localhost:3000`.

4. **Build for Production**:
   ```bash
   npm run build
   npm start
   ```

---

## 📄 License

Created for MilousGem AI Studio. All rights reserved.
