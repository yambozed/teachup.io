// TeachUp - Chat.js - Parte 1 (Inizializzazione e variabili globali)

// Variabili globali per tenere traccia dello stato
let currentUser = null;
let currentChat = null;
let currentAttachment = null;
let selectedChatTab = 'recent';
let selectedGroupMembers = [];
let pendingChatRequests = [];
let sentChatRequests = [];
let chats = [];
let isSidebarVisible = true;

// Riferimenti agli elementi DOM
const chatList = document.getElementById('chatList');
const pendingChatRequestsContainer = document.getElementById('pendingChatRequests');
const chatRequestsContainer = document.getElementById('chatRequestsContainer');
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const attachButton = document.getElementById('attachButton');
const fileInput = document.getElementById('fileInput');
const attachmentPreview = document.getElementById('attachmentPreview');
const previewContent = document.getElementById('previewContent');
const removeAttachment = document.getElementById('removeAttachment');
const searchInput = document.getElementById('searchInput');
const userSearchInput = document.getElementById('userSearchInput');
const userSearchResults = document.getElementById('userSearchResults');
const groupMemberSearch = document.getElementById('groupMemberSearch');
const groupMemberSearchResults = document.getElementById('groupMemberSearchResults');
const selectedMembersList = document.getElementById('selectedMembersList');
const selectedMembersCount = document.getElementById('selectedMembersCount');
const initialMessage = document.getElementById('initialMessage');
const messageFormGroup = document.getElementById('messageFormGroup');
const emptyChatState = document.getElementById('emptyChatState');
const chatName = document.getElementById('chatName');
const chatStatus = document.getElementById('chatStatus');
const chatInputContainer = document.getElementById('chatInputContainer');
const chatHeader = document.getElementById('chatHeader');
const sendRequestButton = document.getElementById('sendRequestButton');
const createGroupButton = document.getElementById('createGroupButton');

// Controllo autenticazione e reindirizzamento
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM caricato, inizializzazione app chat...");
    
    // Controlla se l'utente è autenticato
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            // L'utente è autenticato
            currentUser = user;
            console.log('Utente autenticato:', user.displayName || user.email);
            
            // Inizializza l'interfaccia utente della chat
            initChat();
        } else {
            // L'utente non è autenticato, reindirizza alla pagina di login
            console.log('Utente non autenticato, reindirizzamento...');
            window.location.href = '../../Login/prova.html';
        }
    });
});

// Inizializzazione della chat
function initChat() {
    console.log("Inizializzazione interfaccia chat...");
    
    // Inizializza l'interfaccia
    setupUIListeners();
    
    // Crea le collezioni Firestore se non esistono
    createFirestoreCollections();
    
    // Carica i dati
    loadChats();
    loadChatRequests();
    loadSentRequests();
    
    // Aggiungi listener per gli eventi di resize della textarea
    messageInput.addEventListener('input', autoResizeTextarea);
    
    // Listener per il pulsante di invio
    sendButton.addEventListener('click', sendMessage);
    
    // Listener per l'input della tastiera
    messageInput.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
        
        // Abilita/disabilita il pulsante di invio
        if (messageInput.value.trim().length > 0) {
            sendButton.disabled = false;
        } else {
            sendButton.disabled = true;
        }
    });
    
    // Listener per l'input di ricerca
    messageInput.addEventListener('input', () => {
        sendButton.disabled = messageInput.value.trim().length === 0;
    });
    
    // Listener per il pulsante di allegato
    attachButton.addEventListener('click', () => {
        fileInput.click();
    });
    
    // Listener per il file input
    fileInput.addEventListener('change', handleFileSelection);
    
    // Listener per rimuovere l'allegato
    removeAttachment.addEventListener('click', removeAttachmentFile);
    
    // Listener per la ricerca chat
    searchInput.addEventListener('input', filterChats);
    
    // Listener per la ricerca utenti (nuova chat)
    userSearchInput.addEventListener('input', searchUsers);
    
    // Listener per la ricerca utenti (chat di gruppo)
    groupMemberSearch.addEventListener('input', searchUsersForGroup);
    
    // Aggiungi esplicitamente i listener per i pulsanti di nuova chat
    const newChatButton = document.getElementById('newChatButton');
    if (newChatButton) {
        newChatButton.addEventListener('click', () => {
            console.log("Pulsante Nuova Chat cliccato");
            showNewChatModal();
        });
    } else {
        console.error("Pulsante newChatButton non trovato");
    }
    
    const newGroupButton = document.getElementById('newGroupButton');
    if (newGroupButton) {
        newGroupButton.addEventListener('click', () => {
            console.log("Pulsante Nuova Chat di Gruppo cliccato");
            showNewGroupModal();
        });
    } else {
        console.error("Pulsante newGroupButton non trovato");
    }
    
    console.log("Inizializzazione completata");
}

// Assicura che le collezioni Firestore necessarie esistano
function createFirestoreCollections() {
    console.log("Verifica e creazione collezioni Firestore...");
    
    // Verifica e crea la collezione chatRequests se non esiste
    db.collection('chatRequests').limit(1).get()
        .then(snapshot => {
            if (snapshot.empty) {
                console.log("Creazione collezione 'chatRequests'...");
                // Creazione di un documento temporaneo per inizializzare la collezione
                db.collection('chatRequests').doc('init').set({
                    isInit: true,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                })
                .then(() => {
                    console.log("Collezione 'chatRequests' inizializzata");
                    // Rimuovi il documento di inizializzazione
                    db.collection('chatRequests').doc('init').delete();
                });
            } else {
                console.log("Collezione 'chatRequests' già esiste");
            }
        });
    
    // Verifica e crea la collezione chats se non esiste
    db.collection('chats').limit(1).get()
        .then(snapshot => {
            if (snapshot.empty) {
                console.log("Creazione collezione 'chats'...");
                // Creazione di un documento temporaneo per inizializzare la collezione
                db.collection('chats').doc('init').set({
                    isInit: true,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                })
                .then(() => {
                    console.log("Collezione 'chats' inizializzata");
                    // Rimuovi il documento di inizializzazione
                    db.collection('chats').doc('init').delete();
                });
            } else {
                console.log("Collezione 'chats' già esiste");
            }
        });
}

// Setup dei listener per gli elementi dell'interfaccia utente
function setupUIListeners() {
    // Listener per i tab delle chat
    document.querySelectorAll('.chat-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            // Rimuovi la classe 'active' da tutti i tab
            document.querySelectorAll('.chat-tab').forEach(t => t.classList.remove('active'));
            
            // Aggiungi la classe 'active' al tab cliccato
            tab.classList.add('active');
            
            // Aggiorna la selezione corrente
            selectedChatTab = tab.dataset.tab;
            
            // Filtra le chat in base al tab selezionato
            filterChatsByTab();
        });
    });
}
// TeachUp - Chat.js - Parte 2 (Caricamento chat e richieste)

