const eventSource = new EventSource('/events');

// --- 1. GLOBÁLNÍ POMOCNÉ FUNKCE ---

// Funkce pro odesílání dat do KUKSA
async function publishValue(path, value) {
    console.log(`Publishing to KUKSA: ${path} = ${value}`);
    try {
        await fetch('/publish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path, value })
        });
    } catch (err) {
        console.error("Chyba při odesílání:", err);
    }
}

// Nastavení opacity pro ikony miminek
function updateCPD(elementId, isDetected) {
    const el = document.getElementById(elementId);
    if (el) {
        el.style.opacity = isDetected ? "1" : "0";
        el.style.transition = "opacity 0.3s ease";
    }
}

// Funkce pro aktualizaci UI slideru (vytažena ven, aby na ni viděl i SSE stream)
function updateDelayUI() {
    const delaySlider = document.getElementById('delay-slider');
    const delayMinutesText = document.getElementById('delay-minutes-text');
    
    if (!delaySlider) return;
    
    const val = delaySlider.value;
    const percent = ((val - delaySlider.min) / (delaySlider.max - delaySlider.min)) * 100;
    
    // Zelená linka v tracku
    delaySlider.style.background = `linear-gradient(to right, #51f093 ${percent}%, rgba(255, 255, 255, 0.1) ${percent}%)`;
    
    // Text "X minutes"
    if (delayMinutesText) {
        delayMinutesText.innerText = `${val} ${val == 1 ? 'minute' : 'minutes'}`;
    }
}

// --- 2. INICIALIZACE PŘI NAČTENÍ STRÁNKY ---

document.addEventListener('DOMContentLoaded', () => {
    
    // PŘEPÍNÁNÍ OBRAZOVEK
    const menuButtons = document.querySelectorAll('.menu button[data-screen]');
    const screens = document.querySelectorAll('.screen');

    menuButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetScreenId = btn.getAttribute('data-screen');
            menuButtons.forEach(b => b.classList.remove('active-btn'));
            screens.forEach(s => s.classList.remove('active-screen'));
            btn.classList.add('active-btn');
            document.getElementById(targetScreenId)?.classList.add('active-screen');
        });
    });

    // --- LOGIKA DELAY KARET ---
    const delayToggle = document.getElementById('enable-delay-toggle');
    const delaySlider = document.getElementById('delay-slider');
    const delayCard = document.querySelector('#screen-delay .delay-card:last-child');
    const btnMinus = document.getElementById('delay-minus');
    const btnPlus = document.getElementById('delay-plus');

    // Eventy pro Slider (jen vizuální)
    delaySlider?.addEventListener('input', updateDelayUI);

    btnMinus?.addEventListener('click', () => { 
        if (delayToggle && !delayToggle.checked) { 
            delaySlider.value--; 
            updateDelayUI(); 
        }
    });
    btnPlus?.addEventListener('click', () => { 
        if (delayToggle && !delayToggle.checked) {
            delaySlider.value++; 
            updateDelayUI(); 
        }
    });

    // Toggle potrvrzení Delay
    if (delayToggle) {
        delayToggle.addEventListener('change', (e) => {
            const isConfirmed = e.target.checked;
            if (isConfirmed && delaySlider) {
                const secondsValue = parseInt(delaySlider.value, 10) * 60;
                publishValue('Vehicle.Cabin.ChildPresenceDetection.DelayNotification', secondsValue);
                delaySlider.style.pointerEvents = "none";
                if(delayCard) delayCard.style.opacity = "0.7"; 
            } else {
                if(delaySlider) delaySlider.style.pointerEvents = "auto";
                if(delayCard) delayCard.style.opacity = "1";
            }
        });
    }

    // --- LOGIKA SETTINGS TOGGLŮ (Odesílání) ---
    const disableChildToggle = document.getElementById('disable-child-toggle');
    const devModeToggle = document.getElementById('dev-mode-toggle');

    disableChildToggle?.addEventListener('change', (e) => {
        // Odesíláme obrácenou hodnotu (pokud je zaškrtnuto Disable = SystemActive je false)
        publishValue('Vehicle.Cabin.ChildPresenceDetection.IsCPDSystemActive', !e.target.checked);
    });

    devModeToggle?.addEventListener('change', (e) => {
        publishValue('Vehicle.Cabin.ChildPresenceDetection.IsDeveloperOptionActive', e.target.checked);
    });

    // Prvotní vykreslení slideru
    updateDelayUI();
});

