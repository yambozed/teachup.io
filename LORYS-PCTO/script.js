// Variabili per il timer
let timer;
let isTimerRunning = false;
let timeRemaining = 25 * 60; // 25 minuti in secondi

// Riferimenti agli elementi HTML
const timeDisplay = document.getElementById("time");
const startButton = document.getElementById("start-timer");
const stopButton = document.getElementById("stop-timer");

// Funzione per formattare il tempo (mm:ss)
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secondsRemaining = seconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(secondsRemaining).padStart(2, "0")}`;
}

// Funzione per avviare o mettere in pausa il timer
function toggleTimer() {
    if (isTimerRunning) {
        // Se il timer è in esecuzione, mettilo in pausa
        clearInterval(timer);
        isTimerRunning = false;
        startButton.textContent = "Riprendi"; // Cambia il testo in "Riprendi Timer"
    } else {
        // Se il timer è in pausa, avvialo
        isTimerRunning = true;
        startButton.textContent = "Pausa"; // Cambia il testo in "Pausa"

        timer = setInterval(() => {
            timeRemaining--;
            timeDisplay.textContent = formatTime(timeRemaining);

            if (timeRemaining <= 0) {
                clearInterval(timer);
                isTimerRunning = false;
                startButton.textContent = "Riprendi"; // Cambia il testo quando il timer è finito
                alert("Tempo scaduto! Pausa.");
            }
        }, 1000);
    }
}

// Funzione per fermare il timer
function stopTimer() {
    clearInterval(timer);
    isTimerRunning = false;
    timeRemaining = 25 * 60; // Reset del timer a 25 minuti
    timeDisplay.textContent = formatTime(timeRemaining);
    startButton.textContent = "Avvia"; // Cambia il testo in "Avvia Timer"
}

// Event listener per i pulsanti
startButton.addEventListener("click", toggleTimer);
stopButton.addEventListener("click", stopTimer);
