// Variabili globali
let api = null;
let sessionId = null;
let sessionData = null;
let user = null;
let chatVisible = false;
let unreadMessages = 0;
let chatListener = null;

// Inizializzazione
document.addEventListener('DOMContentLoaded', function() {
  console.log("Inizializzazione della videochiamata");
  
  // Nascondi il loading overlay dopo un timeout di sicurezza
  setTimeout(() => {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay && !loadingOverlay.classList.contains('hidden')) {
      loadingOverlay.classList.add('hidden');
      console.log("Loading overlay nascosto dopo timeout di sicurezza");
    }
  }, 10000); // 10 secondi di timeout
  
  // Gestisce il pulsante di ricarica
  document.getElementById('forceReload').addEventListener('click', function() {
    location.reload();
  });
  
  // Ottieni i parametri dell'URL
  const urlParams = new URLSearchParams(window.location.search);
  sessionId = urlParams.get('sessionId');
  
  console.log("SessionID ricevuto:", sessionId);
  
  // Verifica login
  firebase.auth().onAuthStateChanged((loggedUser) => {
    if (!loggedUser) {
      showToast("Devi effettuare il login per accedere a questa pagina", "error");
      setTimeout(() => {
        window.location.href = "../../Login/prova.html";
      }, 2000);
      return;
    }
    
    user = loggedUser;
    console.log("Utente autenticato:", user.uid);
    
    // Verifica parametri URL
    if (!sessionId) {
      showToast("Parametri sessione mancanti", "error");
      setTimeout(() => {
        window.location.href = "sessioni.html";
      }, 2000);
      return;
    }
    
    // Carica i dati della sessione
    loadSession();
  });
});

// Carica i dati della sessione
function loadSession() {
  console.log("Caricamento dati della sessione:", sessionId);
  
  db.collection("sessioni").doc(sessionId).get()
    .then((doc) => {
      if (!doc.exists) {
        console.error("Sessione non trovata in Firestore");
        showToast("Sessione non trovata", "error");
        setTimeout(() => {
          window.location.href = "sessioni.html";
        }, 2000);
        return;
      }
      
      sessionData = doc.data();
      console.log("Dati sessione:", sessionData);
      
      // Controlla se l'utente è il creatore
      const isCreator = sessionData.createdBy === user.uid;
      console.log("Utente è creatore:", isCreator);
      
      // Controlla se la sessione è privata e protetta da password
      if (sessionData.privacy === 'private' && sessionData.password && sessionData.password.trim() !== "") {
        console.log("Sessione privata con password");
        
        // Se non è il creatore, chiede la password
        if (!isCreator) {
          console.log("Richiesta password");
          showPasswordPrompt();
          return;
        }
      }
      
      // Continua con l'inizializzazione della sessione
      console.log("Inizializzazione sessione");
      initSession();
    })
    .catch((error) => {
      console.error("Errore nel caricamento della sessione:", error);
      showToast("Errore nel caricamento della sessione", "error");
    });
}

// Mostra la finestra di dialogo per inserire la password
function showPasswordPrompt() {
  console.log("Mostra prompt password");
  
  const passwordModal = document.getElementById("passwordModal");
  const passwordInput = document.getElementById("passwordInput");
  const submitPassword = document.getElementById("submitPassword");
  
  if (!passwordModal) {
    console.error("Elemento passwordModal non trovato");
    return;
  }
  
  passwordModal.style.display = "flex";
  passwordInput.focus();
  
  // Gestisci l'invio con Enter
  passwordInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      verifyPassword();
    }
  });
  
  // Gestisci click sul pulsante
  submitPassword.onclick = verifyPassword;
  
  function verifyPassword() {
    const enteredPassword = passwordInput.value.trim();
    console.log("Verifica password:", enteredPassword);
    
    if (enteredPassword === sessionData.password) {
      console.log("Password corretta");
      passwordModal.style.display = "none";
      initSession();
    } else {
      console.log("Password errata");
      passwordInput.value = "";
      passwordInput.classList.add("error");
      showToast("Password errata", "error");
      
      // Aggiungi feedback visuale sull'errore
      passwordInput.classList.add("shake");
      setTimeout(() => {
        passwordInput.classList.remove("shake");
      }, 500);
    }
  }
}

