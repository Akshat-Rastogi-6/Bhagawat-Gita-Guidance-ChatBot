let API_URL = '';

fetch('./env.json')
    .then(response => response.json())
    .then(env => {
        API_URL = env.API_URL;
    })
    .catch(() => {
        API_URL = 'http://localhost:5000/api/chat'; // fallback
    });

document.addEventListener('DOMContentLoaded', function() {
    const chatMessages = document.getElementById('chatMessages');
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    
    // Load Marked.js for Markdown parsing
    const markedScript = document.createElement('script');
    markedScript.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
    document.head.appendChild(markedScript);
    
    // Sample responses from Bhagavad Gita for fallback
    const gitaResponses = [
        "Just as a person puts on new garments, giving up old ones, the soul similarly accepts new material bodies, giving up the old and useless ones. (Chapter 2, Verse 22)",
        "For the soul there is neither birth nor death at any time. He has not come into being, does not come into being, and will not come into being. He is unborn, eternal, ever-existing, and primeval. (Chapter 2, Verse 20)",
        "What is night for all beings is the time of awakening for the self-controlled; and the time of awakening for all beings is night for the introspective sage. (Chapter 2, Verse 69)",
        "Perform your prescribed duties, for action is better than inaction. Even to maintain your body, you have to work. (Chapter 3, Verse 8)",
        "The wise see that there is action in the midst of inaction and inaction in the midst of action. Their consciousness is unified, and every act is done with complete awareness. (Chapter 4, Verse 18)",
        "One who sees inaction in action, and action in inaction, is intelligent among men, and he is in the transcendental position, although engaged in all sorts of activities. (Chapter 4, Verse 18)",
        "The embodied soul is eternal, indestructible, and immeasurable; therefore, do not grieve, Arjuna. (Chapter 2, Verse 25)",
        "No one who does good work will ever come to a bad end, either here or in the world to come. (Chapter 6, Verse 40)",
        "Whatever action is performed by a great man, common men follow in his footsteps, and whatever standards he sets by exemplary acts, all the world pursues. (Chapter 3, Verse 21)",
        "The happiness which comes from long practice, which leads to the end of suffering, which at first is like poison, but at last like nectar - this kind of happiness arises from the serenity of one's own mind. (Chapter 18, Verse 37)"
    ];
    
    // Function to add a message to the chat
    function addMessage(text, isUser = false, isLoading = false, isMarkdown = false) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message');
        messageDiv.classList.add(isUser ? 'user-message' : 'bot-message');
        
        const messageContent = document.createElement('div');
        messageContent.classList.add('message-content');
        
        if (isLoading) {
            const loadingIndicator = document.createElement('div');
            loadingIndicator.classList.add('loading-indicator');
            // loadingIndicator.innerHTML = '<span>.</span><span>.</span><span>.</span>';
            loadingIndicator.innerHTML = '<span>.</span><span>.</span><span>.</span>';
            messageContent.appendChild(loadingIndicator);
            messageDiv.id = 'loadingMessage';
        } else {
            if (isMarkdown && window.marked) {
                // Parse markdown and set as HTML
                messageContent.innerHTML = window.marked.parse(text);
                
                // Add target="_blank" to all links to open in new tab
                const links = messageContent.querySelectorAll('a');
                links.forEach(link => {
                    link.setAttribute('target', '_blank');
                    link.setAttribute('rel', 'noopener noreferrer');
                });
            } else {
                const paragraph = document.createElement('p');
                paragraph.textContent = text;
                messageContent.appendChild(paragraph);
            }
        }
        
        messageDiv.appendChild(messageContent);
        chatMessages.appendChild(messageDiv);
        
        // Scroll to bottom of chat
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        return messageDiv;
    }
    
    // Function to get a response from API
    async function getKrishnaResponse(userQuestion) {
        try {
            // Show loading indicator
            const loadingMessage = addMessage('Krishna is contemplating...', false, true);
            
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query: userQuestion }),
            });
            
            if (!response.ok) {
                throw new Error('API request failed');
            }
            
            const data = await response.json();
            
            // Remove loading indicator
            if (loadingMessage) {
                chatMessages.removeChild(loadingMessage);
            }
            
            // Return the API response
            return data.response;
        } catch (error) {
            console.error('Error fetching response:', error);
            
            // Remove loading indicator
            const loadingMessage = document.getElementById('loadingMessage');
            if (loadingMessage) {
                chatMessages.removeChild(loadingMessage);
            }
            
            // Fallback to local responses if API fails
            if (userQuestion.toLowerCase().includes('karma') || userQuestion.toLowerCase().includes('action')) {
                return "The theory of Karma states that our actions create an energy that returns to us in this or another lifetime. As Krishna says: 'You have a right to perform your prescribed duties, but you are not entitled to the fruits of your actions.' (Chapter 2, Verse 47)";
            } else if (userQuestion.toLowerCase().includes('dharma') || userQuestion.toLowerCase().includes('duty')) {
                return "Dharma refers to the moral order that sustains the cosmos, society, and the individual. Krishna teaches: 'It is better to perform one's own duties imperfectly than to master the duties of another. By fulfilling the obligations born of one's nature, a person never incurs sin.' (Chapter 18, Verse 47)";
            } else {
                return gitaResponses[Math.floor(Math.random() * gitaResponses.length)];
            }
        }
    }
    
    // Function to handle sending a message
    async function sendMessage() {
        const userMessage = userInput.value.trim();
        
        if (userMessage !== '') {
            // Disable input and button while processing
            userInput.disabled = true;
            sendBtn.disabled = true;
            
            // Add user message to chat
            addMessage(userMessage, true);
            
            // Clear input field
            userInput.value = '';
            
            // Get response from API
            const krishnaResponse = await getKrishnaResponse(userMessage);
            
            // Check if Marked.js is loaded before rendering markdown
            if (window.marked) {
                addMessage(krishnaResponse, false, false, true);
            } else {
                // If Marked.js isn't loaded yet, wait for it
                markedScript.onload = () => {
                    addMessage(krishnaResponse, false, false, true);
                };
            }
            
            // Re-enable input and button
            userInput.disabled = false;
            sendBtn.disabled = false;
            userInput.focus();
        }
    }
    
    // Event listeners
    sendBtn.addEventListener('click', sendMessage);
    
    userInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Add CSS for loading indicator and markdown styling
    const style = document.createElement('style');
    style.textContent = `
        .loading-indicator {
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .loading-indicator span {
            animation: dotAnimation 1.4s infinite ease-in-out;
            margin: 0 2px;
            font-size: 20px;
        }
        
        .loading-indicator span:nth-child(2) {
            animation-delay: 0.2s;
        }
        
        .loading-indicator span:nth-child(3) {
            animation-delay: 0.4s;
        }
        
        @keyframes dotAnimation {
            0%, 60%, 100% {
                transform: translateY(0);
                opacity: 0.8;
            }
            30% {
                transform: translateY(-5px);
                opacity: 1;
            }
        }
        
        /* Markdown styling */
        .message-content h1, 
        .message-content h2, 
        .message-content h3 {
            margin-top: 0.5em;
            margin-bottom: 0.5em;
            font-family: 'Cormorant Garamond', serif;
            color: var(--deep-blue);
        }
        
        .message-content p {
            margin-bottom: 0.7em;
        }
        
        .message-content p:last-child {
            margin-bottom: 0;
        }
        
        .message-content ul, 
        .message-content ol {
            margin-left: 1.5em;
            margin-bottom: 0.7em;
        }
        
        .message-content blockquote {
            border-left: 3px solid var(--light-gold);
            padding-left: 10px;
            margin-left: 10px;
            color: var(--spiritual-purple);
            font-style: italic;
        }
        
        .message-content code {
            background-color: rgba(0,0,0,0.05);
            padding: 2px 4px;
            border-radius: 3px;
            font-family: monospace;
            font-size: 0.9em;
        }
        
        .message-content pre {
            background-color: rgba(0,0,0,0.05);
            padding: 8px;
            border-radius: 5px;
            overflow-x: auto;
            margin-bottom: 0.7em;
        }
        
        .message-content pre code {
            background-color: transparent;
            padding: 0;
        }
        
        .message-content a {
            color: var(--dark-orange);
            text-decoration: none;
            border-bottom: 1px dotted var(--dark-orange);
        }
        
        .message-content a:hover {
            color: var(--primary-gold);
            border-bottom: 1px solid var(--primary-gold);
        }
    `;
    document.head.appendChild(style);
    
    // Function to update verse of the day from verses.json
    function updateVerseOfDayFromJson() {
        fetch('./verses.json')
            .then(response => response.json())
            .then(verses => {
                // Pick a verse based on the day of the year
                const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
                const verse = verses[dayOfYear % verses.length];
                const verseContainer = document.querySelector('.verse-content');
                verseContainer.innerHTML = `
                    <p class="sanskrit">${verse.sanskrit}</p>
                    <p class="translation">"${verse.translation}"</p>
                    <p class="reference">— ${verse.reference}</p>
                `;
            });
    }

    // Update verse when page loads and every hour
    updateVerseOfDayFromJson();
    setInterval(updateVerseOfDayFromJson, 3600000);
    
    // Add subtle animation to lotus overlay
    const lotusOverlay = document.querySelector('.lotus-overlay');
    
    window.addEventListener('scroll', () => {
        const scrollPosition = window.scrollY;
        lotusOverlay.style.transform = `translateY(${scrollPosition * 0.05}px)`;
    });
    
    // Initial greeting
    addMessage("Namaste 🙏 I am Krishna, your spiritual guide. Ask me anything about the eternal wisdom of Bhagavad Gita, and I shall illuminate your path.", false);
});