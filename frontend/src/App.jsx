import React, { useState, useRef, useEffect } from 'react';
import { GiMagicSwirl } from 'react-icons/gi';
import { FaPlay, FaStop, FaMicrophone } from 'react-icons/fa';

const App = () => {
  const [recipeName, setRecipeName] = useState('');
  const [recipe, setRecipe] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState([]);
  const utteranceRef = useRef(null);

  // Load available voices (fix: voices may load late)
  useEffect(() => {
    const loadVoices = () => {
      const vs = window.speechSynthesis.getVoices();
      setVoices(vs);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  // Utility: Clean recipe text
  const cleanMarkdown = (text) =>
    text.replace(/[*_#`]/g, '').replace(/\n\s*\n/g, '\n\n').trim();

  // Generate recipe (backend call)
  const handleGenerateRecipe = async () => {
    if (!recipeName) {
      alert('कृपया रेसिपी का नाम बताइए!');
      return;
    }
    setIsLoading(true);
    setRecipe('');

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/generate-recipe`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipe: recipeName }),
        }
      );

      if (!response.ok) throw new Error('Server error');
      const data = await response.json();
      setRecipe(cleanMarkdown(data.recipe));
    } catch (error) {
      console.error('Failed to fetch recipe:', error);
      alert('अभी रेसिपी बनाने में दिक्कत हो रही है। कृपया दोबारा प्रयास करें।');
    } finally {
      setIsLoading(false);
    }
  };

  // Speak recipe in Hindi
  const handleSpeak = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    if (!recipe) return;

    // Clean markdown, but KEEP numbers (quantities are important)
    const text = recipe.replace(/[*_#`]/g, '').trim();

    const utterance = new SpeechSynthesisUtterance(text);

    // Get voices dynamically
    let vs = window.speechSynthesis.getVoices();

    if (!vs.length) {
      // Voices not loaded yet → wait and retry
      window.speechSynthesis.onvoiceschanged = () => handleSpeak();
      return;
    }

    // Prefer Hindi voice if available
    const hindiVoice = vs.find(v => v.lang === 'hi-IN' || v.lang.startsWith('hi'));
    if (hindiVoice) {
      utterance.voice = hindiVoice;
    }

    // Voice tuning
    utterance.pitch = 1;
    utterance.rate = 0.95;
    utterance.volume = 1;

    // Handle end
    utterance.onend = () => setIsSpeaking(false);

    // Save ref and speak
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };


  // Speech-to-Text input
  const startRecognition = () => {
    const recognition = new (window.SpeechRecognition ||
      window.webkitSpeechRecognition)();
    recognition.lang = 'hi-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.start();

    recognition.onresult = (event) => {
      setRecipeName(event.results[0][0].transcript);
    };

    recognition.onspeechend = () => recognition.stop();

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      alert('मैं समझ नहीं पाया, कृपया दोबारा बोलें।');
    };
  };

  return (
    <div className="min-h-screen bg-night-sky text-star-twinkle flex flex-col items-center p-4">
      <div className="w-full max-w-3xl">
        <header className="text-center my-8">
          <h1 className="text-5xl font-bold text-moon-glow animate-pulse">
            🍲 Recipe Generator ✨
          </h1>
          <p className="text-lg mt-2">
            बस रेसिपी का नाम बताइए (टाइप या बोलकर), और मैं आपको हिंदी में पूरी रेसिपी बताऊंगा।
          </p>
        </header>

        <main>
          <div className="bg-storybook-bg/20 p-6 rounded-2xl shadow-lg">
            <div className="flex items-center gap-4">
              <input
                type="text"
                value={recipeName}
                onChange={(e) => setRecipeName(e.target.value)}
                placeholder="जैसे: जलेबी, पनीर बटर मसाला"
                className="w-full p-4 rounded-xl bg-night-sky/80 text-moon-glow placeholder-moon-glow/70 focus:ring-2 focus:ring-moon-glow focus:outline-none"
              />
              <button
                onClick={startRecognition}
                className="p-4 rounded-full bg-moon-glow text-night-sky hover:scale-110 transition-transform"
              >
                <FaMicrophone size={24} />
              </button>
            </div>

            <button
              onClick={handleGenerateRecipe}
              disabled={isLoading}
              className="w-full mt-4 flex items-center justify-center gap-2 text-2xl font-bold bg-moon-glow text-night-sky py-4 rounded-xl hover:scale-105 transition-transform disabled:bg-gray-400"
            >
              {isLoading ? (
                <>
                  <span>Generating...</span>
                  <GiMagicSwirl className="animate-spin" />
                </>
              ) : (
                <>
                  <span>Generate Recipe</span>
                  <GiMagicSwirl />
                </>
              )}
            </button>
          </div>

          {recipe && (
            <div className="mt-8 bg-storybook-bg p-8 rounded-2xl shadow-2xl text-storybook-text">
              <h2 className="text-3xl font-bold text-center mb-4">
                आपकी रेसिपी 🍛
              </h2>
              <p className="text-lg whitespace-pre-wrap">{recipe}</p>
              <div className="text-center mt-6">
                <button
                  onClick={handleSpeak}
                  className="p-4 rounded-full bg-night-sky text-moon-glow hover:scale-110 transition-transform"
                >
                  {isSpeaking ? <FaStop size={30} /> : <FaPlay size={30} />}
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