// Inizializza la sessione
function initSession() {
  console.log("Inizializzazione della sessione");
  
  // Aggiorna array partecipanti se non presente
  if (!sessionData.participantsArray.includes(user.uid)) {
    updateParticipants();
  }
  
  // Inizializza Jitsi Meet
  initJitsi();
  
  // Inizializza chat se abilitata
  if (sessionData.enableChat) {
    initChat();
  } else {
    // Nascondi il pulsante chat
    document.getElementById("toggleChatBtn").style.display = "none";
  }
}

// Aggiorna i partecipanti nel database
function updateParticipants() {
  console.log("Aggiornamento partecipanti");
  
  // Aggiorna il numero di partecipanti
  const currentCount = sessionData.participantsArray ? sessionData.participantsArray.length : 0;
  const maxParticipants = parseInt(sessionData.participants.split('/')[1]);
  
  db.collection("sessioni").doc(sessionId).update({
    participants: `${currentCount + 1}/${maxParticipants}`,
    participantsArray: firebase.firestore.FieldValue.arrayUnion(user.uid)
  }).catch(error => {
    console.error("Errore nell'aggiornamento partecipanti:", error);
  });
  
  // Aggiorna anche i dati dell'utente
  db.collection("utenti").doc(user.uid).set({
    sessions: {
      [sessionId]: {
        joined: firebase.firestore.FieldValue.serverTimestamp(),
        role: "participant"
      }
    }
  }, { merge: true }).catch(error => {
    console.error("Errore nell'aggiornamento dati utente:", error);
  });
}

