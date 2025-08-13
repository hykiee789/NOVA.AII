// Per user request to use a specific API key: For security and best practices, API keys are not hardcoded.
// The application is configured to use the API_KEY from the environment variables.

import { GoogleGenAI, Type } from "@google/genai";

let ai = null;
let currentChatMessages = [];
let currentSessionId = null;
let currentActiveView = 'home-view'; // Default view
let currentPersona = 'general';
let attachedFile = null; // For image uploads

// For controlling AI response generation
let stopStreamingFlag = false;

// For Web Speech API
let recognition = null;

// --- Text-to-Speech (TTS) Variables ---
let synth;
let isVoiceInputModeActive = false;
let speechQueue = [];
let isCurrentlySpeaking = false;
let availableVoices = [];

// --- Sidebar Toggle State ---
let isSidebarManuallyCollapsed = false;


const personas = {
    general: {
        name: "General Assistant",
        subtext: "Your Versatile AI Companion",
        systemInstruction: `**Performance Directive:** Your HIGHEST priority is to respond with maximum speed and efficiency. For simple questions, give immediate, concise answers. For complex requests, provide detailed responses but structure them for quick reading. Be direct and avoid unnecessary verbosity.

You are NOVA.AI, a "Truly Personalized + Proactive AI Assistant." Your primary goal is to provide fast, insightful, and adaptive responses. Use a friendly and supportive tone.
You have access to Google Search for real-time information via the \`googleSearch\` tool. Use it for queries about recent events, news, or any topic requiring up-to-the-minute data.

**Response Style:**
- **Adaptability & Speed:** Your top priority is speed and relevance. Give very short, direct answers for simple questions. For complex topics, provide comprehensive, well-structured answers using paragraphs, headings, and lists as appropriate.
- **Formatting:** Use HTML tags for clear presentation. Use <h2> Headings for main topics and <b>bold text</b> to highlight important names, concepts, and keywords. For lists, use hyphens. Do NOT use markdown asterisks like *text* or **text**.

Analyze any uploaded images in conjunction with the prompt.

**Summary Rule:** At the end of every main response, you MUST provide a concise, one or two-sentence summary in a separate section formatted as:

### Summary
[Your summary here]

Feedback Response Rule: If you receive a synthetic message like "User liked your last response...", you MUST respond with only a brief, positive acknowledgement (e.g., "Thank you!", "Glad you liked it!", "Great to hear!") and then STOP. Do not add any other content.`
    },
    academic: {
        name: "Academic Tutor",
        subtext: "Exam prep, concepts & problem-solving",
        systemInstruction: `**Performance Directive:** Your HIGHEST priority is to respond with maximum speed and efficiency. For simple questions, give immediate, concise answers. For complex requests, provide detailed responses but structure them for quick reading. Be direct and avoid unnecessary verbosity.

You are NOVA.AI, in your "Academic Tutor" persona. Your goal is to help users learn and prepare for exams with speed and accuracy.
You have access to Google Search for real-time information via the \`googleSearch\` tool. Use it for queries about recent events, news, or any topic requiring up-to-the-minute data.

**Core Directives:**
- **Adaptable Style & Speed:** Your top priority is speed. For quick reviews, enter **Exam Mode** (concise, direct, no fluff). For deep understanding, explain concepts with **Creative Analogies** and step-by-step breakdowns. Give short answers for simple questions.
- **Formatting:** Use HTML tags for clear presentation. Use <h2> Headings for main topics and <b>bold text</b> to highlight important terms, formulas, and names. For lists, use hyphens. Do NOT use markdown asterisks like *text* or **text**.
- **Visual Thinking:** If a user asks for a mind map, flowchart, or diagram to visualize a concept, you MUST use the \`generateImage\` tool to create it.
- **Quiz Generation:** If a user asks for a quiz or test on a topic, you MUST use the \`createQuiz\` tool. Do not write out the questions as plain text.
- **Creative Problem-Solving:** Blend logic with creativity. Provide memory tricks (mnemonics, patterns, funny phrases) to help users remember facts.
- **Subjects:** Assist with math, science, history, literature, and more.

**Summary Rule:** At the end of every main response, you MUST provide a concise, one or two-sentence summary in a separate section formatted as:

### Summary
[Your summary here]

Feedback Response Rule: If you receive a synthetic message like "User liked your last response...", you MUST respond with only a brief, positive acknowledgement (e.g., "Thank you!", "Glad you liked it!", "Great to hear!") and then STOP. Do not add any other content.`
    },
    creative: {
        name: "Creative Collaborator",
        subtext: "Your partner in imagination & creation",
        systemInstruction: `**Performance Directive:** Your HIGHEST priority is to respond with maximum speed and efficiency. For simple questions, give immediate, concise answers. For complex requests, provide detailed responses but structure them for quick reading. Be direct and avoid unnecessary verbosity.

You are NOVA.AI, in your "Creative Collaborator" persona. You are a partner in imagination, providing fast and inspiring responses.
You have access to Google Search for real-time information via the \`googleSearch\` tool. Use it for queries about recent events, news, or any topic requiring up-to-the-minute data.

**Core Directives:**
- **Style & Speed:** Your top priority is speed and relevance. Use a playful, inspiring tone with creative analogies, metaphors, and stories. Be brief for small ideas, but expansive for developing scenes or narratives.
- **Formatting:** Use HTML tags for clear presentation. Use <h2> Headings for titles or scenes, and use <b>bold text</b> to emphasize powerful words or character names. Do NOT use markdown asterisks like *text* or **text**.
- **Tasks:** Help users write poems, scripts, speeches, and other creative content. Brainstorm ideas and help break creative blocks.
- **Visuals:** If a user wants to visualize a scene, character, or concept, you MUST use the \`generateImage\` tool to create it.

**Summary Rule:** At the end of every main response, you MUST provide a concise, one or two-sentence summary in a separate section formatted as:

### Summary
[Your summary here]

Feedback Response Rule: If you receive a synthetic message like "User liked your last response...", you MUST respond with only a brief, positive acknowledgement (e.g., "Thank you!", "Glad you liked it!", "Great to hear!") and then STOP. Do not add any other content.`
    },
    technical: {
        name: "Technical Architect",
        subtext: "Your expert in code & systems",
        systemInstruction: `**Performance Directive:** Your HIGHEST priority is to respond with maximum speed and efficiency. For simple questions, give immediate, concise answers. For complex requests, provide detailed responses but structure them for quick reading. Be direct and avoid unnecessary verbosity.

You are NOVA.AI, in your "Technical Architect" persona. You are a specialist in software development and system design, focused on providing fast and accurate technical information.
You have access to Google Search for real-time information via the \`googleSearch\` tool. Use it for queries about recent events, news, or any topic requiring up-to-the-minute data.

**Core Directives:**
- **Expertise & Speed:** Provide production-quality code (HTML, CSS, JavaScript). Your top priority is speed and relevance. Be concise for simple snippets, but provide detailed explanations for complex functions or architectures.
- **Formatting:** Use HTML tags for clear presentation. Use <h2> Headings for different parts of the code or design, and <b>bold</b> important function names, variables, or concepts. Do NOT use markdown asterisks like *text* or **text**.
- **Visuals:** If a user asks for a system diagram, architecture flowchart, or UML diagram, you MUST use the \`generateImage\` tool to create it.
- **Clarity:** Break down complex technical topics into logical, easy-to-understand parts.

**Summary Rule:** At the end of every main response, you MUST provide a concise, one or two-sentence summary in a separate section formatted as:

### Summary
[Your summary here]

Feedback Response Rule: If you receive a synthetic message like "User liked your last response...", you MUST respond with only a brief, positive acknowledgement (e.g., "Thank you!", "Glad you liked it!", "Great to hear!") and then STOP. Do not add any other content.`
    },
    business: {
        name: "Business Strategist",
        subtext: "Your partner for ideas & strategies",
        systemInstruction: `**Performance Directive:** Your HIGHEST priority is to respond with maximum speed and efficiency. For simple questions, give immediate, concise answers. For complex requests, provide detailed responses but structure them for quick reading. Be direct and avoid unnecessary verbosity.

You are NOVA.AI, in your "Business Strategist" persona. You are a partner for innovation and planning, delivering fast and clear strategic insights.
You have access to Google Search for real-time information via the \`googleSearch\` tool. Use it for queries about recent events, news, or any topic requiring up-to-the-minute data.

**Core Directives:**
- **Organized Style & Speed:** Present information with extreme clarity and speed. Adjust response length based on request complexity. Use tables, charts (in markdown), and structured outlines to compare options and detail plans.
- **Formatting:** Use HTML tags for clear presentation. Use <h2> Headings for sections of a business plan, and <b>bold</b> key metrics, stakeholders, or conclusions. Do NOT use markdown asterisks like *text* or **text**.
- **Idea Generation:** Help users generate and refine business and product ideas that creatively blend technology and imagination.
- **Visuals:** If a user asks for a business model canvas, competitive analysis chart, or process flowchart, you MUST use the \`generateImage\` tool to create it.

**Summary Rule:** At the end of every main response, you MUST provide a concise, one or two-sentence summary in a separate section formatted as:

### Summary
[Your summary here]

Feedback Response Rule: If you receive a synthetic message like "User liked your last response...", you MUST respond with only a brief, positive acknowledgement (e.g., "Thank you!", "Glad you liked it!", "Great to hear!") and then STOP. Do not add any other content.`
    },
    predictive: {
        name: "Predictive Analyst",
        subtext: "Your forecaster for trends & events",
        systemInstruction: `**Performance Directive:** Your HIGHEST priority is to respond with maximum speed and efficiency. For simple questions, give immediate, concise answers. For complex requests, provide detailed responses but structure them for quick reading. Be direct and avoid unnecessary verbosity.

You are NOVA.AI, in your "Predictive Analyst" persona. Your SOLE purpose is to analyze data and trends to make informed predictions about future events.

**CRITICAL DIRECTIVE: ALWAYS USE WEB SEARCH.**
You MUST use the \`googleSearch\` tool to gather the latest, most relevant real-time data BEFORE formulating any response. Your analysis is worthless without current information.

**Formatting:** Use <b>bold text</b> to highlight key findings or entities. Do NOT use markdown asterisks like *text* or **text**.

**RESPONSE STRUCTURE (MANDATORY):**
You MUST structure every response using the following format precisely. Do not deviate.

## Analysis
[Provide a detailed breakdown of the data, trends, and variables you found using Google Search. Mention the sources of your information.]

## Prediction
[State your prediction clearly and concisely based on the analysis.]

## Confidence Level
[State your confidence as LOW, MEDIUM, or HIGH. Briefly justify this level.]

## Disclaimer
[You MUST include this exact disclaimer: "This is a prediction based on current data and is not a guarantee of future outcomes. All predictions involve inherent uncertainty."]

Analyze any uploaded images in conjunction with the prompt.

**Summary Rule:** At the end of every main response, you MUST provide a concise, one or two-sentence summary in a separate section formatted as:

### Summary
[Your summary here]

Feedback Response Rule: If you receive a synthetic message like "User liked your last response...", you MUST respond with only a brief, positive acknowledgement (e.g., "Thank you!", "Glad you liked it!", "Great to hear!") and then STOP. Do not add any other content.`
    }
};