// --- 3. PŘÍJEM DAT ZE SERVERU (SSE) ---

eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);

    // HLAVNÍ STATUS (Nadpis Info obrazovky)
    if (data["Vehicle.Cabin.ChildPresenceDetection.SystemStatus"] !== undefined){
        const mainStatusEl = document.querySelector('#screen-info .system-status-text');
        const statusText = data["Vehicle.Cabin.ChildPresenceDetection.SystemStatus"];
        if (mainStatusEl) mainStatusEl.innerText = statusText;
    }

    // SEDADLA
    updateCPD('cpd-front-left',   (data["Vehicle.Cabin.Seat.Row1.DriverSide.Occupant.Identifier.Issuer"] === "true"));
    updateCPD('cpd-front-right',  (data["Vehicle.Cabin.Seat.Row1.PassengerSide.Occupant.Identifier.Issuer"] === "true"));
    updateCPD('cpd-rear-left',    (data["Vehicle.Cabin.Seat.Row2.DriverSide.Occupant.Identifier.Issuer"] === "true"));
    updateCPD('cpd-rear-middle',  (data["Vehicle.Cabin.Seat.Row2.Middle.Occupant.Identifier.Issuer"] === "true"));
    updateCPD('cpd-rear-right',   (data["Vehicle.Cabin.Seat.Row2.PassengerSide.Occupant.Identifier.Issuer"] === "true"));

    //DECH
    function updateBreathingUI(val, valId, statusId, iconId) {
        const rateEl = document.getElementById(valId);
        const statusEl = document.getElementById(statusId);
        const iconEl = iconId ? document.getElementById(iconId) : null; 
        const container = statusEl?.closest('.status, .status-sdv');

        if (rateEl) rateEl.innerText = val > 0 ? val : "--";
        
        if (statusEl && container) {
            // Nejprve odstraníme všechny případné předchozí stavy, aby se netloukly
            container.classList.remove('state-stable', 'state-elevated', 'state-inactive');

            if (val > 0 && val < 40) {
                statusEl.innerText = "Stable Breathing";
                container.classList.add('state-stable'); // Přidáme stavovou třídu
                if (iconEl) iconEl.innerHTML = "&#xe90a;";
            } else if (val >= 40) {
                statusEl.innerText = "Elevated Breathing";
                container.classList.add('state-elevated');
                if (iconEl) iconEl.innerHTML = "&#xe90d;";
            } else {
                statusEl.innerText = "Inactive / No Data";
                container.classList.add('state-inactive');
                if (iconEl) iconEl.innerHTML = "&#xf000;";
            }
        }
    }

    // Hlavní zpracování dat
    if (data["Vehicle.Cabin.ChildPresenceDetection.UWBBreathing"] !== undefined) {
        const val = parseInt(data["Vehicle.Cabin.ChildPresenceDetection.UWBBreathing"], 10);
        
        // 1. Aktualizace pro Škoda theme (má ikonu)
        updateBreathingUI(val, 'breathing-value', 'breathing-status', 'breathing-icon');
        
        // 2. Aktualizace pro SDV theme (nemá ikonu, posíláme null)
        updateBreathingUI(val, 'breathing-value-sdv', 'breathing-status-sdv', null);
    }

    // TEPLOTA
        function updateTemperatureUI(val, valId, statusId, iconId) {
            const tempEl = document.getElementById(valId);
            const statusEl = document.getElementById(statusId);
            const iconEl = iconId ? document.getElementById(iconId) : null;
            const container = statusEl?.closest('.status, .status-sdv');

            if (tempEl) tempEl.innerText = val !== undefined ? val : "--";

            if (statusEl && container) {
                // Odstraníme předchozí stavy teploty
                container.classList.remove('state-comfortable', 'state-hot', 'state-cold');

                if (val >= 18 && val <= 26) {
                    statusEl.innerText = "Good / Comfortable";
                    container.classList.add('state-comfortable');
                    if (iconEl) iconEl.innerHTML = "&#xe906;";
                } else if (val > 26) {
                    statusEl.innerText = "Too Hot / Warning";
                    container.classList.add('state-hot');
                    if (iconEl) iconEl.innerHTML = "&#xe90c;";
                } else {
                    statusEl.innerText = "Too Cold / Warning";
                    container.classList.add('state-cold');
                    if (iconEl) iconEl.innerHTML = "&#xe90b;";
                }
            }
        }

        // Hlavní zpracování dat (Teplota)
        if (data["Vehicle.Cabin.HVAC.AmbientAirTemperature"] !== undefined) {
            const val = parseInt(data["Vehicle.Cabin.HVAC.AmbientAirTemperature"], 10);

            // 1. Aktualizace pro Škoda theme (má ikonu)
            updateTemperatureUI(val, 'internal-temp-value', 'internal-temp-status', 'internal-temp-icon');

            // 2. Aktualizace pro SDV theme (nemá ikonu, posíláme null)
            updateTemperatureUI(val, 'internal-temp-value-sdv', 'internal-temp-status-sdv', null);
        }

    // ODPOČET E-CALLU
    if (data["Vehicle.Cabin.ChildPresenceDetection.NotificationTime"] !== undefined) {
        const timeEl = document.getElementById('remaining-time-text');
        const progressEl = document.getElementById('delay-progress');
        const statusTextEl = document.getElementById('delay-status-text');
        
        if (timeEl) {
            const mins = Math.floor(data["Vehicle.Cabin.ChildPresenceDetection.NotificationTime"] / 60);
            const secs = data["Vehicle.Cabin.ChildPresenceDetection.NotificationTime"] % 60;
            timeEl.innerText = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
            if (data["Vehicle.Cabin.ChildPresenceDetection.NotificationTime"] >= 3600)
            {
                timeEl.style.opacity = "0";
            }
            else
            {
                timeEl.style.opacity = "1";
            }
        }
        if (progressEl) progressEl.style.width = (data["Vehicle.Cabin.ChildPresenceDetection.NotificationTime"] / 600 * 100) + "%";
        
        statusTextEl.innerText = "Notifying driver";
        if (statusTextEl) {
            /*if (data["Vehicle.Cabin.ChildPresenceDetection.NotificationTime"] <= 0) {
                statusTextEl.innerText = "Notifying driver";
            } else {
                statusTextEl.innerText = "Notifying driver";*/
                switch (data["Vehicle.Cabin.ChildPresenceDetection.SystemStatus"])
                {
                    case "INACTIVE":
                        statusTextEl.innerText = "Time until SCAN";
                        break;
                    case "SCAN":
                        if (data["Vehicle.Cabin.ChildPresenceDetection.FusionErrorTime"] > 0)
                        {
                            statusTextEl.innerText = "Time until ERROR";
                        }
                        else
                        {
                            statusTextEl.innerText = "Time until STANDBY";
                        }
                        break;
                    case "DRIVER_NOTIFICATION":
                        statusTextEl.innerText = "Time until EXTERNAL_ALERT";
                        break;
                    case "EXTERNAL_ALERT":
                        statusTextEl.innerText = "Time until INTERVENTION";
                        break;
                    case "INTERVENTION":
                        statusTextEl.innerText = "Time until CARERS_NOTIFICATION";
                        break;
                    case "CARERS_NOTIFICATION":
                        statusTextEl.innerText = "Time until first e-call initiation";
                        break;
                    case "DELAYED":
                        statusTextEl.innerText = "Time until DRIVER_NOTIFICATION";
                        break;
                    case "PAUSED":
                    case "ERROR":
                        timeEl.style.opacity = "0";
                        break;
                }
            /*}*/
        }
    }

    // SYNCHRONIZACE TOGGLŮ
    if (data["Vehicle.Cabin.ChildPresenceDetection.IsCPDSystemActive"] !== undefined) {
        const toggle = document.getElementById('disable-child-toggle');
        if (toggle) toggle.checked = !data["Vehicle.Cabin.ChildPresenceDetection.IsCPDSystemActive"];
    }
    if (data["Vehicle.Cabin.ChildPresenceDetection.IsDeveloperOptionActive"] !== undefined) {
        const toggle = document.getElementById('dev-mode-toggle');
        if (toggle) toggle.checked = (data["Vehicle.Cabin.ChildPresenceDetection.IsDeveloperOptionActive"] === true || data["Vehicle.Cabin.ChildPresenceDetection.IsDeveloperOptionActive"] === 1);
    }

    // SYNCHRONIZACE SLIDERU
    if (data["Vehicle.Cabin.ChildPresenceDetection.DelayNotification"] !== undefined) {
        const minutes = Math.floor(data["Vehicle.Cabin.ChildPresenceDetection.DelayNotification"] / 60);
        const slider = document.getElementById('delay-slider');
        if (slider) {
            slider.value = minutes;
            updateDelayUI();
        }
    }
};