// Inizializza Jitsi Meet
function initJitsi() {
  console.log("Inizializzazione Jitsi Meet");
  
  try {
    const domain = 'meet.jit.si';
    const roomName = `teachup_${sessionId.replace(/[^a-zA-Z0-9]/g, '')}`;
    
    console.log(`Creazione room Jitsi: ${roomName}`);
    
    // Nascondi l'overlay di caricamento subito dopo l'avvio di Jitsi
    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.classList.add('hidden');
    console.log("Loading overlay nascosto manualmente");
    
    const options = {
      roomName: roomName,
      width: '100%',
      height: '100%',
      parentNode: document.getElementById('jitsi-container'),
      lang: 'it',
      userInfo: {
        displayName: user.displayName || user.email || "Utente"
      },
      configOverwrite: {
        prejoinPageEnabled: false,
        enableWelcomePage: false,
        enableClosePage: false,
        disableDeepLinking: true,
        startWithVideoMuted: false,
        startWithAudioMuted: false
      },
      interfaceConfigOverwrite: {
        TOOLBAR_BUTTONS: [
          'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
          'fodeviceselection', 'hangup', 'profile', 'info', 'recording',
          'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
          'videoquality', 'filmstrip', 'feedback', 'stats', 'shortcuts',
          'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone',
          'security'
        ],
        SETTINGS_SECTIONS: ['devices', 'language', 'moderator', 'profile', 'calendar'],
        MOBILE_APP_PROMO: false,
        DEFAULT_BACKGROUND: '#f1f3f5',
        DEFAULT_LOCAL_DISPLAY_NAME: 'Tu',
        DEFAULT_REMOTE_DISPLAY_NAME: 'Partecipante',
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        SHOW_BRAND_WATERMARK: false,
        SHOW_POWERED_BY: false,
        NATIVE_APP_NAME: 'TeachUp',
        PROVIDER_NAME: 'TeachUp',
        INVITATION_POWERED_BY: false
      }
    };
    
    // Crea l'API Jitsi
    api = new JitsiMeetExternalAPI(domain, options);
    console.log("API Jitsi creata con successo");
    
    // Gestione eventi
    api.on('videoConferenceJoined', () => {
      console.log('Videoconferenza avviata');
      
      // Se è il creatore, imposta come moderatore
      if (sessionData.createdBy === user.uid) {
        api.executeCommand('toggleLobby', true);
        api.isAudioMuted().then(muted => {
          if (muted) api.executeCommand('toggleAudio');
        });
      }
    });
    
    api.on('readyToClose', () => {
      exitSession();
    });
    
    api.on('participantJoined', (participant) => {
      console.log(`Partecipante entrato: ${participant.displayName}`);
      
      // Aggiungi messaggio di sistema nella chat
      if (sessionData.enableChat) {
        addSystemMessage(`${participant.displayName} è entrato nella sessione`);
      }
    });
    
    api.on('participantLeft', (participant) => {
      console.log(`Partecipante uscito: ${participant.displayName}`);
      
      // Aggiungi messaggio di sistema nella chat
      if (sessionData.enableChat) {
        addSystemMessage(`${participant.displayName} ha lasciato la sessione`);
      }
    });
    
    // Gestione problemi di connessione
    api.on('connectionEstablished', () => {
      document.getElementById('disconnectWarning').classList.remove('show');
    });
    
    api.on('connectionInterrupted', () => {
      document.getElementById('disconnectWarning').classList.add('show');
    });
    
    api.on('connectionRestored', () => {
      document.getElementById('disconnectWarning').classList.remove('show');
    });
    
  } catch (error) {
    console.error("Errore nella creazione dell'API Jitsi:", error);
    showToast("Errore nell'inizializzazione della videochiamata", "error");
    document.getElementById('loadingOverlay').classList.add('hidden');
  }
}// Inizializza la chat
function initChat() {
  console.log("Inizializzazione chat");
  
  try {
    const chatContainer = document.getElementById('chatContainer');
    const chatMessages = document.getElementById('chatMessages');
    const chatBadge = document.getElementById('chatBadge');
    
    if (!chatContainer || !chatMessages || !chatBadge) {
      console.error("Elementi della chat non trovati");
      return;
    }
    
    // Verifica che il pulsante della chat sia visibile
    const toggleChatBtn = document.getElementById('toggleChatBtn');
    if (toggleChatBtn) {
      toggleChatBtn.style.display = 'flex';
    }
    
    // Pulizia iniziale della chat (per evitare duplicazioni in caso di reinizializzazione)
    chatMessages.innerHTML = '';
    
    // Logging per debug
    console.log("Recupero messaggi per la sessione:", sessionId);
    
    // Carica messaggi esistenti
    db.collection("chatMessages")
      .where("sessionId", "==", sessionId)
      .get()
      .then((snapshot) => {
        console.log(`Caricati ${snapshot.size} messaggi`);
        
        if (snapshot.size === 0) {
          // Aggiungi un messaggio di benvenuto se non ci sono messaggi
          const welcomeMessage = {
            text: "Benvenuto nella chat della sessione!",
            sender: "Sistema",
            senderId: "system",
            sessionId: sessionId,
            timestamp: firebase.firestore.Timestamp.now(),
            type: "system"
          };
          
          renderMessage(welcomeMessage);
          
          // Salva il messaggio di benvenuto nel database
          db.collection("chatMessages").add(welcomeMessage)
            .then(() => console.log("Messaggio di benvenuto aggiunto"))
            .catch(err => console.error("Errore nel salvare il messaggio di benvenuto:", err));
        } else {
          // Ordina manualmente i messaggi per timestamp
          const messages = [];
          snapshot.forEach((doc) => {
            // Aggiungi l'ID del documento al messaggio
            const messageData = doc.data();
            messageData.id = doc.id;
            messages.push(messageData);
          });
          
          // Ordina per timestamp (se esiste)
          messages.sort((a, b) => {
            const timeA = a.timestamp ? a.timestamp.toDate().getTime() : 0;
            const timeB = b.timestamp ? b.timestamp.toDate().getTime() : 0;
            return timeA - timeB;
          });
          
          console.log("Messaggi ordinati:", messages);
          
          // Renderizza i messaggi ordinati
          messages.forEach(message => {
            renderMessage(message);
          });
        }
        
        // Scorri verso l'ultimo messaggio
        chatMessages.scrollTop = chatMessages.scrollHeight;
      })
      .catch((error) => {
        console.error("Errore nel caricamento dei messaggi:", error);
        
        // Crea comunque un messaggio di benvenuto
        const welcomeMessage = {
          text: "Benvenuto nella chat della sessione! (Errore nel caricamento dei messaggi precedenti)",
          sender: "Sistema",
          senderId: "system",
          sessionId: sessionId,
          timestamp: firebase.firestore.Timestamp.now(),
          type: "system"
        };
        
        renderMessage(welcomeMessage);
      });
    
    // Ascolta nuovi messaggi
    chatListener = db.collection("chatMessages")
      .where("sessionId", "==", sessionId)
      .onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const messageData = change.doc.data();
            messageData.id = change.doc.id; // Aggiungi l'ID del documento
            
            console.log("Nuovo messaggio ricevuto:", messageData);
            
            // Renderizza il messaggio
            renderMessage(messageData);
            
            // Notifica se la chat è chiusa
            if (!chatVisible && messageData.senderId !== user.uid && messageData.senderId !== "system") {
              unreadMessages++;
              chatBadge.textContent = unreadMessages;
              chatBadge.classList.add("show");
              
              // Effetto di animazione
              document.getElementById('toggleChatBtn').classList.add('bounce');
              setTimeout(() => {
                document.getElementById('toggleChatBtn').classList.remove('bounce');
              }, 2000);
            }
            
            // Scorri automaticamente se la chat è visibile
            if (chatVisible) {
              chatMessages.scrollTop = chatMessages.scrollHeight;
            }
          }
        });
      }, (error) => {
        console.error("Errore nell'ascolto dei messaggi:", error);
      });
      
    console.log("Chat inizializzata con successo");
  } catch (error) {
    console.error("Errore durante l'inizializzazione della chat:", error);
  }
}