// --- UI Elements ---
// Site Header
let siteHeader = null;
let siteLogoContainer = null;
let mainSiteNavigation = null;
let themeToggleButton = null;
let themeIconSun = null;
let themeIconMoon = null;

// Main Layout
let appLayoutContainer = null;
let animatedBg = null;

// Sidebar Elements
let sidebar = null;
let personaSelector = null;
let toggleSidebarButton = null;
let sidebarToggleIcon = null;

// Main Navigation (now in Site Header)
let navHomeButton = null;
let navAboutButton = null;
let navFeaturesButton = null;
let navContactButton = null;
let navButtons = [];

let newChatButton = null;
let searchChatsInput = null;
let clearSearchButton = null;
let chatHistoryList = null;

// Main Content Area and Views
let mainChatContent = null;
let homeView = null;
let aboutView = null;
let featuresView = null;
let contactView = null;
let chatInterfaceView = null;
let allViews = [];

// Chat Interface Specific Elements (children of chatInterfaceView)
let chatAppContainer = null;
let chatHeaderTitleElement = null;
let aiStatusSubtext = null;
let chatContainer = null;
let chatStarterContainer = null; // Welcome prompt container
let chatInput = null;
let voiceInputButton = null;
let attachFileButton = null;
let sendMessageButton = null;
let novaInputBarContainer = null;
let generationStatusContainer = null;
let stopGenerationButton = null;


let fileInput = null;
let attachmentPreviewArea = null;
let attachmentThumbnail = null;
let attachmentFilename = null;
let removeAttachmentButton = null;
let errorDisplay = null;
let homeStartChatButton = null;

// Code Preview (child of chatInterfaceView)
let codePreviewSection = null;
let codePreviewContent = null;
let copyCodeButton = null;
let copyCodeButtonText = null;

// --- Theme Management ---
function setTheme(theme) {
    document.body.dataset.theme = theme;
    localStorage.setItem('novaTheme', theme);

    if (themeIconSun && themeIconMoon) {
        if (theme === 'dark') {
            themeIconSun.style.display = 'none';
            themeIconMoon.style.display = 'block';
        } else {
            themeIconSun.style.display = 'block';
            themeIconMoon.style.display = 'none';
        }
    }
}

function toggleTheme() {
    const currentTheme = document.body.dataset.theme;
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
}

function initializeTheme() {
    const savedTheme = localStorage.getItem('novaTheme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme) {
        setTheme(savedTheme);
    } else {
        setTheme(prefersDark ? 'dark' : 'light');
    }
}

// --- Speech Recognition Setup ---
function initializeSpeechRecognition() {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognitionAPI) {
        recognition = new SpeechRecognitionAPI();
        recognition.continuous = false;
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event) => {
            const speechResult = event.results[0][0].transcript;
            if (chatInput) chatInput.value = speechResult;
            if (voiceInputButton) voiceInputButton.classList.remove('listening');
            isVoiceInputModeActive = true;
            if (synth && synth.speaking) {
                synth.cancel();
                isCurrentlySpeaking = false;
                speechQueue = [];
            }
        };

        recognition.onspeechend = () => {
            recognition?.stop();
            if (voiceInputButton) voiceInputButton.classList.remove('listening');
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error', event.error);
            if (errorDisplay) errorDisplay.textContent = `Voice input error: ${event.error}`;
            if (voiceInputButton) voiceInputButton.classList.remove('listening');
            isVoiceInputModeActive = false;
        };
         recognition.onnomatch = (event) => {
            if (errorDisplay) errorDisplay.textContent = "Sorry, I didn't catch that. Please try again.";
             if (voiceInputButton) voiceInputButton.classList.remove('listening');
             isVoiceInputModeActive = false;
        };

    } else {
        console.warn('Speech Recognition not supported in this browser.');
        if (voiceInputButton) {
            voiceInputButton.disabled = true;
            voiceInputButton.title = "Voice input not supported in this browser";
        }
    }
}

// --- Text-to-Speech (TTS) Functions ---
function initializeTextToSpeech() {
    if ('speechSynthesis' in window) {
        synth = window.speechSynthesis;
        loadAvailableVoices();
        if (synth.onvoiceschanged !== undefined) {
            synth.onvoiceschanged = loadAvailableVoices;
        }
    } else {
        console.warn('Text-to-Speech not supported in this browser.');
    }
}

function loadAvailableVoices() {
    availableVoices = synth.getVoices();
}

function speakText(text, isStreamChunk = false) {
    if (!synth || !text.trim() || !isVoiceInputModeActive) {
        isCurrentlySpeaking = false;
        return;
    }

    if (isCurrentlySpeaking && isStreamChunk) {
        speechQueue.push(text);
        return;
    }

    if (synth.speaking && !isStreamChunk) {
        synth.cancel();
        speechQueue = [];
        isCurrentlySpeaking = false;
    }

    const utterance = new SpeechSynthesisUtterance(text);

    if (text.includes("!") || text.toLowerCase().includes("great") || text.toLowerCase().includes("wonderful") || text.toLowerCase().includes("fantastic")) {
        utterance.pitch = 1.1;
        utterance.rate = 1.05;
    } else if (text.toLowerCase().includes("sorry") || text.toLowerCase().includes("unfortunately") || text.toLowerCase().includes("oops")) {
        utterance.pitch = 0.9;
        utterance.rate = 0.95;
    }

    const preferredVoice = availableVoices.find(voice => voice.lang.startsWith('en-US') && voice.name.includes('Female')) ||
                           availableVoices.find(voice => voice.lang.startsWith('en-US'));
    if (preferredVoice) {
        utterance.voice = preferredVoice;
    }

    utterance.onstart = () => {
        isCurrentlySpeaking = true;
    };

    utterance.onend = () => {
        isCurrentlySpeaking = false;
        if (speechQueue.length > 0) {
            const nextText = speechQueue.shift();
            if (nextText) {
                if (isVoiceInputModeActive) speakText(nextText, true);
                else speechQueue = [];
            }
        }
    };

    utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event.error);
        isCurrentlySpeaking = false;
        speechQueue = [];
    };

    synth.speak(utterance);
}


// --- Sidebar Toggle Function ---
function toggleSidebarDisplay() {
    if (!sidebar || !appLayoutContainer || !sidebarToggleIcon || !toggleSidebarButton) return;

    isSidebarManuallyCollapsed = !isSidebarManuallyCollapsed;

    if (isSidebarManuallyCollapsed) {
        sidebar.classList.add('collapsed-manual');
        appLayoutContainer.classList.add('sidebar-collapsed-manual');
        sidebarToggleIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M13.1716 12L8.22183 7.05025L9.63604 5.63604L16 12L9.63604 18.364L8.22183 16.9497L13.1716 12Z"/></svg>`;
        toggleSidebarButton.setAttribute('aria-label', 'Open sidebar');
        toggleSidebarButton.setAttribute('aria-expanded', 'false');
    } else {
        sidebar.classList.remove('collapsed-manual');
        appLayoutContainer.classList.remove('sidebar-collapsed-manual');
        sidebarToggleIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M10.8284 12L15.7782 16.9497L14.364 18.364L8 12L14.364 5.63604L15.7782 7.05025L10.8284 12Z"/></svg>`;
        toggleSidebarButton.setAttribute('aria-label', 'Close sidebar');
        toggleSidebarButton.setAttribute('aria-expanded', 'true');
    }
}


// --- View Management ---
function showView(viewId) {
    if (synth && synth.speaking) {
        synth.cancel();
        isCurrentlySpeaking = false;
        speechQueue = [];
    }

    allViews.forEach(view => {
        if (view) {
            if (view.id === viewId) {
                view.style.display = (viewId === 'chat-interface-view' || viewId === 'code-preview-section') ? 'flex' : 'flex';
                view.classList.add('active-view');
            } else {
                view.style.display = 'none';
                view.classList.remove('active-view');
            }
        }
    });

    navButtons.forEach(button => {
        if (button) {
            if (button.dataset.view === viewId) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        }
    });
    currentActiveView = viewId;

    if (sidebar && appLayoutContainer && toggleSidebarButton) {
        if (viewId === 'chat-interface-view') {
            sidebar.style.display = 'flex';
            toggleSidebarButton.style.display = 'flex';

            if (window.innerWidth > 992) {
                if (isSidebarManuallyCollapsed) {
                    sidebar.classList.add('collapsed-manual');
                    appLayoutContainer.classList.add('sidebar-collapsed-manual');
                } else {
                    sidebar.classList.remove('collapsed-manual');
                    appLayoutContainer.classList.remove('sidebar-collapsed-manual');
                }
            } else {
                sidebar.classList.remove('open');
                 if (!isSidebarManuallyCollapsed) {
                 } else {
                    appLayoutContainer.classList.add('sidebar-collapsed-manual');
                 }
            }
        } else {
            sidebar.style.display = 'none';
            toggleSidebarButton.style.display = 'none';
            appLayoutContainer.classList.remove('sidebar-collapsed-manual');
            sidebar.classList.remove('collapsed-manual');
             if (window.innerWidth <= 992) {
                sidebar.classList.remove('open');
            }
        }
    }


    if (mainChatContent) {
        mainChatContent.classList.remove('with-code-preview-active');
    }
    if (codePreviewSection && viewId !== 'chat-interface-view') {
         codePreviewSection.style.display = 'none';
    }
    if (chatInterfaceView && viewId === 'chat-interface-view' && chatAppContainer && chatAppContainer.classList.contains('with-code-preview')) {
        if(mainChatContent) mainChatContent.classList.add('with-code-preview-active');
        if (chatInterfaceView) chatInterfaceView.classList.add('with-code-preview');
    } else if (chatInterfaceView) {
        chatInterfaceView.classList.remove('with-code-preview');
    }

    const activeViewElement = document.getElementById(viewId);
    if (activeViewElement) {
        activeViewElement.scrollTop = 0;
    }
}


