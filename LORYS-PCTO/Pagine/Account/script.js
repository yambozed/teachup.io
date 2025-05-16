document.addEventListener("DOMContentLoaded", () => {
    // Selettori DOM
    const themeSwitch = document.getElementById("theme-switch");
    const body = document.body;
    const nameInput = document.getElementById("name");
    const emailInput = document.getElementById("email");
    const editBtn = document.getElementById("edit-info");
    const deleteBtn = document.getElementById("delete-info");
    const saveBtn = document.getElementById("save-changes");
    const editPhotoBtn = document.getElementById("edit-photo");
    const fileInput = document.getElementById("file-input");
    const profileImage = document.querySelector(".profile-pic");

    // Flag per tracciare se stiamo già processando un'immagine
    let isProcessingImage = false;

    // Impostazioni tema (light/dark mode)
    initializeTheme();

    // Gestisci il cambiamento del tema
    themeSwitch.addEventListener("change", toggleTheme);

    // Gestisci l'attivazione della modalità di modifica
    editBtn.addEventListener("click", enableEditMode);

    // Gestisci l'eliminazione delle informazioni
    deleteBtn.addEventListener("click", deleteInfo);

    // Gestisci il salvataggio delle modifiche
    saveBtn.addEventListener("click", saveChanges);

    // Gestisci la modifica della foto del profilo
    editPhotoBtn.addEventListener("click", function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (!isProcessingImage) {
            fileInput.click();
        }
    });

    // Gestisci l'evento di selezione della foto
    fileInput.addEventListener("change", function(e) {
        if (isProcessingImage) return;
        
        const file = e.target.files[0];
        if (file) {
            isProcessingImage = true;
            const reader = new FileReader();
            
            reader.onload = function(e) {
                profileImage.src = e.target.result;
                // Resettiamo il flag dopo che l'immagine è stata caricata
                setTimeout(() => {
                    isProcessingImage = false;
                }, 500);
            };
            
            reader.readAsDataURL(file);
        }
    });

    // Funzione di inizializzazione del tema
    function initializeTheme() {
        const savedTheme = localStorage.getItem("dark-mode");
        if (savedTheme === "enabled") {
            body.classList.add("dark-mode");
            themeSwitch.checked = true;
        }
        updateInputColors();
    }

    // Funzione per attivare/disattivare il tema scuro
    function toggleTheme() {
        if (themeSwitch.checked) {
            body.classList.add("dark-mode");
            localStorage.setItem("dark-mode", "enabled");
        } else {
            body.classList.remove("dark-mode");
            localStorage.setItem("dark-mode", "disabled");
        }
        updateInputColors();
    }

    // Funzione per aggiornare i colori degli input
    function updateInputColors() {
        const isDarkMode = body.classList.contains("dark-mode");
        const color = isDarkMode ? "white" : "#333";
        const bgColor = isDarkMode ? "#444" : "transparent";

        [nameInput, emailInput].forEach(input => {
            if (!input.disabled) {
                input.style.color = color;
                input.style.backgroundColor = bgColor;
            } else {
                input.style.color = color;
                input.style.backgroundColor = "transparent";
            }
        });
    }

    // Funzione per abilitare la modalità di modifica
    function enableEditMode() {
        nameInput.disabled = false;
        emailInput.disabled = false;
        saveBtn.disabled = false;
        updateInputColors();
    }

    // Funzione per eliminare le informazioni
    function deleteInfo() {
        if (confirm("Sei sicuro di voler eliminare le informazioni?")) {
            nameInput.value = "";
            emailInput.value = "";
            saveBtn.disabled = false;
        }
    }

    // Funzione per salvare le modifiche
    function saveChanges() {
        if (!validateEmail(emailInput.value)) {
            alert("Per favore, inserisci un'email valida.");
            return;
        }

        nameInput.disabled = true;
        emailInput.disabled = true;
        saveBtn.disabled = true;
        updateInputColors();
        alert("Modifiche salvate con successo!");
    }

    // Funzione per validare l'email
    function validateEmail(email) {
        const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return emailRegex.test(email);
    }
    

  
   
    
});