// Renderizza un messaggio nella chat
function renderMessage(message) {
  console.log("Rendering messaggio:", message);
  
  try {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) {
      console.error("Elemento chatMessages non trovato");
      return;
    }
    
    // IMPORTANTE: Verifica se il messaggio è già stato renderizzato
    const messageId = message.id || (message.timestamp ? message.timestamp.toDate().getTime() + message.senderId : Math.random().toString(36).substring(2, 15));
    if (document.getElementById(`msg-${messageId}`)) {
      console.log("Messaggio già renderizzato, ignorato:", messageId);
      return;
    }
    
    const messageElement = document.createElement('div');
    messageElement.id = `msg-${messageId}`; // Aggiungi un ID unico
    
    const isCurrentUser = message.senderId === user.uid;
    const isSystem = message.type === "system" || message.senderId === "system";
    
    let messageClass = isSystem ? "message system" : (isCurrentUser ? "message outgoing" : "message incoming");
    messageElement.className = messageClass;
    
    // Gestione timestamp con controllo errori
    let formattedTime;
    try {
      let timestamp = message.timestamp;
      if (timestamp && typeof timestamp.toDate === 'function') {
        // Se è un timestamp Firestore
        timestamp = timestamp.toDate();
      } else if (!(timestamp instanceof Date)) {
        // Se non è né un timestamp né una data, usa la data corrente
        timestamp = new Date();
      }
      formattedTime = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      console.error("Errore nella formattazione del timestamp:", error);
      formattedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Sanitizza il testo del messaggio per evitare problemi HTML
    const sanitizedText = message.text ? message.text.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
    const sanitizedSender = (isCurrentUser ? 'Tu' : (message.sender || 'Utente')).replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    if (isSystem) {
      messageElement.innerHTML = `
        <div class="message-text">${sanitizedText}</div>
        <div class="message-time">${formattedTime}</div>
      `;
    } else {
      messageElement.innerHTML = `
        <div class="message-sender">${sanitizedSender}</div>
        <div class="message-text">${sanitizedText}</div>
        <div class="message-time">${formattedTime}</div>
      `;
    }
    
    chatMessages.appendChild(messageElement);
    
    // Debug - stampa il contenuto della chat
    console.log("Contenuto chat dopo aggiunta:", chatMessages.childNodes.length, "messaggi");
    console.log("HTML messaggio aggiunto:", messageElement.outerHTML);
    
    // Forza il ridisegno e lo scroll
    setTimeout(() => {
      chatMessages.scrollTop = chatMessages.scrollHeight;
      console.log("Scrollato alla fine, altezza:", chatMessages.scrollHeight);
    }, 50);
    
    console.log("Messaggio renderizzato con successo");
  } catch (error) {
    console.error("Errore durante il rendering del messaggio:", error);
  }
}

// Aggiungi messaggio di sistema
function addSystemMessage(text) {
  console.log("Aggiunta messaggio di sistema:", text);
  
  db.collection("chatMessages").add({
    text: text,
    sender: "Sistema",
    senderId: "system",
    sessionId: sessionId,
    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    type: "system"
  }).then(() => {
    console.log("Messaggio di sistema aggiunto con successo");
  }).catch(error => {
    console.error("Errore nell'aggiunta del messaggio di sistema:", error);
  });
}