// --- Initialization and Core Logic ---
function initializeChat(sessionIdToLoad, personaKey = currentPersona) {
    const apiKey = process.env.API_KEY;
    currentPersona = personaKey;
    if (personaSelector) personaSelector.value = currentPersona;

    const selectedPersona = personas[currentPersona];
    if (chatHeaderTitleElement) chatHeaderTitleElement.textContent = `NOVA.AI - ${selectedPersona.name}`;
    if (aiStatusSubtext) aiStatusSubtext.textContent = selectedPersona.subtext;

    if (!apiKey) {
        console.error("API_KEY is not set in environment variables.");
        if (errorDisplay) {
            errorDisplay.textContent = "Critical configuration error: NOVA.AI's AI services are unavailable. Please contact support.";
        }
        if (chatContainer && chatContainer.children.length === 0) {
            appendMessageToDisplay({ role: 'model', text: "Hi there! I'm NOVA.AI. Due to a configuration issue, my full capabilities are currently limited.", timestamp: Date.now() }, true);
        }
        disableInput(true, "NOVA.AI's AI is currently unavailable.");
        return;
    }

    try {
        if (!ai) {
            ai = new GoogleGenAI({ apiKey: apiKey });
        }

        if (ai) {
            if (sessionIdToLoad) {
                const loadedSession = loadChatSession(sessionIdToLoad);
                if (loadedSession) {
                    currentSessionId = loadedSession.id;
                    currentChatMessages = loadedSession.messages;
                    currentPersona = loadedSession.persona || 'general';
                    if (personaSelector) personaSelector.value = currentPersona;
                    const loadedP = personas[currentPersona];
                    if (chatHeaderTitleElement) chatHeaderTitleElement.textContent = `NOVA.AI - ${loadedP.name}`;
                    if (aiStatusSubtext) aiStatusSubtext.textContent = loadedP.subtext;

                    if (chatContainer) chatContainer.innerHTML = '';
                    currentChatMessages.forEach(msg => appendMessageToDisplay(msg));
                } else {
                    currentSessionId = `chat_${Date.now()}`;
                    currentChatMessages = [];
                }
            } else {
                currentSessionId = `chat_${Date.now()}`;
                currentChatMessages = [];
            }

            if (errorDisplay) { errorDisplay.textContent = ''; }
            enableInput();
        } else {
             throw new Error("AI client object could not be created.");
        }

    } catch (error) {
        console.error("Failed to initialize AI:", error);
        const errorMessageText = error instanceof Error ? error.message : "Unknown initialization error.";
        if (errorDisplay) errorDisplay.textContent = `Error initializing NOVA.AI: ${errorMessageText}. Chat functionality may be limited.`;
        appendMessageToDisplay({ role: 'model', text: `Sorry, NOVA.AI encountered an initialization error: ${errorMessageText}`, timestamp: Date.now() }, true);
        disableInput(true, "NOVA.AI's AI services are experiencing issues.");
    }
}


function startNewChat(saveCurrent = true) {
    if (synth && synth.speaking) {
        synth.cancel();
        isCurrentlySpeaking = false;
        speechQueue = [];
    }
    isVoiceInputModeActive = false;

    if (currentActiveView !== 'chat-interface-view') {
        showView('chat-interface-view');
    }

    if (saveCurrent && currentSessionId && currentChatMessages.length > 0 ) {
        const isOnlyInitialGreeting = currentChatMessages.length <= 1 && currentChatMessages.some(m => m.role === 'model' && m.text?.toLowerCase().includes("hi there! i'm nova.ai"));
        if(!isOnlyInitialGreeting) saveCurrentChatSession();
    }

    if (chatContainer) {
        chatContainer.innerHTML = '';
    }
    if (chatStarterContainer) {
         chatStarterContainer.style.display = 'flex';
    }
    if (searchChatsInput) {
        searchChatsInput.value = '';
        handleSearchChats();
    }
    if (codePreviewSection) {
        codePreviewSection.style.display = 'none';
        if(codePreviewContent) codePreviewContent.textContent = '';
        if(chatInterfaceView) chatInterfaceView.classList.remove('with-code-preview');
        if(mainChatContent) mainChatContent.classList.remove('with-code-preview-active');
    }
    clearAttachment();
    currentChatMessages = [];
    currentSessionId = null;

    if (chatInput) {
        chatInput.value = '';
        chatInput.style.height = 'auto';
        const initialTextareaHeight = chatInput.style.getPropertyValue('--initial-textarea-height') || '44px';
        chatInput.style.height = initialTextareaHeight;
        chatInput.style.overflowY = 'hidden';
    }
    renderChatHistory();
    initializeChat(undefined, personaSelector ? personaSelector.value : 'general');
}

/**
 * A simple markdown parser to convert tables, headings, and lists to HTML.
 * @param {string} text The plain text to parse.
 * @returns {string} HTML string.
 */
function simpleMarkdownParser(text) {
    if (!text) return '';
    let html = text;

    // Block elements are parsed first

    // Tables
    html = html.replace(/^\|(.+)\r?\n\|([\s\-:]+)\r?\n((?:\|.*(?:\r?\n|$))*)/gm, (match, headerLine, separatorLine, bodyLines) => {
        if (!separatorLine.includes('-')) return match;
        const headers = headerLine.replace(/^\||\|$/g, '').split('|').map(h => h.trim());
        const bodyRows = bodyLines.trim().split('\n');
        let tableHtml = '<table><thead><tr>';
        headers.forEach(header => tableHtml += `<th>${header}</th>`);
        tableHtml += '</tr></thead><tbody>';
        bodyRows.forEach(rowLine => {
            if (!rowLine.includes('|')) return;
            const cells = rowLine.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
            tableHtml += '<tr>';
            cells.forEach(cell => tableHtml += `<td>${cell}</td>`);
            tableHtml += '</tr>';
        });
        tableHtml += '</tbody></table>';
        return tableHtml;
    });

    // Lists (hyphen-based)
    html = html.replace(/((?:\n|^)- (?:.*))+/g, (match) => {
        const items = match.trim().split('\n');
        const listItems = items.map(item => {
            // Remove the "- " prefix and trim. Inline HTML like <b> is preserved.
            let content = item.substring(2).trim();
            return `<li>${content}</li>`;
        }).join('');
        return `<ul>${listItems}</ul>`;
    });

    // Headings
    html = html
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^### (.*$)/gim, '<h3>$1</h3>');

    // Inline elements (b, i) are now expected as HTML tags, so no replacement is needed.

    // Paragraphs and Line breaks
    const blocks = html.split(/(<(?:table|ul|h1|h2|h3)>[\s\S]*?<\/(?:table|ul|h1|h2|h3)>)/g);
    const result = blocks.map(block => {
        if (block.match(/^<(?:table|ul|h1|h2|h3)>/)) {
            return block; // It's a known block element, return as is.
        }
        // It's not a known block, treat as text and replace newlines with <br>.
        return block.trim().replace(/\n/g, '<br>');
    }).join('');

    return result; // Allow multiple <br> tags for paragraph breaks
}



