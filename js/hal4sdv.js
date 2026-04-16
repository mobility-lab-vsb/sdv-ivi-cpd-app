document.addEventListener("DOMContentLoaded", () => {
  // Vybereme všechna tlačítka uvnitř levého menu
  const menuButtons = document.querySelectorAll(".left-menu button");

  menuButtons.forEach(button => {
    button.addEventListener("click", function() {
      // 1. Odebereme třídu 'active' ze všech tlačítek
      menuButtons.forEach(btn => btn.classList.remove("active"));
      
      // 2. Přidáme třídu 'active' pouze na tlačítko, na které se kliklo
      this.classList.add("active");
    });
  });
});

document.addEventListener("DOMContentLoaded", () => {
    const menuButtons = document.querySelectorAll(".left-menu button");
    const screens = document.querySelectorAll(".sdv-screen");
    const seatMap = document.querySelector(".seats");
    const timeBar = document.querySelector(".time-with-status");

// --- KOMPLETNÍ LOGIKA DELAY (Slider + Tlačítka + Přepínač) ---
    const toggleEnable = document.getElementById("sdv-enable-delay-toggle");
    const delaySlider = document.getElementById("sdv-delay-slider");
    const delayBottomControls = document.getElementById("delay-bottom-controls");
    const delayTextWrapper = document.getElementById("delay-text-wrapper");
    const timeDisplay = document.getElementById("delay-time-display"); // Zde se propisuje ten obří text
    const btnMinus = document.getElementById("sdv-delay-minus");
    const btnPlus = document.getElementById("sdv-delay-plus");

    // 1. Funkce pro vizuální změnu textu a barvy linky
    function updateDelayUI() {
        if (!delaySlider || !timeDisplay) return;
        
        const val = parseInt(delaySlider.value, 10);
        const percent = ((val - delaySlider.min) / (delaySlider.max - delaySlider.min)) * 100;
        
        // Vykreslí hezkou zelenou linku po aktuální hodnotu
        delaySlider.style.background = `linear-gradient(to right, #45aa73 ${percent}%, rgba(255, 255, 255, 0.15) ${percent}%)`;
        
        // Změní obrovský text s minutami
        timeDisplay.innerText = `${val} ${val === 1 ? 'minute' : 'minutes'}`;
    }

    // 2. Reakce na hýbání sliderem myší/prstem
    if (delaySlider) {
        delaySlider.addEventListener('input', updateDelayUI);
    }

    // 3. Reakce na kliknutí na MÍNUS
    if (btnMinus) {
        btnMinus.addEventListener('click', () => {
            if (toggleEnable && !toggleEnable.checked) {
                delaySlider.value = Math.max(0, parseInt(delaySlider.value) - 1);
                updateDelayUI();
            }
        });
    }

    // 4. Reakce na kliknutí na PLUS
    if (btnPlus) {
        btnPlus.addEventListener('click', () => {
            if (toggleEnable && !toggleEnable.checked) {
                delaySlider.value = Math.min(10, parseInt(delaySlider.value) + 1);
                updateDelayUI();
            }
        });
    }

    // 5. Potvrzení, zamknutí a odeslání do KUKSA
    if (toggleEnable) {
        toggleEnable.addEventListener('change', (e) => {
            const isConfirmed = e.target.checked;
            
            if (isConfirmed && delaySlider) {
                const secondsValue = parseInt(delaySlider.value, 10) * 60;
                publishValue('Vehicle.Cabin.ChildPresenceDetection.DelayNotification', secondsValue);
                
                delaySlider.disabled = true;
                if(btnMinus) btnMinus.disabled = true;
                if(btnPlus) btnPlus.disabled = true;
                if(delayTextWrapper) delayTextWrapper.classList.add("section-locked");
                if(delayBottomControls) delayBottomControls.classList.add("section-locked");
            } else {
                if(delaySlider) delaySlider.disabled = false;
                if(btnMinus) btnMinus.disabled = false;
                if(btnPlus) btnPlus.disabled = false;
                if(delayTextWrapper) delayTextWrapper.classList.remove("section-locked");
                if(delayBottomControls) delayBottomControls.classList.remove("section-locked");
            }
        });
    }

    // 6. Provedení hned po načtení (aby se text nastavil podle výchozí pozice slideru)
    updateDelayUI();

    // ZÁMEK
    toggleEnable.addEventListener("change", function() {
        if (this.checked) {
            // Zamknout text nahoře i slider dole
            if(delayTextWrapper) delayTextWrapper.classList.add("section-locked");
            if(delayBottomControls) delayBottomControls.classList.add("section-locked");
            delaySlider.disabled = true;
            btnMinus.disabled = true;
            btnPlus.disabled = true;
            sendDelayValue(currentMinutes);
        } else {
            // Odemknout
            if(delayTextWrapper) delayTextWrapper.classList.remove("section-locked");
            if(delayBottomControls) delayBottomControls.classList.remove("section-locked");
            delaySlider.disabled = false;
            btnMinus.disabled = false;
            btnPlus.disabled = false;
        }
    });

    // PŘEPÍNÁNÍ ZOBRAZENÍ
    menuButtons.forEach(button => {
        button.addEventListener("click", function() {
            menuButtons.forEach(btn => btn.classList.remove("active"));
            this.classList.add("active");

            const targetScreenId = this.getAttribute("data-screen");
            
            screens.forEach(screen => {
                screen.style.display = (screen.id === targetScreenId) ? "block" : "none";
            });

            // Logika pro spodní plochu a auto
            if (targetScreenId === "sdv-screen-info") {
                // INFO: Vše plně viditelné
                if(seatMap) {
                    seatMap.style.display = "flex";
                    seatMap.classList.remove("dimmed");
                }
                if(timeBar) {
                    timeBar.style.display = "flex";
                    timeBar.classList.remove("dimmed");
                }
                if(delayBottomControls) delayBottomControls.style.display = "none";
                
            } else if (targetScreenId === "sdv-screen-delay") {
                // DELAY: Auto i časomíra úplně zmizí, ukáže se slider
                if(seatMap) seatMap.style.display = "none"; 
                if(timeBar) timeBar.style.display = "none";
                if(delayBottomControls) delayBottomControls.style.display = "flex";
                
            } else if (targetScreenId === "sdv-screen-settings") {
                // SETTINGS: Auto i časomíra jsou vidět, ale ztlumené na pozadí
                if(seatMap) {
                    seatMap.style.display = "flex";
                    seatMap.classList.add("dimmed");
                }
                if(timeBar) {
                    timeBar.style.display = "flex";
                    timeBar.classList.add("dimmed");
                }
                if(delayBottomControls) delayBottomControls.style.display = "none";
            }
        });
    });

    // Skrýt slider rovnou po načtení (pokud je defaultně vybráno Info)
    if(delayBottomControls) delayBottomControls.style.display = "none";
});
