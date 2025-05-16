// Verifica login
firebase.auth().onAuthStateChanged((user) => {
  if (!user) {
    showToast("Devi effettuare il login per accedere a questa pagina", "error");
    setTimeout(() => {
      window.location.href = "../../Login/prova.html";
    }, 2000);
  }
});

// Toggle switch function
function toggleSwitch(element, inputId) {
  element.classList.toggle('active');
  const input = document.getElementById(inputId);
  
  if (element.classList.contains('active')) {
    input.value = inputId === 'privacy' ? 'private' : 'true';
  } else {
    input.value = inputId === 'privacy' ? 'public' : 'false';
  }
}

// Toggle per la privacy (con gestione del campo password)
function togglePrivacy(element) {
  element.classList.toggle('active');
  const input = document.getElementById('privacy');
  const passwordContainer = document.getElementById('passwordContainer');
  
  if (element.classList.contains('active')) {
    input.value = 'private';
    passwordContainer.style.display = 'block'; // Mostra il campo password
  } else {
    input.value = 'public';
    passwordContainer.style.display = 'none'; // Nasconde il campo password
    // Reset del campo password
    document.getElementById('sessionPassword').value = '';
    document.getElementById('sessionPassword').classList.remove('error');
    document.getElementById('sessionPasswordError').style.display = 'none';
  }
}

// Toast per notifiche migliorato
function showToast(message, type = 'info', duration = 3000) {
  const toast = document.getElementById("toast");
  
  // Rimuovi classi esistenti
  toast.classList.remove("success", "error");
  
  // Aggiungi icona e classe appropriata
  let icon = '<i class="fas fa-info-circle"></i>';
  
  if (type === 'success') {
    toast.classList.add("success");
    icon = '<i class="fas fa-check-circle"></i>';
  } else if (type === 'error') {
    toast.classList.add("error");
    icon = '<i class="fas fa-exclamation-circle"></i>';
  }
  
  // Aggiorna messaggio e icona
  toast.innerHTML = icon + message;
  
  // Mostra il toast
  toast.classList.add("show");
  
  // Nascondi dopo il tempo specificato
  setTimeout(() => {
    toast.classList.remove("show");
  }, duration);
}

// Mostra spinner di caricamento
function showSpinner() {
  document.getElementById("spinnerOverlay").classList.add("active");
}

// Nascondi spinner di caricamento
function hideSpinner() {
  document.getElementById("spinnerOverlay").classList.remove("active");
}

// Validazione del form
function validateForm() {
  let isValid = true;
  const sessionName = document.getElementById("sessionName").value.trim();
  const privacy = document.getElementById("privacy").value;
  const isPrivate = privacy === 'private';
  const sessionPassword = document.getElementById("sessionPassword").value.trim();
  const maxParticipants = document.getElementById("participants").value;
  
  // Reset errori
  document.getElementById("sessionName").classList.remove("error");
  document.getElementById("participants").classList.remove("error");
  document.getElementById("sessionNameError").style.display = "none";
  document.getElementById("participantsError").style.display = "none";
  
  if (isPrivate) {
    document.getElementById("sessionPassword").classList.remove("error");
    document.getElementById("sessionPasswordError").style.display = "none";
  }
  
  // Validazione nome sessione
  if (!sessionName || sessionName.length < 3) {
    document.getElementById("sessionName").classList.add("error");
    document.getElementById("sessionNameError").style.display = "block";
    isValid = false;
  }
  
  // Validazione password (solo per sessioni private)
  if (isPrivate && (!sessionPassword || sessionPassword.length < 4)) {
    document.getElementById("sessionPassword").classList.add("error");
    document.getElementById("sessionPasswordError").style.display = "block";
    isValid = false;
  }
  
  // Validazione partecipanti
  if (!maxParticipants || maxParticipants < 1 || maxParticipants > 50) {
    document.getElementById("participants").classList.add("error");
    document.getElementById("participantsError").style.display = "block";
    isValid = false;
  }
  
  return isValid;
}

// Flag per evitare richieste multiple
let isSubmitting = false;