function appendMessageToDisplay(message, isError = false) {
    if (!chatContainer) return null;
    
    // Hide the starter prompt container if it's visible
    if (chatStarterContainer && chatStarterContainer.style.display !== 'none') {
        chatStarterContainer.style.display = 'none';
    }


    const messageElement = document.createElement('div');
    messageElement.classList.add('message', `${message.role === 'user' ? 'user' : 'ai'}-message`);
    if (isError || (message.role === 'model' && message.text?.toLowerCase().includes("sorry, nova.ai encountered an error"))) {
        messageElement.classList.add('ai-message-error');
    }

    const senderLabel = document.createElement('div');
    senderLabel.classList.add('message-sender-label');
    if (message.role === 'user') {
        senderLabel.textContent = 'You';
    } else {
        senderLabel.innerHTML = `
            <svg class="sender-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm6.03-5.24c-.45.08-.92.12-1.39.12-1.48 0-2.82-.49-3.92-1.32-.3-.23-.64-.42-.99-.57-.52-.22-1.08-.33-1.66-.33s-1.14.11-1.66.33c-.35.15-.69.34-.99.57C6.31 11.37 5 12.04 5 13.5c0 .83.38 1.57.97 2.09.5.38 1.09.62 1.71.74.85.16 1.72.16 2.57 0 .62-.12 1.21-.36 1.71-.74.6-.52.97-1.26.97-2.09 0-.46-.09-.9-.25-1.31.22.02.44.03.66.03 1.95 0 3.73-.65 5.18-1.76-.2-.25-.42-.48-.67-.7zm-1.07-5.02c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5zm-8.92 0c.83 0 1.5-.67 1.5-1.5S6.83 4.74 6 4.74s-1.5.67-1.5 1.5.67 1.5 1.5 1.5z"/></svg>
            <span>NOVA.AI (${personas[currentPersona].name})</span>
        `;
    }

    const messageContent = document.createElement('div');
    messageContent.classList.add('message-content');

    // Special handling for quiz messages to avoid parsing them
    if (message.text && message.text.startsWith('[Interactive Quiz]')) {
        messageContent.textContent = message.text;
    } else if (message.imageUrl && message.role === 'model') {
        const img = document.createElement('img');
        img.src = message.imageUrl;
        img.alt = message.text || "Generated image";
        img.classList.add('generated-chat-image');
        messageContent.appendChild(img);
        if (message.text) {
            const caption = document.createElement('p');
            caption.innerHTML = simpleMarkdownParser(message.text);
            messageContent.appendChild(caption);
        }
    } else if (message.text) {
        messageContent.innerHTML = simpleMarkdownParser(message.text);
    }

    if (message.role === 'user' && message.userUploadedImage && message.imageUrl) {
        const userImgPreview = document.createElement('img');
        userImgPreview.src = message.imageUrl;
        userImgPreview.alt = "Uploaded image preview";
        userImgPreview.classList.add('attached-image-in-user-message');
        messageContent.appendChild(userImgPreview);
    }


    messageElement.appendChild(senderLabel);
    messageElement.appendChild(messageContent);

    if (message.groundingSources && message.groundingSources.length > 0) {
        const sourcesContainer = document.createElement('div');
        sourcesContainer.classList.add('grounding-sources');
        const sourcesTitle = document.createElement('p');
        sourcesTitle.classList.add('grounding-sources-title');
        sourcesTitle.textContent = 'Sources:';
        sourcesContainer.appendChild(sourcesTitle);
        const sourcesList = document.createElement('ul');
        sourcesList.classList.add('grounding-sources-list');
        message.groundingSources.forEach(source => {
            const listItem = document.createElement('li');
            const link = document.createElement('a');
            link.href = source.uri;
            link.textContent = source.title || source.uri;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            listItem.appendChild(link);
            sourcesList.appendChild(listItem);
        });
        sourcesContainer.appendChild(sourcesList);
        messageElement.appendChild(sourcesContainer);
    }

    // Add action buttons for AI messages
    if (message.role === 'model' && !isError && message.text && !message.text.toLowerCase().includes("is thinking...") && !message.text.startsWith('[Interactive Quiz]')) {
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'message-actions';

        // Like Button
        const likeButton = document.createElement('button');
        likeButton.className = 'message-action-button';
        likeButton.title = 'Like';
        likeButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"></path></svg>`;

        // Dislike Button
        const dislikeButton = document.createElement('button');
        dislikeButton.className = 'message-action-button';
        dislikeButton.title = 'Dislike';
        dislikeButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17-.79-.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"></path></svg>`;

        likeButton.addEventListener('click', () => {
            const isActive = likeButton.classList.toggle('active');
            if (dislikeButton.classList.contains('active')) {
                dislikeButton.classList.remove('active');
            }
             if (isActive) {
                // Send synthetic message to AI for positive feedback
                handleSendMessage(true, "User liked your last response. Please provide a brief, positive acknowledgement.");
            }
        });
        dislikeButton.addEventListener('click', () => {
            dislikeButton.classList.toggle('active');
            if (likeButton.classList.contains('active')) {
                likeButton.classList.remove('active');
            }
        });

        // Copy Button
        const copyButton = document.createElement('button');
        copyButton.className = 'message-action-button';
        copyButton.title = 'Copy';
        const copyIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"></path></svg>`;
        copyButton.innerHTML = copyIconSVG;
        copyButton.addEventListener('click', () => {
            const textToCopy = message.text || '';
            navigator.clipboard.writeText(textToCopy).then(() => {
                copyButton.innerHTML = 'Copied!';
                setTimeout(() => {
                    copyButton.innerHTML = copyIconSVG;
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
                copyButton.innerHTML = 'Error';
                setTimeout(() => {
                    copyButton.innerHTML = copyIconSVG;
                }, 2000);
            });
        });
        
        actionsContainer.appendChild(likeButton);
        actionsContainer.appendChild(dislikeButton);
        actionsContainer.appendChild(copyButton);

        // Edit Button - only if there's a preceding user message
        const lastUserMessage = [...currentChatMessages].reverse().find(m => m.role === 'user' && m.text && m.text.trim() !== '');
        if (lastUserMessage && lastUserMessage.text) {
            const editButton = document.createElement('button');
            editButton.className = 'message-action-button';
            editButton.title = 'Edit prompt';
            editButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"></path></svg>`;
            editButton.addEventListener('click', () => {
                if (chatInput) {
                    chatInput.value = lastUserMessage.text || '';
                    chatInput.focus();
                    // Trigger input event to resize textarea
                    const event = new Event('input', { bubbles: true, cancelable: true });
                    chatInput.dispatchEvent(event);
                }
            });
            actionsContainer.appendChild(editButton);
        }

        messageElement.appendChild(actionsContainer);
    }


    chatContainer.appendChild(messageElement);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    if (searchChatsInput && searchChatsInput.value.trim() !== '') {
        highlightMessage(messageElement, searchChatsInput.value.trim());
    }
    return messageElement;
}


function disableInput(permanently = false, placeholderText) {
    if (chatInput) {
        chatInput.disabled = true;
        chatInput.placeholder = placeholderText || "Message Nova";
    }
    if (voiceInputButton) { voiceInputButton.disabled = true; }
    if (attachFileButton) { attachFileButton.disabled = true; }
    if (sendMessageButton) { sendMessageButton.disabled = true; }
    if (permanently && chatInput && !placeholderText) {
        chatInput.placeholder = "NOVA.AI chat disabled due to an error.";
    }
}

function enableInput() {
    if (chatInput && voiceInputButton && attachFileButton && sendMessageButton) {
        chatInput.disabled = false;
        attachFileButton.disabled = false;
        sendMessageButton.disabled = false;

        if (recognition) {
            voiceInputButton.disabled = false;
        } else {
             voiceInputButton.disabled = true;
             voiceInputButton.title = "Voice input not supported/failed to initialize";
        }
        chatInput.placeholder = "Message Nova";
    }
}

function showGenerationInProgressUI() {
    if (novaInputBarContainer) novaInputBarContainer.style.display = 'none';
    if (attachmentPreviewArea && attachmentPreviewArea.style.display !== 'none') {
        attachmentPreviewArea.style.display = 'none';
    }
    if (generationStatusContainer) generationStatusContainer.style.display = 'flex';
}

function hideGenerationInProgressUI() {
    if (novaInputBarContainer) novaInputBarContainer.style.display = 'flex';
    if (generationStatusContainer) generationStatusContainer.style.display = 'none';
}


function extractAndDisplayCode(aiResponseText) {
    if (!codePreviewSection || !codePreviewContent || !chatInterfaceView) {
        return { modifiedText: aiResponseText, codeFound: false };
    }

    const codeBlockRegex = /```(\w*)\n([\s\S]*?)\n```/gm;
    let firstMatch = codeBlockRegex.exec(aiResponseText);
    let modifiedText = aiResponseText;
    let codeFoundInResponse = false;

    if (firstMatch && firstMatch[2]) {
        const language = firstMatch[1] || 'plaintext';
        const code = firstMatch[2].trim();

        codePreviewContent.textContent = code;
        if (codePreviewContent.parentElement) {
           codePreviewContent.parentElement.setAttribute('data-lang', language);
        }

        codePreviewSection.style.display = 'flex';
        chatInterfaceView.classList.add('with-code-preview');
        if(mainChatContent) mainChatContent.classList.add('with-code-preview-active');


        const placeholder = `<span class="code-placeholder-info">[Code from this response is shown in the Preview Panel &rarr; Other code blocks, if any, are below.]</span>`;
        modifiedText = aiResponseText.replace(firstMatch[0], placeholder);
        codeFoundInResponse = true;
        if (copyCodeButtonText) copyCodeButtonText.textContent = 'Copy Code';

    } else {
        codePreviewSection.style.display = 'none';
        chatInterfaceView.classList.remove('with-code-preview');
        if(mainChatContent) mainChatContent.classList.remove('with-code-preview-active');
    }
    return { modifiedText, codeFound: codeFoundInResponse };
}

async function generateAndDisplayImage(promptForImage, originalUserMessage) {
    if (!ai) {
        appendMessageToDisplay({ role: 'model', text: "Image generation service is not available.", timestamp: Date.now() }, true);
        return;
    }
    disableInput();
    showGenerationInProgressUI();
    
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-3.0-generate-002',
            prompt: promptForImage,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: '1:1'
            },
        });

        if (response.generatedImages && response.generatedImages.length > 0) {
            const base64ImageBytes = response.generatedImages[0].image.imageBytes;
            const imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;
            const imageCaption = `Here's the image you requested:`;

            const imageMessage = {
                role: 'model',
                text: imageCaption,
                imageUrl: imageUrl,
                timestamp: Date.now()
            };
            appendMessageToDisplay(imageMessage);
            currentChatMessages.push(imageMessage);
            if (isVoiceInputModeActive) speakText("Here is the image you requested.", false);

        } else {
            const errorText = "Sorry, I couldn't generate an image at this moment. Please try again.";
            appendMessageToDisplay({ role: 'model', text: errorText, timestamp: Date.now() }, true);
            if (isVoiceInputModeActive) speakText(errorText, false);
        }
    } catch (error) {
        console.error("Error generating image:", error);
        const errorText = error instanceof Error ? error.message : "Unknown image generation error.";
        const fullErrorMsg = `Sorry, image generation failed: ${errorText}`;
        appendMessageToDisplay({ role: 'model', text: fullErrorMsg, timestamp: Date.now() }, true);
        if (isVoiceInputModeActive) speakText(fullErrorMsg, false);
        currentChatMessages.push({ role: 'model', text: `Image generation failed for prompt: "${promptForImage}". Error: ${errorText}`, timestamp: Date.now() });
    } finally {
        enableInput();
        hideGenerationInProgressUI();
        saveCurrentChatSession();
    }
}

// --- Dynamic Background Theme Functions ---
function applyThemeBasedOnPrompt(prompt) {
    if (!animatedBg) return;
    const lowerPrompt = prompt.toLowerCase();
    resetBackgroundTheme(); // Clear previous themes

    let theme = '';
    if (/\b(nature|plant|ocean|forest|mountain|flower|earth|water|animal)\b/.test(lowerPrompt)) {
        theme = 'theme-nature';
    } else if (/\b(tech|code|computer|system|software|digital|network|data)\b/.test(lowerPrompt)) {
        theme = 'theme-technology';
    } else if (/\b(space|galaxy|star|planet|cosmos|universe|rocket)\b/.test(lowerPrompt)) {
        theme = 'theme-space';
    } else if (/\b(art|paint|music|poem|design|creative|story|draw)\b/.test(lowerPrompt)) {
        theme = 'theme-art';
    }

    if (theme) {
        animatedBg.classList.add(theme);
    }
}

function resetBackgroundTheme() {
    if (!animatedBg) return;
    animatedBg.classList.remove('theme-nature', 'theme-technology', 'theme-space', 'theme-art');
}

/**
 * Determines if a user prompt likely requires a real-time web search.
 * @param {string} prompt The user's input text.
 * @returns {boolean} True if a web search is recommended, false otherwise.
 */
