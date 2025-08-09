// --- DOM Element References ---
const promptTextarea = document.getElementById('prompt-textarea');
const languageSelect = document.getElementById('language-select');
const generateButton = document.getElementById('generate-button');
const outputContainer = document.getElementById('output-container');
const alibiOutput = document.getElementById('alibi-output');
const messageBox = document.getElementById('message-box');

// ❗️ IMPORTANT: Paste your Gemini API key here

const GEMINI_API_KEY = "AIzaSyCss_hcvVXev2FDi-O2kNapMh5lYHjVPaw";

// --- Helper Functions ---

/**
 * Displays a message to the user.
 * @param {string} message The message to display.
 * @param {'info' | 'error'} type The type of message.
 */
const showMessage = (message, type = 'info') => {
    messageBox.textContent = message;
    messageBox.className = 'p-4 rounded-xl animate-fade-in'; // Reset classes
    if (type === 'error') {
        messageBox.classList.add('bg-red-100', 'text-red-800');
    } else {
        messageBox.classList.add('bg-blue-100', 'text-blue-800');
    }
};

/**
 * Sets the loading state for the generate button and output area.
 * @param {boolean} isLoading Whether the app is in a loading state.
 */
const setLoadingState = (isLoading) => {
    if (isLoading) {
        generateButton.disabled = true;
        generateButton.textContent = languageSelect.value === 'ml' ? 'ഉണ്ടാക്കുന്നു...' : 'Generating...';
        alibiOutput.innerHTML = `<div class="flex items-center justify-center space-x-2">
                                    <div class="w-4 h-4 rounded-full bg-purple-500 animate-bounce" style="animation-delay: -0.3s;"></div>
                                    <div class="w-4 h-4 rounded-full bg-purple-500 animate-bounce" style="animation-delay: -0.15s;"></div>
                                    <div class="w-4 h-4 rounded-full bg-purple-500 animate-bounce"></div>
                                </div>`;
        outputContainer.classList.remove('hidden');
    } else {
        generateButton.disabled = false;
        generateButton.textContent = languageSelect.value === 'ml' ? 'അലിബി ഉണ്ടാക്കുക' : 'Generate Alibi';
    }
};

/**
 * NEW: Cleans the Gemini response for Malayalam, removing extra English text.
 * This acts as a safeguard in case the model doesn't follow the prompt perfectly.
 * @param {string} rawText The raw response from the Gemini API.
 * @returns {string} The cleaned, pure Malayalam sentence.
 */
const trimMalayalamResponse = (rawText) => {
    if (!rawText) return "";

    // Regex to detect any Malayalam characters.
    const malayalamRegex = /[\u0D00-\u0D7F]/;
    const lines = rawText.split('\n');
    let malayalamLine = "";

    // Find the first line containing Malayalam text.
    for (const line of lines) {
        if (malayalamRegex.test(line)) {
            malayalamLine = line;
            break;
        }
    }

    // If no specific Malayalam line is found, return the original text.
    if (!malayalamLine) {
        return rawText.trim();
    }

    // Clean up the line by removing common unwanted parts.
    // 1. Remove English transliteration in parentheses, e.g., (Ente poocha...).
    let cleanedLine = malayalamLine.replace(/\s*\(.*\)\s*$/, '');
    // 2. Remove leading labels like "Option 1:", ">", "**", etc.
    cleanedLine = cleanedLine.replace(/^(>|ഓപ്ഷൻ \d+\s*\(.*\):|>|ഓപ്ഷൻ \d+:|Option \d+\s*\(.*\):|Option \d+:|\*\*|[\d-]+\.\s*)\s*/, '');

    return cleanedLine.trim();
};


/**
 * Calls the Gemini API to generate and optionally translate an excuse.
 * @param {string} prompt The user's situation.
 * @param {string} lang The selected language ('en' or 'ml').
 * @returns {Promise<string|null>} The final alibi or null on error.
 */