// Crea la videochiamata
function startCall() {
  // Evita richieste multiple
  if (isSubmitting) {
    return;
  }
  
  // Validazione
  if (!validateForm()) {
    return;
  }
  
  // Imposta flag di invio
  isSubmitting = true;
  
  const sessionName = document.getElementById("sessionName").value.trim();
  const sessionPassword = document.getElementById("sessionPassword").value.trim();
  const maxParticipants = document.getElementById("participants").value;
  const privacy = document.getElementById("privacy").value;
  const enableChat = document.getElementById("enableChat").value === "true";
  
  // Mostra spinner
  showSpinner();
  
  const user = firebase.auth().currentUser;
  if (!user) {
    showToast("Devi essere loggato per creare una videochiamata", "error");
    hideSpinner();
    isSubmitting = false;
    return;
  }
  
  // Aggiungi un timeout di sicurezza (30 secondi)
  const timeoutId = setTimeout(() => {
    hideSpinner();
    showToast("La richiesta sta impiegando troppo tempo. Riprova più tardi.", "error");
    isSubmitting = false;
  }, 30000);
  
  // Verifica prima se esiste già una sessione con lo stesso nome
  db.collection("sessioni")
    .where("name", "==", sessionName)
    .get()
    .then((snapshot) => {
      if (!snapshot.empty) {
        showToast("Esiste già una sessione con questo nome", "error");
        clearTimeout(timeoutId);
        hideSpinner();
        isSubmitting = false;
        return Promise.reject("Nome sessione già esistente");
      }
      
      // Crea i dati della sessione
      const sessionData = {
        name: sessionName,
        participants: `1/${maxParticipants}`,
        participantsArray: [user.uid], // Array di partecipanti per tracking
        status: "Online",
        privacy: privacy,
        enableChat: enableChat,
        createdBy: user.uid,
        creatorName: user.displayName || user.email || "Utente",
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      // Aggiungi la password solo se la sessione è privata
      if (privacy === 'private') {
        sessionData.password = sessionPassword;
      }
      
      console.log("Creazione sessione con dati:", sessionData);
      
      // Salva la sessione in Firestore
      return db.collection("sessioni").add(sessionData);
    })
    .then((docRef) => {
      console.log("Sessione creata con ID:", docRef.id);
      clearTimeout(timeoutId);
      
      const sessionId = docRef.id;
      
      // Se la chat è abilitata, crea un messaggio di benvenuto
      if (enableChat) {
        const welcomeMessage = {
          text: "Benvenuto nella chat della sessione!",
          sender: "Sistema",
          senderId: "system",
          sessionId: sessionId,
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          type: "system"
        };
        
        // Aggiungi il messaggio di benvenuto alla collezione chatMessages
        return db.collection("chatMessages").add(welcomeMessage)
          .then(() => {
            // Aggiorna anche i dati dell'utente
            return db.collection("utenti").doc(user.uid).set({
              sessions: {
                [sessionId]: {
                  joined: firebase.firestore.FieldValue.serverTimestamp(),
                  role: "creator"
                }
              }
            }, { merge: true }).then(() => sessionId);
          });
      } else {
        // Aggiorna solo i dati dell'utente
        return db.collection("utenti").doc(user.uid).set({
          sessions: {
            [sessionId]: {
              joined: firebase.firestore.FieldValue.serverTimestamp(),
              role: "creator"
            }
          }
        }, { merge: true }).then(() => sessionId);
      }
    })
    .then((sessionId) => {
      showToast("Videochiamata creata con successo!", "success");
      
      // Debug
      console.log("Reindirizzamento a videochiamata.html con sessionId:", sessionId);
      
      // Reindirizza alla videochiamata dopo breve delay
      setTimeout(() => {
        const sessionName = document.getElementById("sessionName").value.trim();
        window.location.href = `videochiamata.html?sessionId=${sessionId}`;
      }, 1500);
    })
    .catch((error) => {
      if (error === "Nome sessione già esistente") return;
      
      console.error("Errore nella creazione della sessione:", error);
      showToast("Errore durante la creazione. Riprova più tardi.", "error");
      clearTimeout(timeoutId);
      hideSpinner();
      isSubmitting = false;
    });
}

// Event listeners per migliorare l'UX
document.addEventListener("DOMContentLoaded", () => {
  // Auto focus sul primo campo
  document.getElementById("sessionName").focus();
  
  // Gestione invio form con tasto Enter
  document.getElementById("callForm").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      startCall();
    }
  });
  
  // Nascondi errori quando l'utente corregge
  document.getElementById("sessionName").addEventListener("input", function() {
    this.classList.remove("error");
    document.getElementById("sessionNameError").style.display = "none";
  });
  
  document.getElementById("sessionPassword").addEventListener("input", function() {
    this.classList.remove("error");
    document.getElementById("sessionPasswordError").style.display = "none";
  });
  
  document.getElementById("participants").addEventListener("input", function() {
    this.classList.remove("error");
    document.getElementById("participantsError").style.display = "none";
  });
});