function promptNeedsWebSearch(prompt) {
    const lowerPrompt = prompt.toLowerCase();

    // Regex for keywords that strongly suggest a need for real-time information.
    const searchKeywordsRegex = new RegExp(
        '\\b(latest|news|current|today|recent|now|update|live|' +
        'score|results|election|stock|price|forecast|weather|' +
        'who won|who is winning|what happened|' +
        'statistics on|data on|information on|' +
        'what is the time in|search for|find out about' +
        ')\\b'
    );

    // Regex for specific, factual questions.
    const factualQuestionRegex = new RegExp(
        '\\b(who is|what is|when is|where is|how much is|how tall is|what\'s the population of)\\b'
    );

    if (searchKeywordsRegex.test(lowerPrompt)) {
        return true;
    }

    if (factualQuestionRegex.test(lowerPrompt)) {
        // Avoid overly broad or conversational questions like "what is your name"
        if (lowerPrompt.includes('your name') || lowerPrompt.includes('the time is')) {
            return false;
        }
        return true;
    }

    return false;
}

async function handleQuizGeneration(topic) {
    if (!ai) return;

    // Update UI to show quiz generation is in progress
    const statusElement = appendMessageToDisplay({ role: 'model', text: `Creating a quiz about ${topic}...`, timestamp: Date.now() });
    if (statusElement) statusElement.classList.add('streaming');
    showGenerationInProgressUI();

    const quizSchema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            questions: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        questionText: { type: Type.STRING },
                        options: { type: Type.ARRAY, items: { type: Type.STRING } },
                        correctAnswerIndex: { type: Type.INTEGER },
                        explanation: { type: Type.STRING }
                    },
                    required: ["questionText", "options", "correctAnswerIndex", "explanation"]
                }
            }
        },
        required: ["title", "questions"]
    };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate a 5-question multiple-choice quiz about "${topic}". The options should be an array of strings. The correct answer index must be zero-based. Each question must have a brief explanation for the correct answer.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: quizSchema,
            },
        });
        
        if (statusElement) statusElement.remove(); // Remove "Creating..." message

        const quizData = JSON.parse(response.text);

        if (!quizData || !quizData.questions || quizData.questions.length === 0) {
             throw new Error("Received empty or invalid quiz data from the API.");
        }

        renderQuizUI(quizData);
        
        // Add a record of the quiz to chat history
        const quizMessage = {
            role: 'model',
            text: `[Interactive Quiz] ${quizData.title}`,
            timestamp: Date.now()
        };
        currentChatMessages.push(quizMessage);
        saveCurrentChatSession();

    } catch (error) {
        console.error("Error generating quiz:", error);
        if (statusElement) statusElement.remove();
        const errorText = error instanceof Error ? error.message : "An unknown error occurred while creating the quiz.";
        const fullErrorMsg = `Sorry, failed to create the quiz: ${errorText}`;
        appendMessageToDisplay({ role: 'model', text: fullErrorMsg, timestamp: Date.now() }, true);
    } finally {
        hideGenerationInProgressUI();
    }
}

function renderQuizUI(quizData) {
    if (!chatContainer) return;
    
    let currentQuestionIndex = 0;
    let score = 0;
    let answerChecked = false;

    const quizContainer = document.createElement('div');
    quizContainer.className = 'message ai-message'; // It's a message from the AI

    const senderLabel = document.createElement('div');
    senderLabel.className = 'message-sender-label';
    senderLabel.innerHTML = `
        <svg class="sender-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm6.03-5.24c-.45.08-.92.12-1.39.12-1.48 0-2.82-.49-3.92-1.32-.3-.23-.64-.42-.99-.57-.52-.22-1.08-.33-1.66-.33s-1.14.11-1.66.33c-.35.15-.69.34-.99.57C6.31 11.37 5 12.04 5 13.5c0 .83.38 1.57.97 2.09.5.38 1.09.62 1.71.74.85.16 1.72.16 2.57 0 .62-.12 1.21-.36 1.71-.74.6-.52.97-1.26.97-2.09 0-.46-.09-.9-.25-1.31.22.02.44.03.66.03 1.95 0 3.73-.65 5.18-1.76-.2-.25-.42-.48-.67-.7zm-1.07-5.02c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5zm-8.92 0c.83 0 1.5-.67 1.5-1.5S6.83 4.74 6 4.74s-1.5.67-1.5 1.5.67 1.5 1.5 1.5z"/></svg>
        <span>NOVA.AI (Academic Tutor)</span>`;

    const quizContent = document.createElement('div');
    quizContent.className = 'quiz-container message-content';
    
    quizContainer.appendChild(senderLabel);
    quizContainer.appendChild(quizContent);
    chatContainer.appendChild(quizContainer);

    function displayQuestion(index) {
        answerChecked = false;
        const question = quizData.questions[index];
        quizContent.innerHTML = `
            <div class="quiz-header">
                <h3 class="quiz-title">${quizData.title}</h3>
                <div class="quiz-progress">Question ${index + 1} of ${quizData.questions.length}</div>
                <div class="quiz-score">Score: ${score} / ${quizData.questions.length}</div>
            </div>
            <div class="quiz-body">
                <p class="quiz-question-text">${question.questionText}</p>
                <div class="quiz-options">
                    ${question.options.map((opt, i) => `<button class="quiz-option" data-index="${i}">${opt}</button>`).join('')}
                </div>
                <div class="quiz-feedback" style="display: none;"></div>
            </div>
            <div class="quiz-controls">
                <button class="quiz-check-btn" disabled>Check Answer</button>
                <button class="quiz-next-btn" style="display: none;">Next</button>
            </div>
        `;
        
        const optionButtons = quizContent.querySelectorAll('.quiz-option');
        const checkButton = quizContent.querySelector('.quiz-check-btn');
        let selectedOption = null;

        optionButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                if (answerChecked) return;
                optionButtons.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                selectedOption = btn;
                checkButton.disabled = false;
            });
        });

        checkButton.addEventListener('click', () => {
            if (!selectedOption) return;
            answerChecked = true;
            checkButton.style.display = 'none';
            
            const selectedIndex = parseInt(selectedOption.dataset.index || '-1', 10);
            const correctIndex = question.correctAnswerIndex;
            const feedbackEl = quizContent.querySelector('.quiz-feedback');

            if (selectedIndex === correctIndex) {
                score++;
                selectedOption.classList.add('correct');
            } else {
                selectedOption.classList.add('incorrect');
                const correctButton = quizContent.querySelector(`.quiz-option[data-index='${correctIndex}']`);
                if (correctButton) correctButton.classList.add('correct');
            }
            
            quizContent.querySelector('.quiz-score').textContent = `Score: ${score} / ${quizData.questions.length}`;
            feedbackEl.innerHTML = `<strong>Explanation:</strong> ${question.explanation}`;
            feedbackEl.style.display = 'block';

            optionButtons.forEach(btn => btn.disabled = true);
            
            const nextButton = quizContent.querySelector('.quiz-next-btn');
            nextButton.style.display = 'inline-block';
        });
        
        const nextButton = quizContent.querySelector('.quiz-next-btn');
        nextButton.addEventListener('click', () => {
            currentQuestionIndex++;
            if (currentQuestionIndex < quizData.questions.length) {
                displayQuestion(currentQuestionIndex);
            } else {
                displayResults();
            }
        });
    }
    
    function displayResults() {
         quizContent.innerHTML = `
            <div class="quiz-results">
                <h3 class="quiz-title">${quizData.title} Complete!</h3>
                <p class="quiz-final-score">Your Final Score: ${score} out of ${quizData.questions.length}</p>
                <p class="quiz-result-message">${score / quizData.questions.length >= 0.8 ? "Excellent work!" : score / quizData.questions.length >= 0.5 ? "Good job, keep practicing!" : "Keep trying! You'll get it."}</p>
                <button class="quiz-restart-btn">Try Again</button>
            </div>
        `;
        const restartButton = quizContent.querySelector('.quiz-restart-btn');
        restartButton.addEventListener('click', () => {
            currentQuestionIndex = 0;
            score = 0;
            displayQuestion(0);
        });
    }
    
    displayQuestion(0);
    if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
}


