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

    // --- Nové výběry prvků ---
    const delayBottomControls = document.getElementById("delay-bottom-controls");
    const delayTextWrapper = document.getElementById("delay-text-wrapper");
    
    const toggleEnable = document.getElementById("sdv-enable-delay-toggle");
    const delaySlider = document.getElementById("sdv-delay-slider");
    const timeDisplay = document.getElementById("delay-time-display");
    const btnMinus = document.getElementById("sdv-delay-minus");
    const btnPlus = document.getElementById("sdv-delay-plus");

    let currentMinutes = parseInt(delaySlider.value);

    function updateDelayUI() {
        currentMinutes = parseInt(delaySlider.value);
        timeDisplay.textContent = `${currentMinutes} ${currentMinutes === 1 ? 'minute' : 'minutes'}`;
    }

    function sendDelayValue(minutes) {
        const seconds = minutes * 60;
        console.log(`Hodnota uzamčena: ${seconds} sekund.`);
    }

    btnMinus.addEventListener("click", () => {
        if (!toggleEnable.checked) {
            delaySlider.value = Math.max(0, currentMinutes - 1);
            updateDelayUI();
        }
    });

    btnPlus.addEventListener("click", () => {
        if (!toggleEnable.checked) {
            delaySlider.value = Math.min(10, currentMinutes + 1);
            updateDelayUI();
        }
    });

    delaySlider.addEventListener("input", updateDelayUI);

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