// Invia un messaggio
function sendMessage() {
  console.log("Tentativo di invio messaggio");
  
  try {
    const chatInput = document.getElementById('chatInput');
    const text = chatInput.value.trim();
    
    if (!text) {
      console.log("Messaggio vuoto, invio annullato");
      return;
    }
    
    console.log("Invio messaggio:", text);
    
    showToast("Invio messaggio in corso...", "info", 1000);
    
    db.collection("chatMessages").add({
      text: text,
      sender: user.displayName || user.email || "Utente",
      senderId: user.uid,
      sessionId: sessionId,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
      console.log("Messaggio inviato con successo");
      chatInput.value = '';
    })
    .catch((error) => {
      console.error("Errore nell'invio del messaggio:", error);
      showToast("Errore nell'invio del messaggio", "error");
    });
  } catch (error) {
    console.error("Errore durante l'invio del messaggio:", error);
    showToast("Si è verificato un errore", "error");
  }
}

// Gestione tasto Invio per la chat
function handleKeyPress(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    sendMessage();
  }
}

// Mostra/nascondi la chat
function toggleChat() {
  console.log("Toggle chat");
  
  try {
    const chatContainer = document.getElementById('chatContainer');
    const chatBadge = document.getElementById('chatBadge');
    const exitButton = document.getElementById('exitButton');
    
    if (!chatContainer || !chatBadge || !exitButton) {
      console.error("Elementi chat non trovati");
      return;
    }
    
    chatContainer.classList.toggle('hidden');
    chatVisible = !chatContainer.classList.contains('hidden');
    console.log("Chat visibile:", chatVisible);
    
    // Aggiorna posizione pulsante di uscita
    if (chatVisible) {
      exitButton.style.right = '370px';
      
      // Reset contatore messaggi non letti
      unreadMessages = 0;
      chatBadge.textContent = '0';
      chatBadge.classList.remove('show');
      
      // Focus sull'input
      const chatInput = document.getElementById('chatInput');
      if (chatInput) {
        chatInput.focus();
      }
      
      // Scorri alla fine
      const chatMessages = document.getElementById('chatMessages');
      if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
    } else {
      exitButton.style.right = '20px';
    }
  } catch (error) {
    console.error("Errore durante il toggle della chat:", error);
  }
}

// Mostra toast con messaggio
function showToast(message, type = 'info', duration = 3000) {
  const toast = document.getElementById("toast");
  
  // Rimuovi classi esistenti
  toast.classList.remove("success", "error");
  
  // Aggiungi classe appropriata
  if (type === 'success') {
    toast.classList.add("success");
    message = `<i class="fas fa-check-circle"></i> ${message}`;
  } else if (type === 'error') {
    toast.classList.add("error");
    message = `<i class="fas fa-exclamation-circle"></i> ${message}`;
  } else {
    message = `<i class="fas fa-info-circle"></i> ${message}`;
  }
  
  // Aggiorna messaggio
  toast.innerHTML = message;
  
  // Mostra il toast
  toast.classList.add("show");
  
  // Nascondi dopo il tempo specificato
  setTimeout(() => {
    toast.classList.remove("show");
  }, duration);
}

// Esci dalla sessione
function exitSession() {
  // Chiedi conferma
  if (confirm("Sei sicuro di voler uscire dalla videochiamata?")) {
    console.log("Uscita dalla sessione");
    
    // Mostra un messaggio di caricamento
    showToast("Uscita in corso...", "info");
    
    try {
      // Ottieni il riferimento al documento della sessione
      const sessionRef = db.collection("sessioni").doc(sessionId);
      
      // Leggi i dati attuali della sessione
      sessionRef.get().then(doc => {
        if (doc.exists) {
          const sessionData = doc.data();
          
          // Verifica che i dati necessari esistano
          if (sessionData && sessionData.participantsArray && sessionData.participants) {
            // Rimuovi l'utente dall'array
            const updatedArray = sessionData.participantsArray.filter(id => id !== user.uid);
            
            // Estrai il numero massimo di partecipanti
            const maxParticipants = parseInt(sessionData.participants.split('/')[1]);
            
            // Aggiorna il contatore e l'array
            const newParticipants = `${updatedArray.length}/${maxParticipants}`;
            
            console.log(`Aggiornamento partecipanti: ${sessionData.participants} -> ${newParticipants}`);
            
            // Aggiorna i dati nel database
            sessionRef.update({
              participants: newParticipants,
              participantsArray: updatedArray
            }).then(() => {
              console.log("Partecipanti aggiornati con successo");
              
              // Pulisci listener
              if (chatListener) {
                chatListener();
              }
              
              // Aggiungi messaggio di sistema per l'uscita
              const username = user.displayName || user.email || "Utente";
              db.collection("chatMessages").add({
                text: `${username} ha lasciato la sessione`,
                sender: "Sistema",
                senderId: "system",
                sessionId: sessionId,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                type: "system"
              }).finally(() => {
                // Redirect dopo un breve ritardo
                setTimeout(() => {
                  window.location.href = "sessioni.html";
                }, 500);
              });
            }).catch(error => {
              console.error("Errore nell'aggiornamento della sessione:", error);
              window.location.href = "sessioni.html";
            });
          } else {
            console.error("Dati sessione non validi:", sessionData);
            window.location.href = "sessioni.html";
          }
        } else {
          console.error("Documento sessione non trovato");
          window.location.href = "sessioni.html";
        }
      }).catch(error => {
        console.error("Errore nella lettura della sessione:", error);
        window.location.href = "sessioni.html";
      });
    } catch (error) {
      console.error("Errore durante l'uscita:", error);
      window.location.href = "sessioni.html";
    }
  }
}