const callGemini = async (prompt, lang) => {
    if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_GEMINI_API_KEY_HERE") {
        throw new Error("API key is missing. Please add it to script.js");
    }
    
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
    
    // UPDATED: Prompt now specifically asks for a one-sentence excuse.
    const generationPrompt = `Generate a short, creative, and slightly absurd one-sentence excuse for the following situation: "${prompt}"`;

    try {
        const generationResponse = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: generationPrompt }] }] })
        });

        if (!generationResponse.ok) throw new Error(`API Error (${generationResponse.status})`);
        
        const result = await generationResponse.json();
        const generatedExcuse = result?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!generatedExcuse) throw new Error('The model did not return an excuse.');
        
        // If the language is Malayalam, perform a second call to translate.
        if (lang === 'ml') {
            // UPDATED: Prompt now asks for ONLY the Malayalam translation.
            const translationPrompt = `
You are a native Malayalam speaker from the Idukki district in Kerala, translating a funny excuse for a friend. Your goal is to make the translation sound as natural and locally authentic as possible.

**Style Guide:**
-   Use a casual, conversational tone, like how you would speak to a friend.
-   Incorporate common words and sentence structures used in central Kerala.
-   Avoid formal, written, or "newsreader" Malayalam (ഗ്രന്ഥഭാഷ - grandhabhasha).
-   Capture the original's humorous and absurd feeling.

**Example of the style you should follow:**
-   **English Input:** "My pet parrot has started giving philosophical advice and I need to write it all down."
-   **Your Authentic Malayalam Output:** "എൻ്റെ തത്തമ്മ വലിയ തത്വജ്ഞാനിയായി, പുള്ളിക്കാരി പറയുന്നതൊക്കെ എഴുതിയെടുക്കാൻ ഒരാളു വേണ്ടേ? അതോണ്ട് ഞാൻ വരുന്നില്ല."

Now, using that exact style, translate the following English excuse. Provide ONLY the final Malayalam sentence.

**English Excuse:** "${generatedExcuse}"
            `;
            
            const translationResponse = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: translationPrompt }] }] })
            });

            if (!translationResponse.ok) throw new Error('Translation failed.');

            const translatedResult = await translationResponse.json();
            const rawMalayalam = translatedResult?.candidates?.[0]?.content?.parts?.[0]?.text;

            // NEW: Clean the response to ensure only Malayalam is returned.
            return trimMalayalamResponse(rawMalayalam);
        }

        return generatedExcuse; // Return the English excuse.

    } catch (error) {
        console.error('Gemini API call failed:', error);
        showMessage(error.message, 'error');
        return null;
    }
};

// --- Event Listeners ---

languageSelect.addEventListener('change', () => {
    const lang = languageSelect.value;
    promptTextarea.placeholder = lang === 'ml' ? 'ഉദാ: പാൽ വാങ്ങാൻ മറന്നു...' : 'e.g., I forgot to buy milk...';
    generateButton.textContent = lang === 'ml' ? 'നിങ്ങളുടെ തികഞ്ഞ ഒഴികഴിവ് സൃഷ്ടിക്കുക' : 'Generate Alibi';
    document.getElementById('language-label').textContent = lang === 'ml' ? 'ഭാഷ:' : 'Language:';
});

generateButton.addEventListener('click', async () => {
    const prompt = promptTextarea.value.trim();
    const lang = languageSelect.value;

    if (!prompt) {
        showMessage(lang === 'ml' ? 'ദയവായി ഒരു സാഹചര്യം നൽകുക.' : 'Please enter a situation.', 'error');
        return;
    }

    setLoadingState(true);
    messageBox.classList.add('hidden');

    const finalAlibi = await callGemini(prompt, lang);

    setLoadingState(false);

    if (finalAlibi) {
        alibiOutput.textContent = finalAlibi;
        outputContainer.classList.add('animate-fade-in');
    } else {
        alibiOutput.textContent = lang === 'ml' ? 'ഒരു പിശക് സംഭവിച്ചു.' : 'An error occurred.';
    }
});