document.addEventListener("DOMContentLoaded", () => {
    const themeSwitch = document.getElementById("theme-switch");
    const body = document.body;

    // Inizializza il tema
    initializeTheme();

    // Gestisci il cambio tema se esiste lo switch
    if (themeSwitch) {
        themeSwitch.addEventListener("change", toggleTheme);
    }

    // Inizializzazione tema al caricamento della pagina
    function initializeTheme() {
        const savedTheme = localStorage.getItem("dark-mode") || "disabled";
        if (savedTheme === "enabled") {
            body.classList.add("dark-mode");
            if (themeSwitch) themeSwitch.checked = true;
        }
    }

    // Cambia tema e salva la preferenza
    function toggleTheme() {
        const isDarkMode = themeSwitch.checked;
        body.classList.toggle("dark-mode", isDarkMode);
        localStorage.setItem("dark-mode", isDarkMode ? "enabled" : "disabled");
    }
});