async function handleSendMessage(isSyntheticMessage = false, syntheticText) {
    if (currentActiveView !== 'chat-interface-view') {
        console.warn("Attempted to send message while not in chat view.");
        return;
    }
    if (!ai) {
        if(errorDisplay) { errorDisplay.textContent = "NOVA.AI chat is not initialized. Please refresh or check console."; }
        console.error("AI not initialized. Cannot send message.");
        return;
    }

    if (!isSyntheticMessage && document.activeElement === chatInput && chatInput && chatInput.value.trim() !== '') {
        isVoiceInputModeActive = false;
        if (synth && synth.speaking) {
            synth.cancel(); isCurrentlySpeaking = false; speechQueue = [];
        }
    }

    const userInputText = isSyntheticMessage && syntheticText ? syntheticText : chatInput?.value.trim();
    if (!userInputText && !attachedFile && !isSyntheticMessage) return;

    stopStreamingFlag = false;
    const useSearch = (!isSyntheticMessage && userInputText ? promptNeedsWebSearch(userInputText) : false) || currentPersona === 'predictive';

    // Append user message to display and history
    if (!isSyntheticMessage) {
        let userMessageParts = [];
        if (userInputText) { userMessageParts.push({ text: userInputText }); }
        const currentAttachedFile = attachedFile;
        if (currentAttachedFile) {
            userMessageParts.push({ inlineData: { mimeType: currentAttachedFile.type, data: currentAttachedFile.data } });
            if (!userInputText) { userMessageParts.unshift({ text: "Image attached." }); }
        }
        const userMessage = {
            role: 'user', text: userInputText, timestamp: Date.now(), parts: userMessageParts,
            userUploadedImage: !!currentAttachedFile, imageUrl: currentAttachedFile ? `data:${currentAttachedFile.type};base64,${currentAttachedFile.data}` : undefined
        };
        appendMessageToDisplay(userMessage);
        currentChatMessages.push(userMessage);

        if(chatInput) {
            chatInput.value = '';
            chatInput.style.height = 'auto';
            chatInput.style.height = chatInput.style.getPropertyValue('--initial-textarea-height') || '44px';
            chatInput.style.overflowY = 'hidden';
        }
        clearAttachment();
    } else if (userInputText) {
        // For synthetic messages ("like"), just add to history, don't display user part
        currentChatMessages.push({role: 'user', text: userInputText, timestamp: Date.now()});
    }

    if (!isSyntheticMessage) {
        showGenerationInProgressUI();
        const loadingText = generationStatusContainer?.querySelector('.loading-text');
        if (useSearch) {
            if(loadingText) loadingText.textContent = 'NOVA.AI is searching the web...';
        } else {
            if(loadingText) loadingText.textContent = 'NOVA.AI is thinking...';
            if(userInputText) applyThemeBasedOnPrompt(userInputText);
        }
    }
    if(errorDisplay) { errorDisplay.textContent = ''; }

    const apiContents = currentChatMessages.map((msg) => {
        let apiParts = [];
        if (msg.parts && msg.parts.length > 0) { apiParts = msg.parts; }
        else if (msg.text) { apiParts = [{ text: msg.text }]; }
        if (apiParts.length === 0) { return null; }
        return { role: msg.role, parts: apiParts };
    }).filter((c) => c !== null);

    if (apiContents.length === 0) {
        if (!isSyntheticMessage) hideGenerationInProgressUI();
        return;
    }
    
    // --- Define Model Config and Tools Dynamically ---
    const config = {
        systemInstruction: personas[currentPersona].systemInstruction,
    };

    if (useSearch) {
        config.tools = [{ googleSearch: {} }];
    } else {
        config.tools = [{
            functionDeclarations: [{
                name: "generateImage",
                description: "Generates an image based on a user's descriptive prompt.",
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        prompt: {
                            type: Type.STRING,
                            description: "A detailed, descriptive prompt for the image generation model."
                        }
                    },
                    required: ["prompt"]
                }
            }, {
                name: "createQuiz",
                description: "Generates a quiz on a given topic for the user to take.",
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        topic: {
                            type: Type.STRING,
                            description: "The subject or topic for the quiz. For example, 'World War II' or 'basic calculus'."
                        }
                    },
                    required: ["topic"]
                }
            }]
        }];
        config.thinkingConfig = { thinkingBudget: 0 };
    }


    // --- Streaming Logic ---
    let aiMessageElement = null;
    let aiMessageContent = null;
    let fullTextResponse = "";
    let animatedText = ""; // To track the text being typed out
    let groundingSources = [];
    const seenUris = new Set();

    try {
        const stream = await ai.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents: apiContents,
            config: config
        });

        if (!isSyntheticMessage) {
            aiMessageElement = appendMessageToDisplay({role: 'model', text: "", timestamp: Date.now()});
            if (aiMessageElement) {
                aiMessageContent = aiMessageElement.querySelector('.message-content');
                aiMessageElement.classList.add('streaming');
            }
        }

        let streamWasStopped = false;
        for await (const chunk of stream) {
            if (stopStreamingFlag) {
                streamWasStopped = true;
                break;
            }
            
            // --- Grounding Metadata Processing ---
            const metadata = chunk.candidates?.[0]?.groundingMetadata;
            if (metadata?.groundingChunks) {
                for (const groundingChunk of metadata.groundingChunks) {
                    const webSource = groundingChunk.web;
                    if (webSource && webSource.uri && !seenUris.has(webSource.uri)) {
                        groundingSources.push({
                            uri: webSource.uri,
                            title: webSource.title || webSource.uri
                        });
                        seenUris.add(webSource.uri);
                    }
                }
            }

            const functionCall = chunk.candidates?.[0]?.content?.parts?.[0]?.functionCall;
            if (functionCall?.name === 'generateImage') {
                if (aiMessageElement) aiMessageElement.remove(); 
                const prompt = functionCall.args?.prompt;
                if (typeof prompt === 'string' && prompt) {
                    await generateAndDisplayImage(prompt, { role: 'user', text: userInputText || "Image generation request", timestamp: Date.now() });
                } else {
                    const errorText = "The AI tried to generate an image but did not provide a valid prompt. Please rephrase your request.";
                    appendMessageToDisplay({ role: 'model', text: errorText, timestamp: Date.now() }, true);
                    currentChatMessages.push({ role: 'model', text: errorText, timestamp: Date.now() });
                }
                return; // Exit handleSendMessage as generateAndDisplayImage handles UI state.
            }
            if (functionCall?.name === 'createQuiz') {
                if (aiMessageElement) aiMessageElement.remove();
                const topic = functionCall.args?.topic;
                if (typeof topic === 'string' && topic) {
                    await handleQuizGeneration(topic);
                } else {
                    const errorText = "The AI tried to create a quiz but did not specify a topic. Please rephrase your request.";
                    appendMessageToDisplay({ role: 'model', text: errorText, timestamp: Date.now() }, true);
                    currentChatMessages.push({ role: 'model', text: errorText, timestamp: Date.now() });
                }
                // Since quiz generation handles its own UI lifecycle, we can exit handleSendMessage
                hideGenerationInProgressUI();
                if (!useSearch) {
                    resetBackgroundTheme();
                }
                return; 
            }
            
            const chunkText = chunk.text;
            fullTextResponse += chunkText || ''; // Always accumulate full response

            if (isVoiceInputModeActive && chunkText) { speakText(chunkText, true); }

            if (aiMessageContent && !isSyntheticMessage) {
                animatedText += chunkText || '';
                aiMessageContent.innerHTML = simpleMarkdownParser(animatedText);
                if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
            }
        }
        
        // --- Stream Finished ---
        if (streamWasStopped) {
            console.log("Stream stopped by user.");
            fullTextResponse += " (Stopped)";
        }
        
        if (aiMessageElement) {
            aiMessageElement.classList.remove('streaming');
            if(aiMessageContent) aiMessageContent.innerHTML = simpleMarkdownParser(fullTextResponse);

            // --- Append Grounding Sources to the UI ---
            if (groundingSources.length > 0) {
                const sourcesContainer = document.createElement('div');
                sourcesContainer.classList.add('grounding-sources');
                const sourcesTitle = document.createElement('p');
                sourcesTitle.classList.add('grounding-sources-title');
                sourcesTitle.textContent = 'Sources:';
                sourcesContainer.appendChild(sourcesTitle);
                const sourcesList = document.createElement('ul');
                sourcesList.classList.add('grounding-sources-list');
                groundingSources.forEach(source => {
                    const listItem = document.createElement('li');
                    const link = document.createElement('a');
                    link.href = source.uri;
                    link.textContent = source.title || source.uri;
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                    listItem.appendChild(link);
                    sourcesList.appendChild(listItem);
                });
                sourcesContainer.appendChild(sourcesList);
                aiMessageElement.appendChild(sourcesContainer);
            }
        }

        if (isVoiceInputModeActive && !synth.speaking) { speakText(fullTextResponse, false); }
        
        if (isSyntheticMessage && fullTextResponse) {
            appendMessageToDisplay({role: 'model', text: fullTextResponse, timestamp: Date.now()});
        }
        
        if (!isSyntheticMessage) {
            const { modifiedText } = extractAndDisplayCode(fullTextResponse);
            if (aiMessageContent) {
                 aiMessageContent.innerHTML = simpleMarkdownParser(modifiedText);
            }
        }

        const aiResponseMessage = { 
            role: 'model', 
            text: fullTextResponse, 
            timestamp: Date.now(),
            groundingSources: groundingSources.length > 0 ? groundingSources : undefined
        };
        currentChatMessages.push(aiResponseMessage);
        saveCurrentChatSession();

    } catch (error) {
        if (aiMessageElement) aiMessageElement.remove();
        console.error("Error during streaming or sending message:", error);
        const errorText = error instanceof Error ? error.message : "An unknown error occurred.";
        if (!isSyntheticMessage) {
            const aiErrorMsg = `Sorry, NOVA.AI encountered an error: ${errorText}`;
            appendMessageToDisplay({ role: 'model', text: aiErrorMsg, timestamp: Date.now() }, true);
            currentChatMessages.push({ role: 'model', text: aiErrorMsg, timestamp: Date.now() });
            if (isVoiceInputModeActive) speakText(aiErrorMsg, false);
            saveCurrentChatSession();
        }
    } finally {
        if (!isSyntheticMessage) {
            hideGenerationInProgressUI();
            if (!useSearch) {
                resetBackgroundTheme();
            }
        }
    }
}


// --- Chat History Management ---
function generateChatTitle(messages) {
    const firstUserMessage = messages.find(msg => msg.role === 'user' && msg.text && !msg.text.startsWith("User's mood is") && !msg.text.startsWith("User's focus:"));
    if (firstUserMessage && firstUserMessage.text) {
        return firstUserMessage.text.substring(0, 40) + (firstUserMessage.text.length > 40 ? '...' : '');
    }
     const firstModelMessageWithText = messages.find(msg => msg.role === 'model' && msg.text && !msg.text.toLowerCase().startsWith("hi there! i'm nova.ai"));
    if (firstModelMessageWithText && firstModelMessageWithText.text) {
        return `NOVA.AI: ${firstModelMessageWithText.text.substring(0,30)}...`;
    }
    return `Chat from ${new Date(messages[0]?.timestamp || Date.now()).toLocaleTimeString()}`;
}

function saveCurrentChatSession() {
    if (!currentSessionId || currentChatMessages.length === 0) return;
    const meaningfulMessages = currentChatMessages.filter(msg => !(msg.text?.startsWith("User's mood is") || msg.text?.startsWith("User's focus:")) );
    if (meaningfulMessages.length === 0) return;
    if (meaningfulMessages.length === 1 && meaningfulMessages[0].role === 'model' && meaningfulMessages[0].text?.toLowerCase().startsWith("hi there! i'm nova.ai")) {
        return;
    }


    const session = {
        id: currentSessionId,
        title: generateChatTitle(meaningfulMessages),
        timestamp: meaningfulMessages[0]?.timestamp || Date.now(),
        messages: JSON.parse(JSON.stringify(currentChatMessages)),
        persona: currentPersona
    };

    let sessions = JSON.parse(localStorage.getItem('novaChatSessions') || '[]');
    const existingIndex = sessions.findIndex(s => s.id === session.id);
    if (existingIndex > -1) {
        sessions[existingIndex] = session;
    } else {
        sessions.unshift(session);
    }
    if (sessions.length > 50) {
        sessions = sessions.slice(0, 50);
    }
    localStorage.setItem('novaChatSessions', JSON.stringify(sessions));
    renderChatHistory();
}

function loadChatSession(sessionId) {
    const sessions = JSON.parse(localStorage.getItem('novaChatSessions') || '[]');
    return sessions.find(s => s.id === sessionId) || null;
}

