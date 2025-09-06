import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-1.5-flash-latest";

if (!GEMINI_API_KEY) {
    console.error("❌ Missing GEMINI_API_KEY in .env file");
    process.exit(1);
}

// ✅ Helper to build the request payload
function buildPayload(prompt) {
    return {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 1024,
        },
    };
}

// Main route for recipe generation
app.post('/generate-recipe', async (req, res) => {
    try {
        const { recipe } = req.body;

        if (!recipe || typeof recipe !== 'string') {
            return res.status(400).json({ error: 'Missing or invalid recipe name' });
        }

        // Custom prompt for Hindi recipe
        const recipePrompt = `
आप एक पेशेवर शेफ हैं। 
उपयोगकर्ता ने पूछा है: "${recipe}"।  
कृपया इस रेसिपी को **पूरी तरह हिंदी में** स्टेप-बाय-स्टेप विस्तार से बताइए।  
1. सबसे पहले आवश्यक सामग्री की सूची लिखें।  
2. फिर बनाने की विधि को क्रमबद्ध चरणों में समझाएँ।  
3. सरल, साफ और आसानी से समझ आने वाली भाषा का प्रयोग करें।  
4. आउटपुट सिर्फ हिंदी में होना चाहिए।  
`;

        const payload = buildPayload(recipePrompt);
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

        const response = await axios.post(url, payload, {
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': GEMINI_API_KEY,
            },
            timeout: 30000,
        });

        const recipeText = response?.data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!recipeText) {
            return res.status(502).json({
                error: "No recipe was returned from the AI model.",
                raw: response.data,
            });
        }

        // Send recipe text + TTS URL
        res.json({
            recipe: recipeText,

            tts: true
        });

    } catch (error) {
        console.error("🔥 Server error:", error.response?.data || error.message);

        res.status(500).json({
            error: "Internal server error",
            detail: error.response?.data || error.message || "An unknown error occurred.",
        });
    }
});

//Start the server
app.listen(PORT, () => {
    console.log(`✅ Recipe server is running on port: ${PORT}`);
});