// Quando la finestra viene chiusa
window.addEventListener('beforeunload', function(e) {
  console.log("Evento beforeunload rilevato - aggiornamento partecipanti");
  
  try {
    // Aggiorna direttamente il documento in Firestore
    if (sessionId && user) {
      const sessionRef = db.collection("sessioni").doc(sessionId);
      
      // Esegui una lettura-aggiornamento sincrona
      sessionRef.get().then(doc => {
        if (doc.exists) {
          const data = doc.data();
          
          if (data && data.participantsArray) {
            // Filtra l'array per rimuovere l'utente corrente
            const updatedArray = data.participantsArray.filter(id => id !== user.uid);
            
            // Estrai il numero massimo di partecipanti
            const maxParticipants = parseInt(data.participants.split('/')[1] || 10);
            
            // Invia l'aggiornamento a Firestore
            sessionRef.update({
              participants: `${updatedArray.length}/${maxParticipants}`,
              participantsArray: updatedArray
            });
          }
        }
      });
      
      // Aggiungi un messaggio che l'utente è uscito (se possibile)
      try {
        const username = user.displayName || user.email || "Utente";
        db.collection("chatMessages").add({
          text: `${username} ha lasciato la sessione`,
          sender: "Sistema",
          senderId: "system",
          sessionId: sessionId,
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          type: "system"
        });
      } catch (err) {
        console.error("Errore nell'aggiunta del messaggio di uscita:", err);
      }
    }
  } catch (error) {
    console.error("Errore durante la gestione dell'uscita:", error);
  }
});

// Funzione di test per la connessione alla chat
function testChatConnection() {
  console.log("Test di connessione chat");
  showToast("Test di connessione chat in corso...", "info");
  
  // Verifica se la chat è abilitata
  if (!sessionData.enableChat) {
    showToast("La chat non è abilitata per questa sessione", "error");
    return;
  }
  
  // Test di accesso a Firestore
  db.collection("chatMessages")
    .where("sessionId", "==", sessionId)
    .limit(1)
    .get()
    .then(snapshot => {
      console.log("Test lettura messaggi completato", snapshot.size);
      
      // Test di scrittura
      return db.collection("chatMessages").add({
        text: "Test connessione chat riuscito!",
        sender: "Sistema",
        senderId: "system",
        sessionId: sessionId,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        type: "system"
      });
    })
    .then(() => {
      console.log("Test scrittura messaggio completato");
      showToast("Test di connessione chat completato con successo", "success");
    })
    .catch(error => {
      console.error("Errore nel test della chat:", error);
      showToast("Errore nel test della chat: " + error.message, "error");
    });
}

// Pulisci i messaggi della chat (solo nell'interfaccia)
function clearChatMessages() {
  console.log("Pulizia dei messaggi della chat");
  
  const chatMessages = document.getElementById('chatMessages');
  if (chatMessages) {
    chatMessages.innerHTML = '';
    
    // Aggiungi un messaggio di sistema
    const clearMessage = {
      text: "La chat è stata pulita",
      sender: "Sistema",
      senderId: "system",
      sessionId: sessionId,
      timestamp: firebase.firestore.Timestamp.now(),
      type: "system"
    };
    
    renderMessage(clearMessage);
    
    showToast("Chat pulita", "success");
  } else {
    console.error("Elemento chatMessages non trovato");
    showToast("Errore nel pulire la chat", "error");
  }
}