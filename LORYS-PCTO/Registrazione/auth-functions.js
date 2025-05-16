// auth-functions.js

// Funzione per il login con Google
async function signInWithGoogle() {
    try {
        const result = await window.firebaseAuth.signInWithPopup(window.googleProvider);
        const user = result.user;
        
        // Salva i dati utente in Firestore
        await window.setDocument("utenti", user.uid, {
            nome: user.displayName?.split(' ')[0] || '',
            cognome: user.displayName?.split(' ')[1] || '',
            email: user.email,
            uid: user.uid,
            dataRegistrazione: new Date(),
            provider: 'google'
        });

        alert("✅ Accesso con Google completato con successo!");
        window.location.href = "../HOME/home.html";
    } catch (error) {
        console.error(error);
        alert("❌ Errore durante l'accesso con Google: " + error.message);
    }
}

// Funzione per il login con Apple
async function signInWithApple() {
    try {
        const result = await window.firebaseAuth.signInWithPopup(window.appleProvider);
        const user = result.user;
        
        // Salva i dati utente in Firestore
        await window.setDocument("utenti", user.uid, {
            nome: user.displayName?.split(' ')[0] || '',
            cognome: user.displayName?.split(' ')[1] || '',
            email: user.email,
            uid: user.uid,
            dataRegistrazione: new Date(),
            provider: 'apple'
        });

        alert("✅ Accesso con Apple completato con successo!");
        window.location.href = "../HOME/home.html";
    } catch (error) {
        console.error(error);
        alert("❌ Errore durante l'accesso con Apple: " + error.message);
    }
}

// Funzione per la registrazione dell'utente tradizionale
async function registerUser(event) {
    event.preventDefault();

    let nome = document.getElementById("nome").value;
    let cognome = document.getElementById("cognome").value;
    let email = document.getElementById("email").value;
    let password = document.getElementById("password").value;
    let confirmPassword = document.getElementById("confirm-password").value;
    let termsAccepted = document.getElementById("terms").checked;

    if (password !== confirmPassword) {
        alert("⚠️ Le password non coincidono!");
        return;
    }

    if (!termsAccepted) {
        alert("⚠️ Devi accettare i Termini e le Condizioni per registrarti!");
        return;
    }

    try {
        const userCredential = await window.createUser(email, password);
        const user = userCredential.user;
        
        await window.setDocument("utenti", user.uid, {
            nome: nome,
            cognome: cognome,
            email: email,
            uid: user.uid,
            dataRegistrazione: new Date(),
            provider: 'email'
        });

        alert("✅ Registrazione completata con successo!");
        window.location.href = "../LOGIN/login.html";
    } catch (error) {
        console.error(error);
        alert("❌ Errore nella registrazione: " + error.message);
    }
}

// Rendi le funzioni disponibili globalmente
window.signInWithGoogle = signInWithGoogle;
window.signInWithApple = signInWithApple;

// Event listener per il form di registrazione
document.addEventListener("DOMContentLoaded", function() {
    const form = document.getElementById("register-form");
    if (form) {
        form.addEventListener("submit", registerUser);
    }
});