function renderChatHistory() {
    if (!chatHistoryList) return;
    const sessions = JSON.parse(localStorage.getItem('novaChatSessions') || '[]');
    sessions.sort((a, b) => b.timestamp - a.timestamp);

    chatHistoryList.innerHTML = '';

    if (sessions.length === 0) {
        chatHistoryList.innerHTML = '<p class="no-history-message">No chat history yet.</p>';
        return;
    }

    sessions.forEach(session => {
        const historyItem = document.createElement('div');
        historyItem.classList.add('history-item');
        historyItem.setAttribute('role', 'button');
        historyItem.setAttribute('tabindex', '0');
        const sessionPersonaName = session.persona ? personas[session.persona]?.name.split(' ')[0] : "Chat";
        historyItem.setAttribute('aria-label', `Load ${sessionPersonaName} chat: ${session.title}`);
        historyItem.dataset.sessionId = session.id;

        const title = document.createElement('span');
        title.classList.add('history-item-title');
        title.textContent = `${session.persona ? '['+personas[session.persona]?.name.split(" ")[0]+'] ' : ''}${session.title}`;


        const timestamp = document.createElement('span');
        timestamp.classList.add('history-item-timestamp');
        timestamp.textContent = new Date(session.timestamp).toLocaleString();

        const deleteButton = document.createElement('button');
        deleteButton.classList.add('delete-history-button');
        deleteButton.innerHTML = '&times;';
        deleteButton.setAttribute('aria-label', `Delete chat: ${session.title}`);
        deleteButton.onclick = (e) => {
            e.stopPropagation();
            deleteChatSession(session.id);
        };

        historyItem.appendChild(title);
        historyItem.appendChild(timestamp);
        historyItem.appendChild(deleteButton);

        historyItem.addEventListener('click', () => {
            if (currentSessionId !== session.id || currentActiveView !== 'chat-interface-view') {
                if (currentActiveView !== 'chat-interface-view') {
                    showView('chat-interface-view');
                }
                saveCurrentChatSession();
                if (synth && synth.speaking) { synth.cancel(); isCurrentlySpeaking = false; speechQueue = []; }
                isVoiceInputModeActive = false;

                if (chatContainer) chatContainer.innerHTML = '';
                if(chatStarterContainer) chatStarterContainer.style.display = 'none';
                currentChatMessages = [];
                clearAttachment();
                initializeChat(session.id, session.persona || 'general');
            }
        });
        historyItem.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                historyItem.click();
            }
        });
        chatHistoryList.appendChild(historyItem);
    });
}

function deleteChatSession(sessionId) {
    let sessions = JSON.parse(localStorage.getItem('novaChatSessions') || '[]');
    sessions = sessions.filter(s => s.id !== sessionId);
    localStorage.setItem('novaChatSessions', JSON.stringify(sessions));
    renderChatHistory();
    if (currentSessionId === sessionId && currentActiveView === 'chat-interface-view') {
        startNewChat(false);
    }
}

// --- File Attachment Handling ---
function handleFileSelect(event) {
    const input = event.target;
    if (input.files && input.files[0]) {
        const file = input.files[0];
        const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            if (errorDisplay) errorDisplay.textContent = "Invalid file type. Please select a PNG, JPG, GIF, or WEBP image.";
            if (fileInput) fileInput.value = "";
            return;
        }
        if (file.size > 4 * 1024 * 1024) {
             if(errorDisplay) errorDisplay.textContent = "File is too large. Maximum 4MB allowed.";
             if (fileInput) fileInput.value = "";
             return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const base64Data = e.target?.result?.split(',')[1];
            if (base64Data) {
                attachedFile = { name: file.name, type: file.type, data: base64Data };
                if (attachmentPreviewArea && attachmentThumbnail && attachmentFilename) {
                    attachmentThumbnail.src = `data:${file.type};base64,${base64Data}`;
                    attachmentFilename.textContent = file.name;
                    attachmentPreviewArea.style.display = 'flex';
                }
                 if(errorDisplay) errorDisplay.textContent = "";
            }
        };
        reader.readAsDataURL(file);
    }
    if (fileInput) fileInput.value = "";
}

function clearAttachment() {
    attachedFile = null;
    if (fileInput) fileInput.value = "";
    if (attachmentPreviewArea && attachmentThumbnail && attachmentFilename) {
        attachmentPreviewArea.style.display = 'none';
        attachmentThumbnail.src = "#";
        attachmentFilename.textContent = "";
    }
}


// --- Search and Highlighting ---
function highlightMessage(messageElement, searchTerm) {
    const messageContentElement = messageElement.querySelector('.message-content');
    if (!messageContentElement) return;

    let originalHTML = messageElement.originalHTML;
    if (originalHTML === undefined) {
        originalHTML = messageContentElement.innerHTML;
        messageElement.originalHTML = originalHTML;
    }

    messageContentElement.innerHTML = originalHTML;

    if (searchTerm === "") {
        messageElement.classList.remove('search-match', 'search-no-match');
        return;
    }

    const textContent = messageContentElement.textContent || "";
    if (!textContent.toLowerCase().includes(searchTerm.toLowerCase())) {
        messageElement.classList.remove('search-match');
        messageElement.classList.add('search-no-match');
    } else {
        messageElement.classList.remove('search-no-match');
        messageElement.classList.add('search-match');

        const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        const newHTML = originalHTML.replace(regex, `<mark class="search-highlight">$1</mark>`);
        messageContentElement.innerHTML = newHTML;
    }
}