// Caricamento delle chat
function loadChats() {
    console.log("Caricamento chat...");
    
    // Mostra il loader
    chatList.innerHTML = `
        <li class="chat-loading">
            <div class="spinner"></div>
            <p>Caricamento chat...</p>
        </li>
    `;
    
    // Riferimento alle chat dell'utente corrente
    const userChatsRef = db.collection('chats')
        .where('participants', 'array-contains', currentUser.uid);
    
    // Ascolta in tempo reale i cambiamenti nelle chat
    userChatsRef.onSnapshot(snapshot => {
        console.log(`Trovate ${snapshot.size} chat dell'utente`);
        chats = [];
        snapshot.forEach(doc => {
            chats.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Ordina le chat per ultimo messaggio
        chats.sort((a, b) => {
            const aLastMessage = a.lastMessage?.timestamp?.toDate() || new Date(0);
            const bLastMessage = b.lastMessage?.timestamp?.toDate() || new Date(0);
            return bLastMessage - aLastMessage;
        });
        
        // Aggiorna l'interfaccia con le chat
        renderChatList();
        
        // Controlla se ci sono chat o richieste
        updateEmptyState();
    }, error => {
        console.error("Errore nel caricamento delle chat:", error);
        chatList.innerHTML = `<li class="chat-error">Errore nel caricamento delle chat. Riprova.</li>`;
    });
}

// Caricamento delle richieste di chat ricevute
function loadChatRequests() {
    console.log("Caricamento richieste di chat ricevute...");
    
    // Riferimento alle richieste di chat pendenti
    const requestsRef = db.collection('chatRequests')
        .where('recipientId', '==', currentUser.uid)
        .where('status', '==', 'pending');
    
    // Ascolta in tempo reale le richieste
    requestsRef.onSnapshot(snapshot => {
        console.log(`Trovate ${snapshot.size} richieste pendenti per l'utente`);
        pendingChatRequests = [];
        snapshot.forEach(doc => {
            pendingChatRequests.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Aggiorna l'interfaccia con le richieste
        renderChatRequests();
        
        // Controlla se ci sono chat o richieste
        updateEmptyState();
    }, error => {
        console.error("Errore nel caricamento delle richieste:", error);
    });
}

// Caricamento delle richieste di chat inviate
function loadSentRequests() {
    console.log("Caricamento richieste di chat inviate...");
    
    // Riferimento alle richieste di chat inviate
    const sentRequestsRef = db.collection('chatRequests')
        .where('senderId', '==', currentUser.uid)
        .where('status', '==', 'pending');
    
    // Ascolta in tempo reale le richieste inviate
    sentRequestsRef.onSnapshot(snapshot => {
        console.log(`Trovate ${snapshot.size} richieste inviate dall'utente`);
        sentChatRequests = [];
        snapshot.forEach(doc => {
            sentChatRequests.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Aggiorna l'interfaccia con le chat (includendo le richieste inviate)
        renderChatList();
        
        // Controlla se ci sono chat o richieste
        updateEmptyState();
    }, error => {
        console.error("Errore nel caricamento delle richieste inviate:", error);
    });
}

// Aggiorna lo stato vuoto
function updateEmptyState() {
    // Controlla se ci sono chat o richieste da mostrare
    const hasContent = chats.length > 0 || pendingChatRequests.length > 0 || sentChatRequests.length > 0;
    
    // Mostra o nascondi lo stato vuoto
    if (hasContent) {
        emptyChatState.style.display = 'none';
    } else {
        emptyChatState.style.display = 'flex';
    }
}

// Rendering delle richieste di chat ricevute
function renderChatRequests() {
    console.log("Rendering di", pendingChatRequests.length, "richieste di chat");
    
    // Verifica elementi DOM
    if (!chatRequestsContainer || !pendingChatRequestsContainer) {
        console.error("Elementi container richieste non trovati", {
            chatRequestsContainer,
            pendingChatRequestsContainer
        });
        return;
    }
    
    if (pendingChatRequests.length === 0) {
        chatRequestsContainer.style.display = 'none';
        return;
    }
    
    // Mostra il container delle richieste
    chatRequestsContainer.style.display = 'block';
    console.log("Container richieste visualizzato");
    
    // Genera l'HTML delle richieste
    let requestsHTML = '';
    pendingChatRequests.forEach(request => {
        // Costruisci il nome da visualizzare
        let displayName = request.senderEmail;
        if (request.senderNome && request.senderCognome) {
            displayName = `${request.senderNome} ${request.senderCognome}`;
        } else if (request.senderNome) {
            displayName = request.senderNome;
        }

        requestsHTML += `
            <div class="chat-request-item" data-request-id="${request.id}">
                <div class="chat-avatar">
                    ${(request.senderNome || request.senderEmail || 'U').charAt(0).toUpperCase()}
                </div>
                <div class="chat-request-info">
                    <div class="chat-request-from">${displayName}</div>
                    <div class="chat-request-message">${request.message || 'Vuole iniziare una conversazione con te'}</div>
                </div>
                <div class="chat-request-actions">
                    <button class="chat-request-button chat-request-accept" title="Accetta" onclick="acceptChatRequest('${request.id}')">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="chat-request-button chat-request-reject" title="Rifiuta" onclick="rejectChatRequest('${request.id}')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    // Aggiorna il DOM con le richieste
    pendingChatRequestsContainer.innerHTML = requestsHTML;
    console.log("HTML richieste generato e inserito nel container");
}

// Filtra le chat in base al tab selezionato
function filterChatsByTab() {
    renderChatList();
}

// Filtra le chat in base all'input di ricerca
function filterChats() {
    const searchTerm = searchInput.value.toLowerCase();
    renderChatList();
}

// Formato data utili
function formatDate(date) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const messageDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (messageDay.getTime() === today.getTime()) {
        return 'Oggi';
    } else if (messageDay.getTime() === yesterday.getTime()) {
        return 'Ieri';
    } else {
        // Formatta la data in base alla locale dell'utente
        return date.toLocaleDateString('it-IT', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }
}

// Formatta l'ora di un messaggio
function formatTime(date) {
    return date.toLocaleTimeString('it-IT', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Formatta il tempo dei messaggi nella lista chat
function formatMessageTime(date) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const messageDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (messageDay.getTime() === today.getTime()) {
        // Per oggi, mostra solo l'ora
        return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    } else if (messageDay.getTime() === yesterday.getTime()) {
        // Per ieri, mostra "Ieri"
        return 'Ieri';
    } else if (now.getFullYear() === date.getFullYear()) {
        // Per lo stesso anno, mostra solo il giorno e il mese
        return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
    } else {
        // Per anni diversi, mostra anche l'anno
        return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: '2-digit' });
    }
}

// Mostra toast di notifica
function showToast(message, duration = 3000) {
    // Rimuovi eventuali toast esistenti
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    // Crea il toast
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = message;
    
    // Aggiungi al documento
    document.body.appendChild(toast);
    
    // Mostra il toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Rimuovi il toast dopo la durata
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300); // Durata dell'animazione di uscita
    }, duration);
}
// TeachUp - Chat.js - Parte 3 (Rendering liste chat e richieste)

// Rendering della lista chat (include anche le richieste inviate)
function renderChatList() {
    // Prepara l'array combinato di chat e richieste inviate
    let combinedItems = [...chats];
    
    // Aggiungi le richieste inviate come chat speciali
    sentChatRequests.forEach(request => {
        // Evita di aggiungere richieste che già hanno una chat corrispondente
        const existingChat = chats.find(chat => 
            chat.type === 'private' && 
            chat.participants.includes(request.recipientId) &&
            chat.participants.includes(request.senderId)
        );
        
        if (!existingChat) {
            // Crea un oggetto simile a una chat per la richiesta inviata
            combinedItems.push({
                id: request.id,
                type: 'private',
                status: 'pending-sent',
                participantsInfo: [
                    {
                        id: request.senderId,
                        email: request.senderEmail,
                        nome: request.senderNome || '',
                        cognome: request.senderCognome || ''
                    },
                    {
                        id: request.recipientId,
                        email: request.recipientEmail || '',
                        nome: '',
                        cognome: ''
                    }
                ],
                participants: [request.senderId, request.recipientId],
                lastMessage: {
                    content: request.message || 'Richiesta inviata',
                    timestamp: request.timestamp,
                    senderId: request.senderId
                },
                isRequest: true,
                requestData: request
            });
        }
    });
    
    if (combinedItems.length === 0) {
        chatList.innerHTML = ''; // Lista vuota
        return;
    }
    
    // Ordina tutti gli elementi per data (chat e richieste insieme)
    combinedItems.sort((a, b) => {
        const aTimestamp = a.lastMessage?.timestamp || a.lastActivity || a.createdAt || new Date(0);
        const bTimestamp = b.lastMessage?.timestamp || b.lastActivity || b.createdAt || new Date(0);
        
        const aDate = aTimestamp instanceof Date ? aTimestamp : aTimestamp?.toDate() || new Date(0);
        const bDate = bTimestamp instanceof Date ? bTimestamp : bTimestamp?.toDate() || new Date(0);
        
        return bDate - aDate;
    });
    
    let chatListHTML = '';
    
    // Itera sugli elementi filtrati
    combinedItems.filter(item => {
        // Filtra in base al tab selezionato
        if (selectedChatTab === 'groups') {
            return item.type === 'group';
        } else if (selectedChatTab === 'private') {
            return item.type === 'private';
        }
        return true; // 'recent' mostra tutte le chat
    }).forEach(item => {
        const isRequest = item.isRequest === true;
        
        // Controlla se c'è un messaggio non letto
        const hasUnread = !isRequest && item.unreadBy && item.unreadBy.includes(currentUser.uid);
        
        // Determina il nome della chat da visualizzare
        let displayName = item.name || '';
        
        // Per chat private e richieste, mostra il nome dell'altro partecipante
        if (item.type === 'private') {
            const otherParticipant = item.participantsInfo.find(p => p.id !== currentUser.uid);
            // Usa nome e cognome o email come fallback
            if (otherParticipant) {
                if (otherParticipant.nome && otherParticipant.cognome) {
                    displayName = `${otherParticipant.nome} ${otherParticipant.cognome}`;
                } else if (otherParticipant.nome) {
                    displayName = otherParticipant.nome;
                } else {
                    displayName = otherParticipant.email;
                }
            } else {
                displayName = 'Chat privata';
            }
        }
        
        // Determina il contenuto dell'ultimo messaggio
        let lastMessageContent = 'Nessun messaggio';
        
        if (isRequest) {
            // Per richieste inviate
            lastMessageContent = item.requestData.message || 'Richiesta inviata';
        } else if (item.lastMessage) {
            // Per chat normali
            if (item.lastMessage.type === 'text') {
                lastMessageContent = item.lastMessage.content;
            } else if (item.lastMessage.type === 'image') {
                lastMessageContent = '🖼️ Immagine';
            } else if (item.lastMessage.type === 'file') {
                lastMessageContent = '📎 File: ' + (item.lastMessage.fileName || 'Allegato');
            } else if (item.lastMessage.type === 'system') {
                lastMessageContent = item.lastMessage.content;
            }
            
            // Se non è l'utente corrente, mostra chi ha inviato il messaggio nelle chat di gruppo
            if (item.type === 'group' && item.lastMessage.senderId !== currentUser.uid) {
                const sender = item.participantsInfo.find(p => p.id === item.lastMessage.senderId);
                // Usa il nome o l'email come fallback
                const senderName = sender ? (sender.nome || sender.email.split('@')[0]) : 'Qualcuno';
                lastMessageContent = `${senderName}: ${lastMessageContent}`;
            }
        }
        
        // Formatta la data dell'ultimo messaggio
        let timeString = '';
        const timestamp = isRequest ? item.requestData.timestamp : (item.lastMessage && item.lastMessage.timestamp);
        
        if (timestamp) {
            const messageDate = timestamp instanceof Date ? timestamp : timestamp.toDate();
            timeString = formatMessageTime(messageDate);
        }

        // Determina l'iniziale per l'avatar
        let avatarInitial = displayName.charAt(0).toUpperCase();
        if (item.type === 'group') {
            avatarInitial = '👥';
        }
        
        // Determina se la chat è attiva
        const isActive = currentChat && currentChat.id === item.id;
        
        // Controlla se c'è una richiesta pendente
        const isPending = isRequest || item.status === 'pending';
        const isPendingSent = isRequest && item.status === 'pending-sent';
        
        // Crea l'HTML dell'elemento chat
        chatListHTML += `
            <li class="chat-item ${isActive ? 'active' : ''} ${isPending ? 'pending' : ''}" data-chat-id="${item.id}" data-is-request="${isRequest}">
                <div class="chat-avatar ${item.type === 'group' ? 'group' : ''}">
                    ${avatarInitial}
                </div>
                <div class="chat-info">
                    <div class="chat-name">${displayName}</div>
                    <div class="chat-last-message">${lastMessageContent}</div>
                </div>
                <div class="chat-meta">
                    <div class="chat-time">${timeString}</div>
                    ${hasUnread ? '<div class="chat-badge">1</div>' : ''}
                </div>
                ${isPendingSent ? '<div class="chat-request-indicator">In attesa</div>' : ''}
                ${isPending && !isPendingSent ? '<div class="chat-request-indicator">Richiesta</div>' : ''}
            </li>
        `;
    });
    
    // Aggiorna il DOM con la lista chat
    chatList.innerHTML = chatListHTML;
    
    // Aggiungi gli event listener per i click sulle chat
    document.querySelectorAll('.chat-item').forEach(item => {
        item.addEventListener('click', () => {
            const chatId = item.dataset.chatId;
            const isRequest = item.dataset.isRequest === 'true';
            
            if (isRequest) {
                // Per richieste inviate, mostra dettagli ma non permette messaggi
                selectChatRequest(chatId);
            } else {
                // Per chat normali, permette la conversazione
                selectChat(chatId);
            }
        });
    });
}

// Seleziona una richiesta di chat inviata
function selectChatRequest(requestId) {
    console.log("Selezione richiesta:", requestId);
    
    // Trova la richiesta dalla lista
    const request = sentChatRequests.find(r => r.id === requestId);
    if (!request) {
        console.error("Richiesta non trovata:", requestId);
        return;
    }
    
    // Costruisci un oggetto chat fittizio per la richiesta
    const chatObject = {
        id: request.id,
        type: 'private',
        status: 'pending-sent',
        participantsInfo: [
            {
                id: request.senderId,
                email: request.senderEmail,
                nome: request.senderNome || '',
                cognome: request.senderCognome || ''
            },
            {
                id: request.recipientId,
                email: request.recipientEmail || '',
                nome: '',
                cognome: ''
            }
        ],
        participants: [request.senderId, request.recipientId],
        lastMessage: {
            content: request.message || 'Richiesta inviata',
            timestamp: request.timestamp,
            senderId: request.senderId
        },
        isRequest: true,
        requestData: request
    };
    
    // Imposta la chat corrente
    currentChat = chatObject;
    
    // Aggiorna lo stato attivo nella lista chat
    document.querySelectorAll('.chat-item').forEach(item => {
        if (item.dataset.chatId === requestId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    // Aggiorna l'header della chat
    updateChatHeader();
    
    // Visualizza un messaggio di attesa invece dei messaggi normali
    chatMessages.innerHTML = `
        <div class="chat-waiting-message">
            <div class="chat-waiting-icon"><i class="fas fa-hourglass-half"></i></div>
            <h3>Richiesta di chat in attesa</h3>
            <p>Hai inviato una richiesta di chat a questo utente il ${formatDate(request.timestamp.toDate())}</p>
            <p>${request.message ? `Con messaggio: "${request.message}"` : ''}</p>
            <p>Potrai iniziare a chattare quando la tua richiesta verrà accettata.</p>
            <button class="cancel-request-button" onclick="cancelChatRequest('${request.id}')">
                <i class="fas fa-times"></i> Annulla richiesta
            </button>
        </div>
    `;
    
    // Nascondi l'input della chat
    chatInputContainer.style.display = 'none';
    
    // Se si è in modalità mobile, nascondi la sidebar
    if (window.innerWidth <= 768) {
        toggleSidebar();
    }
}

// Annulla una richiesta di chat inviata
function cancelChatRequest(requestId) {
    if (confirm('Sei sicuro di voler annullare questa richiesta di chat?')) {
        // Rimuovi la richiesta da Firestore
        db.collection('chatRequests').doc(requestId).delete()
            .then(() => {
                console.log("Richiesta annullata:", requestId);
                showToast('Richiesta di chat annullata');
                
                // Resetta la chat corrente
                currentChat = null;
                
                // Aggiorna l'UI
                chatName.textContent = 'Seleziona una chat';
                chatStatus.textContent = '...';
                chatMessages.innerHTML = `
                    <div class="welcome-message">
                        <div class="welcome-icon"><i class="fas fa-comments"></i></div>
                        <h3>Benvenuto nelle chat di TeachUp</h3>
                        <p>Seleziona una chat esistente dalla barra laterale o inizia una nuova conversazione.</p>
                    </div>
                `;
                chatInputContainer.style.display = 'none';
            })
            .catch(error => {
                console.error("Errore nell'annullamento della richiesta:", error);
                showToast('Errore durante l\'annullamento della richiesta');
            });
    }
}

// Toggle della sidebar (per mobile)
function toggleSidebar() {
    // Ottieni gli elementi
    const sidebar = document.querySelector('.sidebar');
    const chatContainer = document.querySelector('.chat-container');
    const toggleButton = document.querySelector('.sidebar-toggle');
    
    // Toggle della classe
    isSidebarVisible = !isSidebarVisible;
    
    if (isSidebarVisible) {
        sidebar.classList.remove('hidden');
        if (window.innerWidth <= 768) {
            chatContainer.classList.add('hidden-mobile');
        }
        toggleButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
    } else {
        sidebar.classList.add('hidden');
        chatContainer.classList.remove('hidden-mobile');
        toggleButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
    }
}
// TeachUp - Chat.js - Parte 4 (Gestione chat e messaggi)

// Seleziona una chat
function selectChat(chatId) {
    console.log("Seleziona chat:", chatId);
    
    // Trova la chat dall'array
    const selectedChat = chats.find(chat => chat.id === chatId);
    if (!selectedChat) {
        console.error("Chat non trovata:", chatId);
        return;
    }
    
    // Imposta la chat corrente
    currentChat = selectedChat;
    
    // Aggiorna le classi attive nella lista
    document.querySelectorAll('.chat-item').forEach(item => {
        if (item.dataset.chatId === chatId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    // Aggiorna l'header della chat
    updateChatHeader();
    
    // Carica i messaggi
    loadMessages(chatId);
    
    // Mostra l'input dei messaggi
    chatInputContainer.style.display = 'flex';
    
    // Pulisci eventuali allegati
    removeAttachmentFile();
    
    // Se c'è un messaggio non letto, marcalo come letto
    if (selectedChat.unreadBy && selectedChat.unreadBy.includes(currentUser.uid)) {
        markChatAsRead(chatId);
    }
    
    // Focus sull'input
    messageInput.focus();
    
    // Se si è in modalità mobile, nascondi la sidebar
    if (window.innerWidth <= 768) {
        toggleSidebar();
    }
}

// Aggiorna l'header della chat
function updateChatHeader() {
    if (!currentChat) {
        chatName.textContent = 'Seleziona una chat';
        chatStatus.textContent = '...';
        return;
    }
    
    // Per chat di gruppo
    if (currentChat.type === 'group') {
        chatName.textContent = currentChat.name || 'Chat di gruppo';
        
        // Mostra il numero di partecipanti
        const participantsCount = currentChat.participants ? currentChat.participants.length : 0;
        chatStatus.textContent = `${participantsCount} partecipanti`;
        
        // Aggiorna l'icona del menu della chat per mostrare opzioni di gruppo
        chatHeader.querySelector('.chat-menu-icon').innerHTML = `
            <button class="chat-menu-button" onclick="showChatMenu()">
                <i class="fas fa-ellipsis-v"></i>
            </button>
        `;
    } 
    // Per chat private
    else if (currentChat.type === 'private') {
        // Trova l'altro partecipante
        const otherParticipant = currentChat.participantsInfo.find(p => p.id !== currentUser.uid);
        
        // Costruisci il nome da visualizzare
        let displayName = 'Chat privata';
        if (otherParticipant) {
            if (otherParticipant.nome && otherParticipant.cognome) {
                displayName = `${otherParticipant.nome} ${otherParticipant.cognome}`;
            } else if (otherParticipant.nome) {
                displayName = otherParticipant.nome;
            } else {
                displayName = otherParticipant.email;
            }
        }
        
        chatName.textContent = displayName;
        
        // Se la chat è una richiesta in attesa
        if (currentChat.isRequest || currentChat.status === 'pending') {
            chatStatus.textContent = 'Richiesta in attesa';
        } else {
            chatStatus.textContent = 'Online'; // In una versione più avanzata, gestire lo stato online reale
        }
        
        // Aggiorna l'icona del menu della chat per mostrare opzioni private
        chatHeader.querySelector('.chat-menu-icon').innerHTML = `
            <button class="chat-menu-button" onclick="showChatMenu()">
                <i class="fas fa-ellipsis-v"></i>
            </button>
        `;
    }
}

// Carica i messaggi di una chat
function loadMessages(chatId) {
    // Mostra il loader
    chatMessages.innerHTML = `
        <div class="chat-loading">
            <div class="spinner"></div>
            <p>Caricamento messaggi...</p>
        </div>
    `;
    
    // Riferimento alla collezione di messaggi
    const messagesRef = db.collection('chats').doc(chatId)
        .collection('messages')
        .orderBy('timestamp', 'asc');
    
    // Ascolta in tempo reale i messaggi
    messagesRef.onSnapshot(snapshot => {
        // Se non ci sono messaggi
        if (snapshot.empty) {
            chatMessages.innerHTML = `
                <div class="chat-no-messages">
                    <div class="chat-no-messages-icon"><i class="fas fa-comments"></i></div>
                    <p>Nessun messaggio. Inizia la conversazione!</p>
                </div>
            `;
            return;
        }
        
        let messagesHTML = '';
        let lastDate = null;
        let lastSenderId = null;
        
        snapshot.forEach(doc => {
            const message = doc.data();
            
            // Verifica che il messaggio abbia un timestamp
            if (!message.timestamp) {
                console.warn('Messaggio senza timestamp:', doc.id);
                return;
            }
            
            // Converte il timestamp in data
            const messageDate = message.timestamp.toDate();
            
            // Formatta la data
            const formattedDate = formatDate(messageDate);
            
            // Se è un nuovo giorno, aggiungi un separatore di data
            if (lastDate !== formattedDate) {
                messagesHTML += `
                    <div class="message-date-separator">
                        <span>${formattedDate}</span>
                    </div>
                `;
                lastDate = formattedDate;
                lastSenderId = null; // Reset anche il sender per garantire avatar corretto
            }
            
            // Determina se il messaggio è dell'utente corrente
            const isCurrentUser = message.senderId === currentUser.uid;
            
            // Determina se mostrare l'avatar (solo per messaggi consecutivi di mittenti diversi)
            const showAvatar = message.senderId !== lastSenderId;
            lastSenderId = message.senderId;
            
            // Trova le info del mittente
            const sender = currentChat.participantsInfo.find(p => p.id === message.senderId);
            let senderName = 'Utente sconosciuto';
            let avatarInitial = 'U';
            
            if (sender) {
                if (sender.nome && sender.cognome) {
                    senderName = `${sender.nome} ${sender.cognome}`;
                } else if (sender.nome) {
                    senderName = sender.nome;
                } else {
                    senderName = sender.email.split('@')[0];
                }
                avatarInitial = (sender.nome || sender.email || 'U').charAt(0).toUpperCase();
            }
            
            // Ottieni l'orario formattato
            const messageTime = formatTime(messageDate);
            
            // Crea HTML del messaggio in base al tipo
            let messageContentHTML = '';
            
            if (message.type === 'text') {
                // Messaggio di testo normale
                messageContentHTML = `
                    <div class="message-text">${formatMessageText(message.content)}</div>
                `;
            } else if (message.type === 'image') {
                // Immagine
                messageContentHTML = `
                    <div class="message-image">
                        <img src="${message.fileUrl}" alt="Immagine" onclick="openImagePreview('${message.fileUrl}')">
                    </div>
                `;
            } else if (message.type === 'file') {
                // File (documento, PDF, ecc.)
                const fileName = message.fileName || 'File';
                messageContentHTML = `
                    <div class="message-file">
                        <div class="file-icon"><i class="fas fa-file"></i></div>
                        <div class="file-info">
                            <div class="file-name">${fileName}</div>
                            <div class="file-size">${formatFileSize(message.fileSize || 0)}</div>
                        </div>
                        <a href="${message.fileUrl}" target="_blank" class="file-download" title="Scarica">
                            <i class="fas fa-download"></i>
                        </a>
                    </div>
                `;
            } else if (message.type === 'system') {
                // Messaggio di sistema (es. "X ha aggiunto Y al gruppo")
                messagesHTML += `
                    <div class="message-system">
                        <div class="message-system-content">${message.content}</div>
                    </div>
                `;
                return; // Non aggiungere il codice standard del messaggio per i msg di sistema
            }
            
            // Assicurati che messageContentHTML non sia vuoto
            if (!messageContentHTML) {
                messageContentHTML = `<div class="message-text">Messaggio non supportato</div>`;
            }
            
            // Crea l'HTML completo del messaggio
            messagesHTML += `
                <div class="message ${isCurrentUser ? 'message-out' : 'message-in'}" data-message-id="${doc.id}">
                    ${showAvatar && !isCurrentUser ? `
                        <div class="message-avatar" title="${senderName}">
                            ${avatarInitial}
                        </div>
                    ` : `<div class="message-avatar-space"></div>`}
                    
                    <div class="message-content">
                        ${currentChat.type === 'group' && !isCurrentUser && showAvatar ? `
                            <div class="message-sender">${senderName}</div>
                        ` : ''}
                        
                        ${messageContentHTML}
                        
                        <div class="message-meta">
                            <span class="message-time">${messageTime}</span>
                            ${isCurrentUser ? `
                                <span class="message-status">
                                    <i class="fas fa-check"></i>
                                </span>
                            ` : ''}
                        </div>
                    </div>
                    
                    <div class="message-actions">
                        <button class="message-action-button" onclick="showMessageActions('${doc.id}')">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        
        // Aggiorna il DOM
        chatMessages.innerHTML = messagesHTML;
        
        // Scrolla in fondo
        scrollToBottom();
    }, error => {
        console.error("Errore nel caricamento dei messaggi:", error);
        chatMessages.innerHTML = `
            <div class="chat-error">
                <p>Errore nel caricamento dei messaggi. Riprova.</p>
            </div>
        `;
    });
}

// Formatta il testo del messaggio (aggiunge link clickabili, emoji, ecc.)
function formatMessageText(text) {
    if (!text) return '';
    
    // Converti i link in HTML
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    text = text.replace(urlRegex, url => `<a href="${url}" target="_blank">${url}</a>`);
    
    // Gestisci ritorno a capo
    text = text.replace(/\n/g, '<br>');
    
    return text;
}

// Scrolla la visualizzazione messaggi in fondo
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Formatta la dimensione del file in KB/MB
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Mostra menu azioni per un messaggio
function showMessageActions(messageId) {
    console.log("Mostra azioni per messaggio:", messageId);
    
    // Trova l'elemento del messaggio
    const messageElement = document.querySelector(`.message[data-message-id="${messageId}"]`);
    if (!messageElement) return;
    
    // Crea il menu
    const actionsMenu = document.createElement('div');
    actionsMenu.className = 'message-actions-menu';
    actionsMenu.innerHTML = `
        <button class="message-action-item" onclick="copyMessageText('${messageId}')">
            <i class="fas fa-copy"></i> Copia testo
        </button>
        <button class="message-action-item" onclick="forwardMessage('${messageId}')">
            <i class="fas fa-share"></i> Inoltra
        </button>
        <button class="message-action-item message-action-danger" onclick="deleteMessage('${messageId}')">
            <i class="fas fa-trash"></i> Elimina
        </button>
    `;
    
    // Aggiungi il menu al documento
    document.body.appendChild(actionsMenu);
    
    // Posiziona il menu vicino al messaggio
    const rect = messageElement.getBoundingClientRect();
    
    // Posiziona il menu a destra del messaggio per messaggi inviati, a sinistra per quelli ricevuti
    if (messageElement.classList.contains('message-out')) {
        // Messaggi inviati (a destra)
        actionsMenu.style.right = (window.innerWidth - rect.right + 10) + 'px';
    } else {
        // Messaggi ricevuti (a sinistra)
        actionsMenu.style.left = (rect.left + 10) + 'px';
    }
    actionsMenu.style.top = (rect.top + window.scrollY) + 'px';
    
    // Aggiungi event listener per chiudere il menu al click fuori
    function closeMenu(e) {
        if (!actionsMenu.contains(e.target) && 
            !messageElement.querySelector('.message-action-button').contains(e.target)) {
            actionsMenu.remove();
            document.removeEventListener('click', closeMenu);
        }
    }
    
    // Aggiungi un piccolo ritardo per evitare che il click corrente attivi subito il listener
    setTimeout(() => {
        document.addEventListener('click', closeMenu);
    }, 10);
}
// TeachUp - Chat.js - Parte 5 (Invio messaggi e gestione allegati)

// Invia un messaggio
function sendMessage() {
    // Verifica che ci sia una chat selezionata
    if (!currentChat) {
        showToast('Seleziona prima una chat');
        return;
    }
    
    // Ottieni il testo del messaggio
    const messageText = messageInput.value.trim();
    
    // Verifica che ci sia un messaggio o un allegato
    if (!messageText && !currentAttachment) {
        console.log("Nessun contenuto da inviare");
        return;
    }
    
    // Disabilita il pulsante di invio durante l'operazione
    sendButton.disabled = true;
    
    // Crea il messaggio base
    let message = {
        senderId: currentUser.uid,
        senderEmail: currentUser.email,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        read: false
    };
    
    // Promessa che risolverà dopo l'invio del messaggio
    let sendPromise;
    
    // Se c'è un allegato, caricalo
    if (currentAttachment) {
        sendPromise = uploadAttachment(message);
    } else {
        // Altrimenti, crea un messaggio di testo
        message.type = 'text';
        message.content = messageText;
        
        // Salva il messaggio nel database
        sendPromise = saveMessageToDatabase(message);
    }
    
    // Dopo l'invio
    sendPromise.then(() => {
        // Resetta l'input
        messageInput.value = '';
        messageInput.style.height = 'auto';
        sendButton.disabled = true;
        
        // Rimuovi eventuali allegati
        removeAttachmentFile();
        
        // Marca la chat come non letta per gli altri partecipanti
        updateUnreadStatus();
    }).catch(error => {
        console.error("Errore nell'invio del messaggio:", error);
        showToast('Errore nell\'invio del messaggio. Riprova.');
        sendButton.disabled = false;
    });
}

// Carica un allegato
function uploadAttachment(message) {
    return new Promise((resolve, reject) => {
        console.log("Caricamento allegato...");
        
        // Crea un riferimento allo storage per il file
        const storageRef = firebase.storage().ref();
        const fileRef = storageRef.child(`chats/${currentChat.id}/${Date.now()}_${currentAttachment.name}`);
        
        // Carica il file
        const uploadTask = fileRef.put(currentAttachment);
        
        // Gestisci lo stato di caricamento
        uploadTask.on('state_changed', 
            // Progresso
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                console.log('Caricamento: ' + progress.toFixed(1) + '%');
                
                // Aggiorna UI per mostrare il progresso
                previewContent.innerHTML = `
                    <div class="attachment-uploading">
                        <div class="upload-progress-bar">
                            <div class="upload-progress" style="width: ${progress}%"></div>
                        </div>
                        <div class="upload-percentage">${progress.toFixed(1)}%</div>
                    </div>
                `;
            }, 
            // Errore
            (error) => {
                console.error("Errore nel caricamento del file:", error);
                reject(error);
            }, 
            // Completato
            () => {
                console.log("Caricamento completato!");
                
                // Ottieni URL del file caricato
                uploadTask.snapshot.ref.getDownloadURL().then(downloadURL => {
                    console.log("File disponibile all'URL:", downloadURL);
                    
                    // Completa l'oggetto messaggio
                    if (currentAttachment.type.startsWith('image/')) {
                        message.type = 'image';
                    } else {
                        message.type = 'file';
                    }
                    
                    message.fileUrl = downloadURL;
                    message.fileName = currentAttachment.name;
                    message.fileSize = currentAttachment.size;
                    message.fileType = currentAttachment.type;
                    
                    // Aggiungi il messaggio di testo se presente
                    if (messageInput.value.trim()) {
                        message.content = messageInput.value.trim();
                    }
                    
                    // Salva il messaggio nel database
                    saveMessageToDatabase(message)
                        .then(resolve)
                        .catch(reject);
                }).catch(reject);
            }
        );
    });
}

// Salva un messaggio nel database
function saveMessageToDatabase(message) {
    return new Promise((resolve, reject) => {
        console.log("Salvataggio messaggio nel database...");
        
        // Riferimento alla collezione dei messaggi della chat
        const messagesRef = db.collection('chats').doc(currentChat.id).collection('messages');
        
        // Aggiungi un nuovo documento alla collezione
        messagesRef.add(message)
            .then(docRef => {
                console.log("Messaggio salvato con ID:", docRef.id);
                
                // Aggiorna l'ultimo messaggio nella chat
                const lastMessageUpdate = {
                    lastMessage: {
                        type: message.type,
                        content: message.content || '',
                        timestamp: message.timestamp,
                        senderId: message.senderId
                    }
                };
                
                // Se è un'immagine o un file, aggiorna il tipo dell'ultimo messaggio
                if (message.type === 'image') {
                    lastMessageUpdate.lastMessage.content = '🖼️ Immagine';
                } else if (message.type === 'file') {
                    lastMessageUpdate.lastMessage.content = '📎 File: ' + (message.fileName || 'Allegato');
                }
                
                // Aggiorna il documento della chat
                return db.collection('chats').doc(currentChat.id).update(lastMessageUpdate);
            })
            .then(() => {
                console.log("Ultimo messaggio della chat aggiornato");
                resolve();
            })
            .catch(error => {
                console.error("Errore nel salvataggio del messaggio:", error);
                reject(error);
            });
    });
}

// Marca una chat come letta per l'utente corrente
function markChatAsRead(chatId) {
    // Ottieni l'array degli utenti che non hanno ancora letto i messaggi
    db.collection('chats').doc(chatId).get()
        .then(doc => {
            if (doc.exists) {
                const chatData = doc.data();
                let unreadBy = chatData.unreadBy || [];
                
                // Rimuovi l'utente corrente dall'array
                unreadBy = unreadBy.filter(uid => uid !== currentUser.uid);
                
                // Aggiorna il documento
                return db.collection('chats').doc(chatId).update({ unreadBy });
            }
        })
        .catch(error => {
            console.error("Errore nel marcare la chat come letta:", error);
        });
}

// Aggiorna lo stato di non letto per gli altri partecipanti
function updateUnreadStatus() {
    // Ottieni tutti i partecipanti tranne l'utente corrente
    const otherParticipants = currentChat.participants.filter(uid => uid !== currentUser.uid);
    
    // Aggiorna lo stato non letto nella chat
    db.collection('chats').doc(currentChat.id).update({
        unreadBy: otherParticipants
    }).catch(error => {
        console.error("Errore nell'aggiornamento dello stato non letto:", error);
    });
}

// Gestione della selezione di file
function handleFileSelection(event) {
    const files = event.target.files;
    if (!files || files.length === 0) {
        return;
    }
    
    // Prendi il primo file selezionato
    const file = files[0];
    
    // Limita la dimensione del file a 10 MB
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
    
    if (file.size > MAX_FILE_SIZE) {
        showToast('Il file è troppo grande. Limite: 10 MB');
        fileInput.value = '';
        return;
    }
    
    // Salva l'allegato corrente
    currentAttachment = file;
    
    // Mostra l'anteprima
    attachmentPreview.style.display = 'flex';
    
    // Gestisci diversi tipi di file
    if (file.type.startsWith('image/')) {
        // È un'immagine, mostra l'anteprima
        const reader = new FileReader();
        reader.onload = function(e) {
            previewContent.innerHTML = `<img src="${e.target.result}" alt="Anteprima">`;
        };
        reader.readAsDataURL(file);
    } else {
        // Non è un'immagine, mostra un'icona generica
        let iconClass = 'fa-file';
        
        // Scegli l'icona in base all'estensione
        const extension = file.name.split('.').pop().toLowerCase();
        if (['pdf'].includes(extension)) {
            iconClass = 'fa-file-pdf';
        } else if (['doc', 'docx'].includes(extension)) {
            iconClass = 'fa-file-word';
        } else if (['xls', 'xlsx'].includes(extension)) {
            iconClass = 'fa-file-excel';
        } else if (['ppt', 'pptx'].includes(extension)) {
            iconClass = 'fa-file-powerpoint';
        } else if (['zip', 'rar', '7z'].includes(extension)) {
            iconClass = 'fa-file-archive';
        } else if (['txt', 'rtf'].includes(extension)) {
            iconClass = 'fa-file-alt';
        }
        
        previewContent.innerHTML = `
            <div class="file-preview">
                <div class="file-icon"><i class="fas ${iconClass}"></i></div>
                <div class="file-info">
                    <div class="file-name">${file.name}</div>
                    <div class="file-size">${formatFileSize(file.size)}</div>
                </div>
            </div>
        `;
    }
    
    // Abilita il pulsante di invio
    sendButton.disabled = false;
}

// Rimuovi un allegato
function removeAttachmentFile() {
    // Resetta l'allegato corrente
    currentAttachment = null;
    
    // Resetta il campo input
    fileInput.value = '';
    
    // Nascondi l'anteprima
    attachmentPreview.style.display = 'none';
    
    // Aggiorna lo stato del pulsante invio
    sendButton.disabled = messageInput.value.trim().length === 0;
}

// Ridimensiona automaticamente la textarea
function autoResizeTextarea() {
    messageInput.style.height = 'auto';
    messageInput.style.height = (messageInput.scrollHeight) + 'px';
    
    // Limita l'altezza massima
    const MAX_HEIGHT = 150;
    if (messageInput.scrollHeight > MAX_HEIGHT) {
        messageInput.style.height = MAX_HEIGHT + 'px';
        messageInput.style.overflowY = 'auto';
    } else {
        messageInput.style.overflowY = 'hidden';
    }
}

// Copia il testo di un messaggio
function copyMessageText(messageId) {
    // Trova il messaggio nella chat corrente
    db.collection('chats').doc(currentChat.id)
        .collection('messages').doc(messageId).get()
        .then(doc => {
            if (doc.exists) {
                const message = doc.data();
                if (message.type === 'text' && message.content) {
                    // Copia negli appunti
                    navigator.clipboard.writeText(message.content)
                        .then(() => showToast('Testo copiato negli appunti'))
                        .catch(err => {
                            console.error('Errore nella copia del testo:', err);
                            showToast('Impossibile copiare il testo');
                        });
                } else {
                    showToast('Nessun testo da copiare');
                }
            }
        })
        .catch(error => {
            console.error("Errore nel recupero del messaggio:", error);
            showToast('Errore nel recupero del messaggio');
        });
    
    // Chiudi il menu azioni
    document.querySelector('.message-actions-menu')?.remove();
}

// Inoltra un messaggio
function forwardMessage(messageId) {
    // Trova il messaggio nella chat corrente
    db.collection('chats').doc(currentChat.id)
        .collection('messages').doc(messageId).get()
        .then(doc => {
            if (doc.exists) {
                const message = doc.data();
                
                // TODO: Implementare la logica per inoltrare il messaggio
                console.log("Inoltro messaggio:", message);
                showToast('Funzionalità di inoltro non ancora implementata');
            }
        })
        .catch(error => {
            console.error("Errore nel recupero del messaggio:", error);
            showToast('Errore nel recupero del messaggio');
        });
    
    // Chiudi il menu azioni
    document.querySelector('.message-actions-menu')?.remove();
}

// Elimina un messaggio
function deleteMessage(messageId) {
    if (confirm('Sei sicuro di voler eliminare questo messaggio?')) {
        // Elimina il messaggio dal database
        db.collection('chats').doc(currentChat.id)
            .collection('messages').doc(messageId).delete()
            .then(() => {
                console.log("Messaggio eliminato:", messageId);
                showToast('Messaggio eliminato');
            })
            .catch(error => {
                console.error("Errore nell'eliminazione del messaggio:", error);
                showToast('Errore nell\'eliminazione del messaggio');
            });
    }
    
    // Chiudi il menu azioni
    document.querySelector('.message-actions-menu')?.remove();
}

// Apri un'anteprima immagine a schermo intero
function openImagePreview(imageUrl) {
    // Crea l'elemento di anteprima
    const preview = document.createElement('div');
    preview.className = 'fullscreen-preview';
    preview.innerHTML = `
        <div class="fullscreen-preview-overlay" onclick="closeImagePreview()"></div>
        <div class="fullscreen-preview-content">
            <img src="${imageUrl}" alt="Anteprima">
            <button class="fullscreen-preview-close" onclick="closeImagePreview()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    // Aggiungi al documento
    document.body.appendChild(preview);
    
    // Impedisci lo scroll del body
    document.body.style.overflow = 'hidden';
}

// Chiudi l'anteprima immagine
function closeImagePreview() {
    // Trova l'elemento di anteprima
    const preview = document.querySelector('.fullscreen-preview');
    if (preview) {
        preview.remove();
    }
    
    // Ripristina lo scroll del body
    document.body.style.overflow = '';
}
// TeachUp - Chat.js - Parte 6 (Creazione nuove chat e gruppi)

// Mostra il modal per nuova chat
function showNewChatModal() {
    console.log("Apertura modal nuova chat");
    
    // Mostra il modal
    const newChatModal = document.getElementById('newChatModal');
    newChatModal.style.display = 'flex';
    
    // Focus sull'input di ricerca
    userSearchInput.value = '';
    userSearchInput.focus();
    
    // Pulisci i risultati precedenti
    userSearchResults.innerHTML = '';
}

// Mostra il modal per nuova chat di gruppo
function showNewGroupModal() {
    console.log("Apertura modal nuova chat di gruppo");
    
    // Mostra il modal
    const newGroupModal = document.getElementById('newGroupModal');
    newGroupModal.style.display = 'flex';
    
    // Reset della selezione dei membri
    selectedGroupMembers = [];
    selectedMembersList.innerHTML = '';
    updateSelectedMembersCount();
    
    // Focus sull'input di ricerca
    groupMemberSearch.value = '';
    groupMemberSearch.focus();
    
    // Pulisci i risultati precedenti
    groupMemberSearchResults.innerHTML = '';
}

// Chiudi i modal
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Cerca utenti per nuova chat
function searchUsers() {
    const searchTerm = userSearchInput.value.trim();
    
    // Minimo 3 caratteri per la ricerca
    if (searchTerm.length < 3) {
        userSearchResults.innerHTML = '<div class="search-hint">Digita almeno 3 caratteri per cercare</div>';
        return;
    }
    
    userSearchResults.innerHTML = '<div class="search-loading"><div class="spinner"></div> Ricerca...</div>';
    
    // Cerca utenti via Firestore
    db.collection('utenti')
        .where('email', '>=', searchTerm)
        .where('email', '<=', searchTerm + '\uf8ff')
        .limit(10)
        .get()
        .then(querySnapshot => {
            // Alterna ricerca per email con ricerca per nome
            return Promise.all([
                querySnapshot,
                db.collection('utenti')
                    .where('nome', '>=', searchTerm)
                    .where('nome', '<=', searchTerm + '\uf8ff')
                    .limit(10)
                    .get()
            ]);
        })
        .then(([emailResults, nameResults]) => {
            // Combina i risultati evitando duplicati
            const users = new Map();
            
            // Aggiungi risultati dalla ricerca per email
            emailResults.forEach(doc => {
                users.set(doc.id, { id: doc.id, ...doc.data() });
            });
            
            // Aggiungi risultati dalla ricerca per nome
            nameResults.forEach(doc => {
                if (!users.has(doc.id)) {
                    users.set(doc.id, { id: doc.id, ...doc.data() });
                }
            });
            
            // Filtra l'utente corrente dai risultati
            users.delete(currentUser.uid);
            
            // Genera l'HTML dei risultati
            renderUserSearchResults(Array.from(users.values()));
        })
        .catch(error => {
            console.error("Errore nella ricerca utenti:", error);
            userSearchResults.innerHTML = '<div class="search-error">Errore nella ricerca. Riprova.</div>';
        });
}

// Renderizza i risultati della ricerca utenti
function renderUserSearchResults(users) {
    if (users.length === 0) {
        userSearchResults.innerHTML = '<div class="search-empty">Nessun utente trovato</div>';
        return;
    }
    
    let resultsHTML = '';
    
    users.forEach(user => {
        // Costruisci il nome da visualizzare
        let displayName = user.email || 'Utente';
        if (user.nome && user.cognome) {
            displayName = `${user.nome} ${user.cognome}`;
        } else if (user.nome) {
            displayName = user.nome;
        }
        
        // Controlla se esiste già una chat con questo utente
        const existingChat = chats.find(chat => 
            chat.type === 'private' && 
            chat.participants.includes(user.id) &&
            chat.participants.includes(currentUser.uid)
        );
        
        // Controlla se c'è già una richiesta di chat inviata
        const pendingRequest = sentChatRequests.find(request =>
            request.recipientId === user.id
        );
        
        // Determina lo stato e l'azione
        let actionButton = '';
        
        if (existingChat) {
            // Già esiste una chat con questo utente
            actionButton = `
                <button class="user-chat-button" onclick="selectChat('${existingChat.id}'); closeModal('newChatModal')">
                    <i class="fas fa-comments"></i> Apri chat
                </button>
            `;
        } else if (pendingRequest) {
            // C'è una richiesta pendente
            actionButton = `
                <button class="user-chat-button user-chat-pending" disabled>
                    <i class="fas fa-hourglass-half"></i> Richiesta inviata
                </button>
            `;
        } else {
            // Nessuna chat esistente o richiesta pendente
            actionButton = `
                <button class="user-chat-button" onclick="showSendRequestForm('${user.id}', '${user.email}', '${user.nome || ''}', '${user.cognome || ''}')">
                    <i class="fas fa-paper-plane"></i> Invia richiesta
                </button>
            `;
        }
        
        // Crea l'elemento del risultato
        resultsHTML += `
            <div class="user-search-result" data-user-id="${user.id}">
                <div class="user-avatar">
                    ${(user.nome || user.email || 'U').charAt(0).toUpperCase()}
                </div>
                <div class="user-info">
                    <div class="user-name">${displayName}</div>
                    <div class="user-email">${user.email}</div>
                </div>
                ${actionButton}
            </div>
        `;
    });
    
    // Aggiorna il DOM
    userSearchResults.innerHTML = resultsHTML;
}

// Mostra il form per inviare una richiesta di chat
function showSendRequestForm(userId, userEmail, userName, userCognome) {
    console.log("Mostra form richiesta chat per:", userId);
    
    // Costruisci il nome da visualizzare
    let displayName = userEmail;
    if (userName && userCognome) {
        displayName = `${userName} ${userCognome}`;
    } else if (userName) {
        displayName = userName;
    }
    
    // Aggiorna l'UI del modal
    document.getElementById('newChatModalContent').innerHTML = `
        <div class="modal-header">
            <h3>Invia richiesta di chat</h3>
            <button class="modal-close" onclick="closeModal('newChatModal')">&times;</button>
        </div>
        <div class="modal-body">
            <div class="request-form">
                <div class="request-recipient">
                    <div class="recipient-avatar">
                        ${(userName || userEmail || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div class="recipient-info">
                        <div class="recipient-name">${displayName}</div>
                        <div class="recipient-email">${userEmail}</div>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="requestMessage">Messaggio (opzionale)</label>
                    <textarea id="requestMessage" placeholder="Scrivi un messaggio introduttivo..." rows="3"></textarea>
                </div>
                
                <div class="form-actions">
                    <button class="btn-secondary" onclick="showNewChatModal()">
                        <i class="fas fa-arrow-left"></i> Indietro
                    </button>
                    <button class="btn-primary" id="sendChatRequestBtn" onclick="sendChatRequest('${userId}', '${userEmail}', '${userName}', '${userCognome}')">
                        <i class="fas fa-paper-plane"></i> Invia richiesta
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Invia una richiesta di chat
function sendChatRequest(recipientId, recipientEmail, recipientNome, recipientCognome) {
    console.log("Invio richiesta chat a:", recipientId);
    
    // Disabilita il pulsante durante l'operazione
    const sendButton = document.getElementById('sendChatRequestBtn');
    sendButton.disabled = true;
    sendButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Invio...';
    
    // Ottieni il messaggio della richiesta
    const requestMessage = document.getElementById('requestMessage').value.trim();
    
    // Crea l'oggetto richiesta
    const chatRequest = {
        senderId: currentUser.uid,
        senderEmail: currentUser.email,
        senderNome: currentUser.displayName ? currentUser.displayName.split(' ')[0] : '',
        senderCognome: currentUser.displayName ? currentUser.displayName.split(' ').slice(1).join(' ') : '',
        recipientId: recipientId,
        recipientEmail: recipientEmail,
        recipientNome: recipientNome,
        recipientCognome: recipientCognome,
        message: requestMessage,
        status: 'pending',
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Salva la richiesta su Firestore
    db.collection('chatRequests').add(chatRequest)
        .then(docRef => {
            console.log("Richiesta di chat inviata con ID:", docRef.id);
            
            // Mostra conferma
            showToast('Richiesta di chat inviata');
            
            // Chiudi il modal
            closeModal('newChatModal');
        })
        .catch(error => {
            console.error("Errore nell'invio della richiesta:", error);
            showToast('Errore nell\'invio della richiesta');
            
            // Riabilita il pulsante
            sendButton.disabled = false;
            sendButton.innerHTML = '<i class="fas fa-paper-plane"></i> Invia richiesta';
        });
}

// Accetta una richiesta di chat
function acceptChatRequest(requestId) {
    console.log("Accettazione richiesta:", requestId);
    
    // Trova la richiesta
    const request = pendingChatRequests.find(r => r.id === requestId);
    if (!request) {
        console.error("Richiesta non trovata:", requestId);
        return;
    }
    
    // Disabilita temporaneamente il pulsante
    const buttonElement = document.querySelector(`.chat-request-item[data-request-id="${requestId}"] .chat-request-accept`);
    if (buttonElement) {
        buttonElement.disabled = true;
        buttonElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    }
    
    // Aggiorna lo stato della richiesta
    db.collection('chatRequests').doc(requestId).update({
        status: 'accepted',
        acceptedAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        console.log("Richiesta accettata, creazione chat...");
        
        // Crea una nuova chat privata
        return createPrivateChat(request);
    })
    .then(chatId => {
        console.log("Chat creata con ID:", chatId);
        showToast('Richiesta accettata e chat creata');
        
        // Seleziona la nuova chat
        selectChat(chatId);
    })
    .catch(error => {
        console.error("Errore nell'accettazione della richiesta:", error);
        showToast('Errore nell\'accettazione della richiesta');
        
        // Riabilita il pulsante
        if (buttonElement) {
            buttonElement.disabled = false;
            buttonElement.innerHTML = '<i class="fas fa-check"></i>';
        }
    });
}

// Crea una chat privata
function createPrivateChat(request) {
    return new Promise((resolve, reject) => {
        // Crea i dati della chat
        const chatData = {
            type: 'private',
            participants: [request.senderId, request.recipientId],
            participantsInfo: [
                {
                    id: request.senderId,
                    email: request.senderEmail,
                    nome: request.senderNome || '',
                    cognome: request.senderCognome || ''
                },
                {
                    id: request.recipientId,
                    email: request.recipientEmail || '',
                    nome: currentUser.displayName ? currentUser.displayName.split(' ')[0] : '',
                    cognome: currentUser.displayName ? currentUser.displayName.split(' ').slice(1).join(' ') : ''
                }
            ],
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastActivity: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Crea la chat su Firestore
        db.collection('chats').add(chatData)
            .then(docRef => {
                // Se c'era un messaggio nella richiesta, aggiungilo come primo messaggio
                if (request.message && request.message.trim()) {
                    // Crea il messaggio
                    const firstMessage = {
                        type: 'text',
                        content: request.message,
                        senderId: request.senderId,
                        senderEmail: request.senderEmail,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                        read: false
                    };
                    
                    // Aggiungi il messaggio alla collezione
                    return db.collection('chats').doc(docRef.id)
                        .collection('messages').add(firstMessage)
                        .then(() => {
                            // Aggiorna l'ultimo messaggio nella chat
                            return db.collection('chats').doc(docRef.id).update({
                                lastMessage: {
                                    type: 'text',
                                    content: request.message,
                                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                                    senderId: request.senderId
                                },
                                unreadBy: [request.recipientId] // Il destinatario non ha ancora letto il messaggio
                            });
                        })
                        .then(() => docRef.id);
                }
                
                // Nessun messaggio, ritorna semplicemente l'ID della chat
                return docRef.id;
            })
            .then(resolve)
            .catch(reject);
    });
}

// Rifiuta una richiesta di chat
function rejectChatRequest(requestId) {
    console.log("Rifiuto richiesta:", requestId);
    
    if (confirm('Sei sicuro di voler rifiutare questa richiesta di chat?')) {
        // Disabilita temporaneamente il pulsante
        const buttonElement = document.querySelector(`.chat-request-item[data-request-id="${requestId}"] .chat-request-reject`);
        if (buttonElement) {
            buttonElement.disabled = true;
            buttonElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        }
        
        // Aggiorna lo stato della richiesta
        db.collection('chatRequests').doc(requestId).update({
            status: 'rejected',
            rejectedAt: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(() => {
            console.log("Richiesta rifiutata");
            showToast('Richiesta di chat rifiutata');
        })
        .catch(error => {
            console.error("Errore nel rifiuto della richiesta:", error);
            showToast('Errore nel rifiuto della richiesta');
            
            // Riabilita il pulsante
            if (buttonElement) {
                buttonElement.disabled = false;
                buttonElement.innerHTML = '<i class="fas fa-times"></i>';
            }
        });
    }
}
// TeachUp - Chat.js - Parte 7 (Gestione gruppi)

// Cerca utenti per chat di gruppo
function searchUsersForGroup() {
    const searchTerm = groupMemberSearch.value.trim();
    
    // Minimo 3 caratteri per la ricerca
    if (searchTerm.length < 3) {
        groupMemberSearchResults.innerHTML = '<div class="search-hint">Digita almeno 3 caratteri per cercare</div>';
        return;
    }
    
    groupMemberSearchResults.innerHTML = '<div class="search-loading"><div class="spinner"></div> Ricerca...</div>';
    
    // Cerca utenti via Firestore
    db.collection('utenti')
        .where('email', '>=', searchTerm)
        .where('email', '<=', searchTerm + '\uf8ff')
        .limit(10)
        .get()
        .then(querySnapshot => {
            // Alterna ricerca per email con ricerca per nome
            return Promise.all([
                querySnapshot,
                db.collection('utenti')
                    .where('nome', '>=', searchTerm)
                    .where('nome', '<=', searchTerm + '\uf8ff')
                    .limit(10)
                    .get()
            ]);
        })
        .then(([emailResults, nameResults]) => {
            // Combina i risultati evitando duplicati
            const users = new Map();
            
            // Aggiungi risultati dalla ricerca per email
            emailResults.forEach(doc => {
                users.set(doc.id, { id: doc.id, ...doc.data() });
            });
            
            // Aggiungi risultati dalla ricerca per nome
            nameResults.forEach(doc => {
                if (!users.has(doc.id)) {
                    users.set(doc.id, { id: doc.id, ...doc.data() });
                }
            });
            
            // Filtra l'utente corrente dai risultati
            users.delete(currentUser.uid);
            
            // Genera l'HTML dei risultati
            renderGroupMemberSearchResults(Array.from(users.values()));
        })
        .catch(error => {
            console.error("Errore nella ricerca utenti:", error);
            groupMemberSearchResults.innerHTML = '<div class="search-error">Errore nella ricerca. Riprova.</div>';
        });
}

// Renderizza i risultati della ricerca membri per gruppo
function renderGroupMemberSearchResults(users) {
    if (users.length === 0) {
        groupMemberSearchResults.innerHTML = '<div class="search-empty">Nessun utente trovato</div>';
        return;
    }
    
    let resultsHTML = '';
    
    users.forEach(user => {
        // Costruisci il nome da visualizzare
        let displayName = user.email || 'Utente';
        if (user.nome && user.cognome) {
            displayName = `${user.nome} ${user.cognome}`;
        } else if (user.nome) {
            displayName = user.nome;
        }
        
        // Controlla se l'utente è già stato selezionato
        const isSelected = selectedGroupMembers.some(m => m.id === user.id);
        
        // Determina l'azione
        let actionButton = '';
        
        if (isSelected) {
            // Già selezionato
            actionButton = `
                <button class="user-group-button user-group-selected" onclick="removeGroupMember('${user.id}')">
                    <i class="fas fa-check"></i> Selezionato
                </button>
            `;
        } else {
            // Non selezionato
            actionButton = `
                <button class="user-group-button" onclick="addGroupMember('${user.id}', '${user.email}', '${user.nome || ''}', '${user.cognome || ''}')">
                    <i class="fas fa-plus"></i> Aggiungi
                </button>
            `;
        }
        
        // Crea l'elemento del risultato
        resultsHTML += `
            <div class="user-search-result" data-user-id="${user.id}">
                <div class="user-avatar">
                    ${(user.nome || user.email || 'U').charAt(0).toUpperCase()}
                </div>
                <div class="user-info">
                    <div class="user-name">${displayName}</div>
                    <div class="user-email">${user.email}</div>
                </div>
                ${actionButton}
            </div>
        `;
    });
    
    // Aggiorna il DOM
    groupMemberSearchResults.innerHTML = resultsHTML;
}

// Aggiungi un membro al gruppo
function addGroupMember(userId, userEmail, userName, userCognome) {
    console.log("Aggiunta membro al gruppo:", userId);
    
    // Controlla se l'utente è già stato selezionato
    if (selectedGroupMembers.some(m => m.id === userId)) {
        showToast('Utente già aggiunto al gruppo');
        return;
    }
    
    // Aggiungi l'utente alla lista
    selectedGroupMembers.push({
        id: userId,
        email: userEmail,
        nome: userName,
        cognome: userCognome
    });
    
    // Aggiorna l'UI
    updateSelectedMembersList();
    updateSelectedMembersCount();
    
    // Aggiorna i pulsanti nei risultati di ricerca
    renderGroupMemberSearchResults(Array.from(document.querySelectorAll('.user-search-result'))
        .map(el => ({
            id: el.dataset.userId,
            email: el.querySelector('.user-email').textContent,
            nome: el.querySelector('.user-name').textContent
        })));
}

// Rimuovi un membro dal gruppo
function removeGroupMember(userId) {
    console.log("Rimozione membro dal gruppo:", userId);
    
    // Rimuovi l'utente dalla lista
    selectedGroupMembers = selectedGroupMembers.filter(m => m.id !== userId);
    
    // Aggiorna l'UI
    updateSelectedMembersList();
    updateSelectedMembersCount();
    
    // Aggiorna i pulsanti nei risultati di ricerca
    renderGroupMemberSearchResults(Array.from(document.querySelectorAll('.user-search-result'))
        .map(el => ({
            id: el.dataset.userId,
            email: el.querySelector('.user-email').textContent,
            nome: el.querySelector('.user-name').textContent
        })));
}

// Aggiorna la lista dei membri selezionati
function updateSelectedMembersList() {
    let membersHTML = '';
    
    selectedGroupMembers.forEach(member => {
        // Costruisci il nome da visualizzare
        let displayName = member.email || 'Utente';
        if (member.nome && member.cognome) {
            displayName = `${member.nome} ${member.cognome}`;
        } else if (member.nome) {
            displayName = member.nome;
        }
        
        membersHTML += `
            <div class="selected-member" data-user-id="${member.id}">
                <div class="member-avatar">
                    ${(member.nome || member.email || 'U').charAt(0).toUpperCase()}
                </div>
                <div class="member-info">
                    <div class="member-name">${displayName}</div>
                </div>
                <button class="member-remove" onclick="removeGroupMember('${member.id}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    });
    
    // Aggiorna il DOM
    selectedMembersList.innerHTML = membersHTML;
}

// Aggiorna il contatore dei membri selezionati
function updateSelectedMembersCount() {
    const count = selectedGroupMembers.length;
    selectedMembersCount.textContent = count === 1 ? '1 membro selezionato' : `${count} membri selezionati`;
    
    // Aggiorna lo stato del pulsante di creazione gruppo
    createGroupButton.disabled = count === 0;
}

// Crea un nuovo gruppo
function createGroup() {
    // Verifica che ci sia almeno un membro selezionato
    if (selectedGroupMembers.length === 0) {
        showToast('Seleziona almeno un membro per il gruppo');
        return;
    }
    
    // Ottieni il nome del gruppo e il messaggio iniziale
    const groupName = document.getElementById('groupName').value.trim();
    const initialMessageText = initialMessage.value.trim();
    
    // Verifica che ci sia un nome per il gruppo
    if (!groupName) {
        showToast('Inserisci un nome per il gruppo');
        document.getElementById('groupName').focus();
        return;
    }
    
    // Disabilita il pulsante durante l'operazione
    createGroupButton.disabled = true;
    createGroupButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creazione...';
    
    // Prepara i partecipanti (includi l'utente corrente)
    const participants = [currentUser.uid, ...selectedGroupMembers.map(m => m.id)];
    
    // Prepara le info dei partecipanti
    const participantsInfo = [
        {
            id: currentUser.uid,
            email: currentUser.email,
            nome: currentUser.displayName ? currentUser.displayName.split(' ')[0] : '',
            cognome: currentUser.displayName ? currentUser.displayName.split(' ').slice(1).join(' ') : ''
        },
        ...selectedGroupMembers
    ];
    
    // Crea i dati del gruppo
    const groupData = {
        type: 'group',
        name: groupName,
        participants: participants,
        participantsInfo: participantsInfo,
        createdBy: currentUser.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastActivity: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Crea il gruppo su Firestore
    db.collection('chats').add(groupData)
        .then(docRef => {
            console.log("Gruppo creato con ID:", docRef.id);
            
            // Se c'è un messaggio iniziale, aggiungilo
            if (initialMessageText) {
                // Crea il messaggio
                const firstMessage = {
                    type: 'text',
                    content: initialMessageText,
                    senderId: currentUser.uid,
                    senderEmail: currentUser.email,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    read: false
                };
                
                // Aggiungi il messaggio alla collezione
                return db.collection('chats').doc(docRef.id)
                    .collection('messages').add(firstMessage)
                    .then(() => {
                        // Aggiungi anche un messaggio di sistema per la creazione del gruppo
                        const systemMessage = {
                            type: 'system',
                            content: `${currentUser.displayName || currentUser.email} ha creato il gruppo`,
                            timestamp: firebase.firestore.FieldValue.serverTimestamp()
                        };
                        
                        return db.collection('chats').doc(docRef.id)
                            .collection('messages').add(systemMessage);
                    })
                    .then(() => {
                        // Aggiorna l'ultimo messaggio nella chat
                        return db.collection('chats').doc(docRef.id).update({
                            lastMessage: {
                                type: 'text',
                                content: initialMessageText,
                                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                                senderId: currentUser.uid
                            },
                            // Imposta tutti i partecipanti tranne il creatore come non avendo letto il messaggio
                            unreadBy: participants.filter(id => id !== currentUser.uid)
                        });
                    })
                    .then(() => docRef.id);
            } else {
                // Aggiungi solo un messaggio di sistema per la creazione del gruppo
                const systemMessage = {
                    type: 'system',
                    content: `${currentUser.displayName || currentUser.email} ha creato il gruppo`,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                return db.collection('chats').doc(docRef.id)
                    .collection('messages').add(systemMessage)
                    .then(() => {
                        // Aggiorna l'ultimo messaggio nella chat
                        return db.collection('chats').doc(docRef.id).update({
                            lastMessage: {
                                type: 'system',
                                content: `${currentUser.displayName || currentUser.email} ha creato il gruppo`,
                                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                                senderId: currentUser.uid
                            },
                            // Imposta tutti i partecipanti tranne il creatore come non avendo letto il messaggio
                            unreadBy: participants.filter(id => id !== currentUser.uid)
                        });
                    })
                    .then(() => docRef.id);
            }
        })
        .then(chatId => {
            console.log("Gruppo completamente inizializzato:", chatId);
            showToast('Gruppo creato con successo');
            
            // Chiudi il modal
            closeModal('newGroupModal');
            
            // Seleziona la nuova chat di gruppo
            selectChat(chatId);
            
            // Reset
            selectedGroupMembers = [];
        })
        .catch(error => {
            console.error("Errore nella creazione del gruppo:", error);
            showToast('Errore nella creazione del gruppo');
            
            // Riabilita il pulsante
            createGroupButton.disabled = false;
            createGroupButton.innerHTML = '<i class="fas fa-users"></i> Crea gruppo';
        });
}

// Mostra il menu della chat
function showChatMenu() {
    console.log("Mostra menu chat");
    
    // Verifica che ci sia una chat selezionata
    if (!currentChat) return;
    
    // Trova il pulsante del menu
    const menuButton = document.querySelector('.chat-menu-button');
    if (!menuButton) return;
    
    // Crea il menu
    const chatMenu = document.createElement('div');
    chatMenu.className = 'chat-menu';
    
    // Determina le opzioni del menu in base al tipo di chat
    let menuOptions = '';
    
    if (currentChat.type === 'group') {
        // Opzioni per chat di gruppo
        menuOptions = `
            <button class="chat-menu-item" onclick="showGroupInfo()">
                <i class="fas fa-info-circle"></i> Info gruppo
            </button>
            <button class="chat-menu-item" onclick="showAddMemberToGroup()">
                <i class="fas fa-user-plus"></i> Aggiungi membro
            </button>
            ${currentChat.createdBy === currentUser.uid ? `
                <button class="chat-menu-item" onclick="renameGroup()">
                    <i class="fas fa-edit"></i> Rinomina gruppo
                </button>
                <button class="chat-menu-item chat-menu-danger" onclick="deleteGroup()">
                    <i class="fas fa-trash"></i> Elimina gruppo
                </button>
            ` : `
                <button class="chat-menu-item chat-menu-danger" onclick="leaveGroup()">
                    <i class="fas fa-sign-out-alt"></i> Esci dal gruppo
                </button>
            `}
        `;
    } else {
        // Opzioni per chat private
        menuOptions = `
            <button class="chat-menu-item" onclick="clearChat()">
                <i class="fas fa-eraser"></i> Cancella chat
            </button>
            <button class="chat-menu-item chat-menu-danger" onclick="deleteChat()">
                <i class="fas fa-trash"></i> Elimina chat
            </button>
        `;
    }
    
    // Imposta il contenuto del menu
    chatMenu.innerHTML = menuOptions;
    
    // Aggiungi il menu al documento
    document.body.appendChild(chatMenu);
    
    // Posiziona il menu vicino al pulsante
    const rect = menuButton.getBoundingClientRect();
    chatMenu.style.top = (rect.bottom + 10) + 'px';
    chatMenu.style.right = (window.innerWidth - rect.right) + 'px';
    
    // Aggiungi event listener per chiudere il menu al click fuori
    function closeMenu(e) {
        if (!chatMenu.contains(e.target) && !menuButton.contains(e.target)) {
            chatMenu.remove();
            document.removeEventListener('click', closeMenu);
        }
    }
    
    // Aggiungi un piccolo ritardo per evitare che il click corrente attivi subito il listener
    setTimeout(() => {
        document.addEventListener('click', closeMenu);
    }, 10);
}

// Mostra le informazioni del gruppo
function showGroupInfo() {
    console.log("Mostra info gruppo");
    
    // Verifica che ci sia una chat di gruppo selezionata
    if (!currentChat || currentChat.type !== 'group') return;
    
    // Crea il modal
    const infoModal = document.createElement('div');
    infoModal.className = 'modal';
    infoModal.id = 'groupInfoModal';
    
    // Calcola la data di creazione
    const createdAt = currentChat.createdAt ? currentChat.createdAt.toDate() : new Date();
    const createdDate = formatDate(createdAt);
    
    // Trova il creatore
    const creator = currentChat.participantsInfo.find(p => p.id === currentChat.createdBy);
    const creatorName = creator ? 
        (creator.nome && creator.cognome ? `${creator.nome} ${creator.cognome}` : 
            (creator.nome || creator.email)) : 
        'Sconosciuto';
    
    // Genera l'HTML della lista membri
    let membersHTML = '';
    currentChat.participantsInfo.forEach(member => {
        // Costruisci il nome da visualizzare
        let displayName = member.email || 'Utente';
        if (member.nome && member.cognome) {
            displayName = `${member.nome} ${member.cognome}`;
        } else if (member.nome) {
            displayName = member.nome;
        }
        
        // Verifica se è il creatore o l'utente corrente
        const isCreator = member.id === currentChat.createdBy;
        const isCurrentUser = member.id === currentUser.uid;
        
        membersHTML += `
            <div class="group-member-item">
                <div class="member-avatar">
                    ${(member.nome || member.email || 'U').charAt(0).toUpperCase()}
                </div>
                <div class="member-info">
                    <div class="member-name">${displayName} ${isCurrentUser ? '(Tu)' : ''}</div>
                    ${isCreator ? '<div class="member-role">Creatore</div>' : ''}
                </div>
                ${isCreator || isCurrentUser ? '' : `
                    <button class="member-action" onclick="removeMemberFromGroup('${member.id}')">
                        <i class="fas fa-times"></i>
                    </button>
                `}
            </div>
        `;
    });
    
    // Imposta il contenuto del modal
    infoModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Informazioni gruppo</h3>
                <button class="modal-close" onclick="document.getElementById('groupInfoModal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="group-info-section">
                    <h4>Nome</h4>
                    <p>${currentChat.name}</p>
                </div>
                <div class="group-info-section">
                    <h4>Creato da</h4>
                    <p>${creatorName} il ${createdDate}</p>
                </div>
                <div class="group-info-section">
                    <h4>Partecipanti (${currentChat.participants.length})</h4>
                    <div class="group-members-list">
                        ${membersHTML}
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" onclick="document.getElementById('groupInfoModal').remove()">
                    Chiudi
                </button>
                ${currentChat.createdBy === currentUser.uid ? `
                    <button class="btn-primary" onclick="document.getElementById('groupInfoModal').remove(); showAddMemberToGroup()">
                        <i class="fas fa-user-plus"></i> Aggiungi membri
                    </button>
                ` : ''}
            </div>
        </div>
    `;
    
    // Aggiungi il modal al documento
    document.body.appendChild(infoModal);
}
// TeachUp - Chat.js - Parte 8 (Gestione chat e funzioni di utilità)

// Rinomina gruppo
function renameGroup() {
    // Verifica che ci sia una chat di gruppo selezionata
    if (!currentChat || currentChat.type !== 'group') return;
    
    // Verifica che l'utente corrente sia il creatore del gruppo
    if (currentChat.createdBy !== currentUser.uid) {
        showToast('Solo il creatore del gruppo può rinominarlo');
        return;
    }
    
    // Chiedi il nuovo nome
    const newName = prompt('Inserisci il nuovo nome del gruppo:', currentChat.name);
    
    // Verifica che sia stato inserito un nome valido
    if (!newName || newName.trim() === '') return;
    
    // Aggiorna il nome del gruppo
    db.collection('chats').doc(currentChat.id).update({
        name: newName.trim()
    })
    .then(() => {
        console.log("Gruppo rinominato:", newName);
        showToast('Gruppo rinominato');
        
        // Aggiungi un messaggio di sistema
        const systemMessage = {
            type: 'system',
            content: `${currentUser.displayName || currentUser.email} ha rinominato il gruppo in "${newName.trim()}"`,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        return db.collection('chats').doc(currentChat.id)
            .collection('messages').add(systemMessage);
    })
    .then(() => {
        // Aggiorna l'ultimo messaggio nella chat
        return db.collection('chats').doc(currentChat.id).update({
            lastMessage: {
                type: 'system',
                content: `${currentUser.displayName || currentUser.email} ha rinominato il gruppo in "${newName.trim()}"`,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                senderId: currentUser.uid
            }
        });
    })
    .catch(error => {
        console.error("Errore nel rinominare il gruppo:", error);
        showToast('Errore nel rinominare il gruppo');
    });
}

// Elimina gruppo
function deleteGroup() {
    // Verifica che ci sia una chat di gruppo selezionata
    if (!currentChat || currentChat.type !== 'group') return;
    
    // Verifica che l'utente corrente sia il creatore del gruppo
    if (currentChat.createdBy !== currentUser.uid) {
        showToast('Solo il creatore del gruppo può eliminarlo');
        return;
    }
    
    // Chiedi conferma
    if (confirm(`Sei sicuro di voler eliminare il gruppo "${currentChat.name}"? Questa azione non può essere annullata.`)) {
        // Rimuovi prima tutti i messaggi
        const messagesRef = db.collection('chats').doc(currentChat.id).collection('messages');
        
        // Ottieni tutti i messaggi
        messagesRef.get()
            .then(snapshot => {
                // Crea un batch per eliminare i messaggi in blocco
                const batch = db.batch();
                
                // Aggiungi l'eliminazione di ogni messaggio al batch
                snapshot.forEach(doc => {
                    batch.delete(messagesRef.doc(doc.id));
                });
                
                // Esegui il batch
                return batch.commit();
            })
            .then(() => {
                // Dopo aver eliminato i messaggi, elimina la chat
                return db.collection('chats').doc(currentChat.id).delete();
            })
            .then(() => {
                console.log("Gruppo eliminato:", currentChat.id);
                showToast('Gruppo eliminato');
                
                // Resetta la chat corrente
                currentChat = null;
                
                // Aggiorna l'UI
                chatName.textContent = 'Seleziona una chat';
                chatStatus.textContent = '...';
                chatMessages.innerHTML = `
                    <div class="welcome-message">
                        <div class="welcome-icon"><i class="fas fa-comments"></i></div>
                        <h3>Benvenuto nelle chat di TeachUp</h3>
                        <p>Seleziona una chat esistente dalla barra laterale o inizia una nuova conversazione.</p>
                    </div>
                `;
                chatInputContainer.style.display = 'none';
            })
            .catch(error => {
                console.error("Errore nell'eliminazione del gruppo:", error);
                showToast('Errore nell\'eliminazione del gruppo');
            });
    }
}

// Esci dal gruppo
function leaveGroup() {
    // Verifica che ci sia una chat di gruppo selezionata
    if (!currentChat || currentChat.type !== 'group') return;
    
    // Chiedi conferma
    if (confirm(`Sei sicuro di voler uscire dal gruppo "${currentChat.name}"?`)) {
        // Rimuovi l'utente dai partecipanti
        const updatedParticipants = currentChat.participants.filter(uid => uid !== currentUser.uid);
        const updatedParticipantsInfo = currentChat.participantsInfo.filter(p => p.id !== currentUser.uid);
        
        // Aggiorna il documento della chat
        db.collection('chats').doc(currentChat.id).update({
            participants: updatedParticipants,
            participantsInfo: updatedParticipantsInfo
        })
        .then(() => {
            console.log("Uscita dal gruppo:", currentChat.id);
            
            // Aggiungi un messaggio di sistema
            const systemMessage = {
                type: 'system',
                content: `${currentUser.displayName || currentUser.email} è uscito dal gruppo`,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            return db.collection('chats').doc(currentChat.id)
                .collection('messages').add(systemMessage);
        })
        .then(() => {
            // Aggiorna l'ultimo messaggio nella chat
            return db.collection('chats').doc(currentChat.id).update({
                lastMessage: {
                    type: 'system',
                    content: `${currentUser.displayName || currentUser.email} è uscito dal gruppo`,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    senderId: currentUser.uid
                }
            });
        })
        .then(() => {
            showToast('Sei uscito dal gruppo');
            
            // Resetta la chat corrente
            currentChat = null;
            
            // Aggiorna l'UI
            chatName.textContent = 'Seleziona una chat';
            chatStatus.textContent = '...';
            chatMessages.innerHTML = `
                <div class="welcome-message">
                    <div class="welcome-icon"><i class="fas fa-comments"></i></div>
                    <h3>Benvenuto nelle chat di TeachUp</h3>
                    <p>Seleziona una chat esistente dalla barra laterale o inizia una nuova conversazione.</p>
                </div>
            `;
            chatInputContainer.style.display = 'none';
        })
        .catch(error => {
            console.error("Errore nell'uscita dal gruppo:", error);
            showToast('Errore nell\'uscita dal gruppo');
        });
    }
}

// Mostra form per aggiungere membro al gruppo
function showAddMemberToGroup() {
    // Verifica che ci sia una chat di gruppo selezionata
    if (!currentChat || currentChat.type !== 'group') return;
    
    // Verifica che l'utente corrente sia il creatore o un membro del gruppo
    if (!currentChat.participants.includes(currentUser.uid)) {
        showToast('Solo i membri del gruppo possono aggiungere nuovi partecipanti');
        return;
    }
    
    // TODO: Implementare l'UI per aggiungere membri al gruppo
    showToast('Funzionalità di aggiunta membri non ancora implementata');
}

// Cancella una chat (senza eliminare la conversazione)
function clearChat() {
    // Verifica che ci sia una chat selezionata
    if (!currentChat) return;
    
    // Chiedi conferma
    if (confirm('Sei sicuro di voler cancellare tutti i messaggi? Questa azione non può essere annullata.')) {
        // Rimuovi tutti i messaggi
        const messagesRef = db.collection('chats').doc(currentChat.id).collection('messages');
        
        // Ottieni tutti i messaggi
        messagesRef.get()
            .then(snapshot => {
                // Crea un batch per eliminare i messaggi in blocco
                const batch = db.batch();
                
                // Aggiungi l'eliminazione di ogni messaggio al batch
                snapshot.forEach(doc => {
                    batch.delete(messagesRef.doc(doc.id));
                });
                
                // Esegui il batch
                return batch.commit();
            })
            .then(() => {
                console.log("Chat cancellata:", currentChat.id);
                showToast('Chat cancellata');
                
                // Aggiungi un messaggio di sistema
                const systemMessage = {
                    type: 'system',
                    content: 'Chat cancellata',
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                return db.collection('chats').doc(currentChat.id)
                    .collection('messages').add(systemMessage);
            })
            .then(() => {
                // Aggiorna l'ultimo messaggio nella chat
                return db.collection('chats').doc(currentChat.id).update({
                    lastMessage: {
                        type: 'system',
                        content: 'Chat cancellata',
                        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                        senderId: currentUser.uid
                    }
                });
            })
            .then(() => {
                // Ricarica i messaggi
                loadMessages(currentChat.id);
            })
            .catch(error => {
                console.error("Errore nella cancellazione della chat:", error);
                showToast('Errore nella cancellazione della chat');
            });
    }
}

// Elimina una chat privata
function deleteChat() {
    // Verifica che ci sia una chat selezionata
    if (!currentChat) return;
    
    // Chiedi conferma
    if (confirm('Sei sicuro di voler eliminare questa chat? Questa azione non può essere annullata.')) {
        // Rimuovi prima tutti i messaggi
        const messagesRef = db.collection('chats').doc(currentChat.id).collection('messages');
        
        // Ottieni tutti i messaggi
        messagesRef.get()
            .then(snapshot => {
                // Crea un batch per eliminare i messaggi in blocco
                const batch = db.batch();
                
                // Aggiungi l'eliminazione di ogni messaggio al batch
                snapshot.forEach(doc => {
                    batch.delete(messagesRef.doc(doc.id));
                });
                
                // Esegui il batch
                return batch.commit();
            })
            .then(() => {
                // Dopo aver eliminato i messaggi, elimina la chat
                return db.collection('chats').doc(currentChat.id).delete();
            })
            .then(() => {
                console.log("Chat eliminata:", currentChat.id);
                showToast('Chat eliminata');
                
                // Resetta la chat corrente
                currentChat = null;
                
                // Aggiorna l'UI
                chatName.textContent = 'Seleziona una chat';
                chatStatus.textContent = '...';
                chatMessages.innerHTML = `
                    <div class="welcome-message">
                        <div class="welcome-icon"><i class="fas fa-comments"></i></div>
                        <h3>Benvenuto nelle chat di TeachUp</h3>
                        <p>Seleziona una chat esistente dalla barra laterale o inizia una nuova conversazione.</p>
                    </div>
                `;
                chatInputContainer.style.display = 'none';
            })
            .catch(error => {
                console.error("Errore nell'eliminazione della chat:", error);
                showToast('Errore nell\'eliminazione della chat');
            });
    }
}

// Rimuovi un membro dal gruppo
function removeMemberFromGroup(memberId) {
    // Verifica che ci sia una chat di gruppo selezionata
    if (!currentChat || currentChat.type !== 'group') return;
    
    // Verifica che l'utente corrente sia il creatore del gruppo
    if (currentChat.createdBy !== currentUser.uid) {
        showToast('Solo il creatore del gruppo può rimuovere membri');
        return;
    }
    
    // Non permettere di rimuovere se stessi
    if (memberId === currentUser.uid) {
        showToast('Non puoi rimuoverti dal gruppo. Usa "Esci dal gruppo".');
        return;
    }
    
    // Trova il membro da rimuovere
    const memberToRemove = currentChat.participantsInfo.find(p => p.id === memberId);
    if (!memberToRemove) {
        console.error("Membro non trovato:", memberId);
        return;
    }
    
    // Costruisci il nome da visualizzare
    let displayName = memberToRemove.email || 'Utente';
    if (memberToRemove.nome && memberToRemove.cognome) {
        displayName = `${memberToRemove.nome} ${memberToRemove.cognome}`;
    } else if (memberToRemove.nome) {
        displayName = memberToRemove.nome;
    }
    
    // Chiedi conferma
    if (confirm(`Sei sicuro di voler rimuovere ${displayName} dal gruppo?`)) {
        // Rimuovi il membro dai partecipanti
        const updatedParticipants = currentChat.participants.filter(uid => uid !== memberId);
        const updatedParticipantsInfo = currentChat.participantsInfo.filter(p => p.id !== memberId);
        
        // Aggiorna il documento della chat
        db.collection('chats').doc(currentChat.id).update({
            participants: updatedParticipants,
            participantsInfo: updatedParticipantsInfo
        })
        .then(() => {
            console.log("Membro rimosso dal gruppo:", memberId);
            
            // Aggiungi un messaggio di sistema
            const systemMessage = {
                type: 'system',
                content: `${currentUser.displayName || currentUser.email} ha rimosso ${displayName} dal gruppo`,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            return db.collection('chats').doc(currentChat.id)
                .collection('messages').add(systemMessage);
        })
        .then(() => {
            // Aggiorna l'ultimo messaggio nella chat
            return db.collection('chats').doc(currentChat.id).update({
                lastMessage: {
                    type: 'system',
                    content: `${currentUser.displayName || currentUser.email} ha rimosso ${displayName} dal gruppo`,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    senderId: currentUser.uid
                }
            });
        })
        .then(() => {
            showToast(`${displayName} rimosso dal gruppo`);
            
            // Chiudi il modal delle info
            document.getElementById('groupInfoModal')?.remove();
        })
        .catch(error => {
            console.error("Errore nella rimozione del membro:", error);
            showToast('Errore nella rimozione del membro');
        });
    }
}