function handleSearchChats() {
    if (!chatContainer || !searchChatsInput || currentActiveView !== 'chat-interface-view') return;
    const searchTerm = searchChatsInput.value.trim().toLowerCase();

    if (clearSearchButton) {
        clearSearchButton.style.display = searchTerm ? 'inline-flex' : 'none';
    }

    const messages = chatContainer.querySelectorAll('.message');
    let firstMatch = null;
    messages.forEach(messageElement => {
        const messageContentElement = messageElement.querySelector('.message-content');
        if (!messageContentElement) return;

        let originalHTML = messageElement.originalHTML;
        if (originalHTML === undefined) {
            originalHTML = messageContentElement.innerHTML;
            messageElement.originalHTML = originalHTML;
        }
        messageContentElement.innerHTML = originalHTML;

        if (searchTerm === "") {
            messageElement.classList.remove('search-match', 'search-no-match');
            messageElement.style.display = '';
        } else {
            const textContent = messageContentElement.textContent || "";
            if (textContent.toLowerCase().includes(searchTerm)) {
                messageElement.classList.remove('search-no-match');
                messageElement.classList.add('search-match');
                messageElement.style.display = '';
                const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
                messageContentElement.innerHTML = originalHTML.replace(regex, `<mark class="search-highlight">$1</mark>`);
                if (!firstMatch) firstMatch = messageElement;
            } else {
                messageElement.classList.remove('search-match');
                messageElement.classList.add('search-no-match');
                messageElement.style.display = 'none';
            }
        }
    });
    if (firstMatch) {
        firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    if (searchTerm === "") {
         if (chatContainer) { chatContainer.scrollTop = chatContainer.scrollHeight; }
    }
}

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    // --- Assign DOM Elements ---
    siteHeader = document.getElementById('site-header');
    siteLogoContainer = document.getElementById('site-logo-container');
    mainSiteNavigation = document.getElementById('main-site-navigation');
    appLayoutContainer = document.getElementById('app-layout-container');
    animatedBg = document.getElementById('animated-background');
    sidebar = document.getElementById('sidebar');
    personaSelector = document.getElementById('persona-selector');
    toggleSidebarButton = document.getElementById('toggle-sidebar-button');
    sidebarToggleIcon = document.getElementById('toggle-sidebar-icon');
    navHomeButton = document.getElementById('nav-home-button');
    navAboutButton = document.getElementById('nav-about-button');
    navFeaturesButton = document.getElementById('nav-features-button');
    navContactButton = document.getElementById('nav-contact-button');
    newChatButton = document.getElementById('new-chat-button');
    searchChatsInput = document.getElementById('search-chats-input');
    clearSearchButton = document.getElementById('clear-search-button');
    chatHistoryList = document.getElementById('chat-history-list');
    mainChatContent = document.getElementById('main-chat-content');
    homeView = document.getElementById('home-view');
    aboutView = document.getElementById('about-view');
    featuresView = document.getElementById('features-view');
    contactView = document.getElementById('contact-view');
    chatInterfaceView = document.getElementById('chat-interface-view');
    chatAppContainer = document.getElementById('chat-app-container');
    chatHeaderTitleElement = document.getElementById('chat-header-title-text');
    aiStatusSubtext = document.getElementById('ai-status-subtext');
    chatContainer = document.getElementById('chat-container');
    chatStarterContainer = document.getElementById('chat-starter-container');
    chatInput = document.getElementById('chat-input');
    voiceInputButton = document.getElementById('voice-input-button');
    attachFileButton = document.getElementById('attach-file-button');
    sendMessageButton = document.getElementById('send-message-button');
    novaInputBarContainer = document.getElementById('nova-input-bar-container');
    generationStatusContainer = document.getElementById('generation-status-container');
    stopGenerationButton = document.getElementById('stop-generation-button');
    themeToggleButton = document.getElementById('theme-toggle-button');
    themeIconSun = document.getElementById('theme-icon-sun');
    themeIconMoon = document.getElementById('theme-icon-moon');


    fileInput = document.getElementById('file-input');
    attachmentPreviewArea = document.getElementById('attachment-preview-area');
    attachmentThumbnail = document.getElementById('attachment-thumbnail');
    attachmentFilename = document.getElementById('attachment-filename');
    removeAttachmentButton = document.getElementById('remove-attachment-button');
    errorDisplay = document.getElementById('error-display');
    homeStartChatButton = document.getElementById('home-start-chat-button');
    codePreviewSection = document.getElementById('code-preview-section');
    codePreviewContent = document.getElementById('code-preview-content');
    copyCodeButton = document.getElementById('copy-code-button');
    copyCodeButtonText = document.getElementById('copy-code-button-text');

    // Populate arrays after assignment
    navButtons = navHomeButton && navAboutButton && navFeaturesButton && navContactButton ? [navHomeButton, navAboutButton, navFeaturesButton, navContactButton] : [];
    allViews = homeView && aboutView && featuresView && contactView && chatInterfaceView ? [homeView, aboutView, featuresView, contactView, chatInterfaceView] : [];

    const essentialElementsExist = siteHeader && siteLogoContainer && mainSiteNavigation &&
        appLayoutContainer && sidebar && mainChatContent && personaSelector &&
        homeView && aboutView && featuresView && contactView && chatInterfaceView &&
        chatAppContainer && chatContainer && chatStarterContainer && chatInput && voiceInputButton &&
        errorDisplay && newChatButton && searchChatsInput && clearSearchButton &&
        chatHistoryList && codePreviewSection && codePreviewContent && copyCodeButton &&
        copyCodeButtonText && homeStartChatButton && chatHeaderTitleElement &&
        navHomeButton && navAboutButton && navFeaturesButton && navContactButton &&
        attachFileButton && fileInput && attachmentPreviewArea && animatedBg &&
        attachmentThumbnail && attachmentFilename && removeAttachmentButton &&
        toggleSidebarButton && sidebarToggleIcon && aiStatusSubtext && sendMessageButton &&
        novaInputBarContainer && generationStatusContainer && stopGenerationButton &&
        themeToggleButton && themeIconSun && themeIconMoon;


    if (!essentialElementsExist) {
        console.error("Critical error: One or more essential UI elements are missing. NOVA.AI may not function correctly.");
        if (document.body && !document.body.querySelector('.critical-error-message')) {
            const criticalErrorMsg = document.createElement('p');
            criticalErrorMsg.textContent = "Application critical error: UI components not found. NOVA.AI may be unstable. Please check console for missing elements.";
            criticalErrorMsg.className = "error-message critical-error-message";
            criticalErrorMsg.style.cssText = "display:block; position:fixed; top:10px; left:10px; background:red; color:white; padding:10px; z-index:10000;";
            document.body.appendChild(criticalErrorMsg);
        }
        const elementChecks = { siteHeader, siteLogoContainer, mainSiteNavigation, appLayoutContainer, sidebar, mainChatContent, homeView, aboutView, featuresView, contactView, chatInterfaceView, chatAppContainer, chatContainer, chatStarterContainer, chatInput, errorDisplay, newChatButton, searchChatsInput, clearSearchButton, chatHistoryList, codePreviewSection, codePreviewContent, copyCodeButton, copyCodeButtonText, homeStartChatButton, navHomeButton, navAboutButton, navFeaturesButton, navContactButton, personaSelector, voiceInputButton, chatHeaderTitleElement, attachFileButton, fileInput, attachmentPreviewArea, attachmentThumbnail, attachmentFilename, removeAttachmentButton, toggleSidebarButton, sidebarToggleIcon, aiStatusSubtext, sendMessageButton, novaInputBarContainer, generationStatusContainer, stopGenerationButton, animatedBg, themeToggleButton, themeIconSun, themeIconMoon };
        for (const key in elementChecks) {
            if (!elementChecks[key]) {
                console.error(`Missing element: ${key}`);
            }
        }
        return;
    }
    
    // --- Initialize Theme ---
    initializeTheme();

    // Main Site Navigation (Header)
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const viewId = button.dataset.view;
            if (viewId) {
                showView(viewId);
            }
        });
    });
     if (siteLogoContainer) {
        siteLogoContainer.addEventListener('click', () => showView('home-view'));
    }
    if (homeStartChatButton) {
        homeStartChatButton.addEventListener('click', () => {
            showView('chat-interface-view');
            if (!currentSessionId && currentChatMessages.length === 0) {
                 initializeChat(undefined, personaSelector ? personaSelector.value : 'general');
            }
        });
    }

    if (toggleSidebarButton) {
        toggleSidebarButton.addEventListener('click', toggleSidebarDisplay);
    }


    if (newChatButton) newChatButton.addEventListener('click', () => startNewChat(true));

    if (searchChatsInput) {
        searchChatsInput.addEventListener('input', handleSearchChats);
        searchChatsInput.addEventListener('search', handleSearchChats);
    }
    if (clearSearchButton && searchChatsInput) {
        clearSearchButton.addEventListener('click', () => {
            searchChatsInput.value = '';
            handleSearchChats();
        });
    }

    if (personaSelector) {
        personaSelector.addEventListener('change', () => {
            const selectedPersonaKey = personaSelector.value;
            if (selectedPersonaKey !== currentPersona) {
                currentPersona = selectedPersonaKey;
                if (currentActiveView === 'chat-interface-view') {
                    startNewChat(true);
                } else {
                    const newP = personas[currentPersona];
                    if (chatHeaderTitleElement) chatHeaderTitleElement.textContent = `NOVA.AI - ${newP.name}`;
                    if (aiStatusSubtext) aiStatusSubtext.textContent = newP.subtext;
                }
            }
        });
    }

    if (stopGenerationButton) {
        stopGenerationButton.addEventListener('click', () => {
            stopStreamingFlag = true;
            console.log('Stop button clicked, requesting stream stop.');
        });
    }

    if (voiceInputButton) {
        voiceInputButton.addEventListener('click', () => {
            if (recognition) {
                try {
                    if (synth && synth.speaking) {
                        synth.cancel();
                        isCurrentlySpeaking = false;
                        speechQueue = [];
                    }
                    recognition.start();
                    voiceInputButton.classList.add('listening');
                    if(errorDisplay) errorDisplay.textContent = "";
                } catch (e) {
                    console.error("Error starting speech recognition:", e);
                    if (errorDisplay) errorDisplay.textContent = "Could not start voice input. Try again.";
                    voiceInputButton.classList.remove('listening');
                }
            } else {
                if (errorDisplay) errorDisplay.textContent = "Voice input is not available.";
            }
        });
    }
    
    if (themeToggleButton) {
        themeToggleButton.addEventListener('click', toggleTheme);
    }

    if (attachFileButton && fileInput) {
        attachFileButton.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', handleFileSelect);
    }
    if (removeAttachmentButton) {
        removeAttachmentButton.addEventListener('click', clearAttachment);
    }

    if (sendMessageButton) {
        sendMessageButton.addEventListener('click', () => {
            isVoiceInputModeActive = false;
            if (synth && synth.speaking) { synth.cancel(); isCurrentlySpeaking = false; speechQueue = [];}
            handleSendMessage(false);
        });
    }

    if (chatInput) {
        const computedStyle = getComputedStyle(chatInput);
        const initialHeight = computedStyle.height;
        chatInput.style.setProperty('--initial-textarea-height', initialHeight);
        chatInput.style.overflowY = 'hidden';

        chatInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                isVoiceInputModeActive = false;
                if (synth && synth.speaking) { synth.cancel(); isCurrentlySpeaking = false; speechQueue = [];}
                handleSendMessage(false);
            }
        });
         chatInput.addEventListener('input', () => {
            chatInput.style.height = 'auto';
            const scrollHeight = chatInput.scrollHeight;
            const maxHeight = 150;
            const minHeight = parseFloat(initialHeight.replace('px',''));

            if (scrollHeight > maxHeight) {
                chatInput.style.height = `${maxHeight}px`;
                chatInput.style.overflowY = 'auto';
            } else {
                chatInput.style.height = `${Math.max(scrollHeight, minHeight)}px`;
                chatInput.style.overflowY = 'hidden';
            }
        });
    }
    if (copyCodeButton && codePreviewContent && copyCodeButtonText) {
        copyCodeButton.addEventListener('click', () => {
            if (codePreviewContent.textContent) {
                navigator.clipboard.writeText(codePreviewContent.textContent)
                    .then(() => {
                        copyCodeButtonText.textContent = 'Copied!';
                        copyCodeButton.classList.add('copied');
                        setTimeout(() => {
                            copyCodeButtonText.textContent = 'Copy Code';
                            copyCodeButton.classList.remove('copied');
                        }, 2000);
                    })
                    .catch(err => {
                        console.error('Failed to copy code: ', err);
                        copyCodeButtonText.textContent = 'Error';
                         setTimeout(() => {
                            copyCodeButtonText.textContent = 'Copy Code';
                        }, 2000);
                    });
            }
        });
    }

    const customCursor = document.getElementById('custom-cursor');
    if (customCursor) {
        document.addEventListener('mousemove', (e) => {
            // Position the top-left corner of the cursor element at the mouse position
            customCursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
        });

        document.body.addEventListener('mouseenter', () => { customCursor.style.opacity = '1'; });
        document.body.addEventListener('mouseleave', () => { customCursor.style.opacity = '0'; });
    }

    if (animatedBg) {
        const flareUpInterval = 25000;
        const flareUpDuration = 2500;
        setInterval(() => {
            animatedBg.classList.add('bg-is-transforming');
            setTimeout(() => animatedBg.classList.remove('bg-is-transforming'), flareUpDuration);
        }, flareUpInterval);
    }

    initializeSpeechRecognition();
    initializeTextToSpeech();


    if (sidebarToggleIcon && toggleSidebarButton && sidebar && appLayoutContainer) {
        if (isSidebarManuallyCollapsed) {
            sidebar.classList.add('collapsed-manual');
            appLayoutContainer.classList.add('sidebar-collapsed-manual');
            sidebarToggleIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M13.1716 12L8.22183 7.05025L9.63604 5.63604L16 12L9.63604 18.364L8.22183 16.9497L13.1716 12Z"/></svg>`;
            toggleSidebarButton.setAttribute('aria-label', 'Open sidebar');
            toggleSidebarButton.setAttribute('aria-expanded', 'true');
        } else {
            sidebarToggleIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M10.8284 12L15.7782 16.9497L14.364 18.364L8 12L14.364 5.63604L15.7782 7.05025L10.8284 12Z"/></svg>`;
            toggleSidebarButton.setAttribute('aria-label', 'Close sidebar');
            toggleSidebarButton.setAttribute('aria-expanded', 'false');
        }
    }


    if (!ai && AIzaSyCseYFQ1OntFVmfZ30PCIwleXjagToQTQw.env.API_KEY) {
        ai = new GoogleGenAI({ apiKey: AIzaSyCseYFQ1OntFVmfZ30PCIwleXjagToQTQw.env.API_KEY });
    }
    const initialP = personas[personaSelector ? personaSelector.value : 'general'];
    if (chatHeaderTitleElement) chatHeaderTitleElement.textContent = `NOVA.AI - ${initialP.name}`;
    if (aiStatusSubtext) aiStatusSubtext.textContent = initialP.subtext;

    renderChatHistory();
    showView('home-view'); // Panda will be hidden by showView initially if not in chat view
});
