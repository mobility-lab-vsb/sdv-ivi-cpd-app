const eventSource = new EventSource('/events');

// Function to publish values to KUKSA via POST request
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

// Function to update child presence detection icons based on seat status
function updateCPD(elementId, isDetected) {
    const el = document.getElementById(elementId);
    if (el) {
        el.style.opacity = isDetected ? "1" : "0";
        el.style.transition = "opacity 0.3s ease";
    }
}

// Delay notification controls logic
function initDelayControls() {
    const toggleEnable = document.getElementById("sdv-enable-delay-toggle");
    const delaySlider = document.getElementById("sdv-delay-slider");
    const delayBottomControls = document.getElementById("delay-bottom-controls");
    const delayTextWrapper = document.getElementById("delay-text-wrapper");
    const timeDisplay = document.getElementById("delay-time-display");
    const btnMinus = document.getElementById("sdv-delay-minus");
    const btnPlus = document.getElementById("sdv-delay-plus");

    if (delayBottomControls) delayBottomControls.style.display = "none";

    const updateDelayUI = () => {
        const val = parseInt(delaySlider.value, 10);
        const min = parseInt(delaySlider.min || 0, 10);
        const max = parseInt(delaySlider.max || 10, 10);
        const percent = ((val - min) / (max - min)) * 100;
        
        delaySlider.style.background = `linear-gradient(to right, #45aa73 ${percent}%, rgba(255, 255, 255, 0.15) ${percent}%)`;
        timeDisplay.innerText = `${val} ${val === 1 ? 'minute' : 'minutes'}`;
    };

    const changeDelay = (delta) => {
        if (toggleEnable && toggleEnable.checked) return;
        
        const currentVal = parseInt(delaySlider.value, 10);
        const min = parseInt(delaySlider.min || 0, 10);
        const max = parseInt(delaySlider.max || 10, 10);
        
        const newVal = Math.max(min, Math.min(max, currentVal + delta));
        
        if (newVal !== currentVal) {
            delaySlider.value = newVal;
            updateDelayUI();
        }
    };

    delaySlider.addEventListener('input', updateDelayUI);
    if (btnMinus) btnMinus.addEventListener('click', () => changeDelay(-1));
    if (btnPlus) btnPlus.addEventListener('click', () => changeDelay(1));

    if (toggleEnable) {
        toggleEnable.addEventListener('change', (e) => {
            const isConfirmed = e.target.checked;
            
            [delayTextWrapper, delayBottomControls].forEach(el => {
                if (el) el.classList.toggle("section-locked", isConfirmed);
            });
            
            [delaySlider, btnMinus, btnPlus].forEach(el => {
                if (el) el.disabled = isConfirmed;
            });

            if (isConfirmed) {
                const secondsValue = parseInt(delaySlider.value, 10) * 60;
                publishValue('Vehicle.Cabin.ChildPresenceDetection.DelayNotification', secondsValue);
            }
        });
    }

    updateDelayUI();
}

// Menu navigation logic to switch between screens and manage visibility of elements based on active screen
function initNavigation() {
    const menuButtons = document.querySelectorAll(".left-menu button");
    const screens = document.querySelectorAll(".sdv-screen");
    const seatMap = document.querySelector(".seats");
    const timeBar = document.querySelector(".time-with-status");
    const delayBottomControls = document.getElementById("delay-bottom-controls");

    menuButtons.forEach(button => {
        button.addEventListener("click", function() {
            menuButtons.forEach(btn => btn.classList.remove("active"));
            this.classList.add("active");

            const targetScreenId = this.getAttribute("data-screen");
            
            screens.forEach(screen => {
                screen.style.display = (screen.id === targetScreenId) ? "block" : "none";
            });

            const isDelay = targetScreenId === "sdv-screen-delay";
            const isSettings = targetScreenId === "sdv-screen-settings";

            if (seatMap) {
                seatMap.style.display = isDelay ? "none" : "flex";
                seatMap.classList.toggle("dimmed", isSettings);
            }

            if (timeBar) {
                timeBar.style.display = isDelay ? "none" : "flex";
                timeBar.classList.toggle("dimmed", isSettings);
            }

            if (delayBottomControls) {
                delayBottomControls.style.display = isDelay ? "flex" : "none";
            }
        });
    });
}

document.addEventListener("DOMContentLoaded", () => {

    const menuButtons = document.querySelectorAll(".left-menu button");

    // Inicialization of delay controls and navigation
    initDelayControls();
    initNavigation();

    // Menu control logic for active state
    menuButtons.forEach(button => {
    button.addEventListener("click", function() {

        menuButtons.forEach(btn => btn.classList.remove("active"));
        
        this.classList.add("active");
    });
    });

    // Toggle switches
    const disableChildToggle = document.getElementById('disable-child-toggle');
    const devModeToggle = document.getElementById('dev-mode-toggle');

    disableChildToggle?.addEventListener('change', (e) => {
        // Reversed logic: when toggle is checked, CPD system is NOT active
        publishValue('Vehicle.Cabin.ChildPresenceDetection.IsCPDSystemActive', !e.target.checked);
    });

    devModeToggle?.addEventListener('change', (e) => {
        publishValue('Vehicle.Cabin.ChildPresenceDetection.IsDeveloperOptionActive', e.target.checked);
    });

    updateDelayUI();
});


// Processing incoming data from KUKSA and updating the UI accordingly
eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);

    // Main system status update
    if (data["Vehicle.Cabin.ChildPresenceDetection.SystemStatus"] !== undefined){
        const mainStatusEl = document.querySelector('#sdv-screen-info .system-status-text');
        const statusText = data["Vehicle.Cabin.ChildPresenceDetection.SystemStatus"];
        if (mainStatusEl) mainStatusEl.innerText = statusText;
    }

    // Child seat occupancy detection updates
    updateCPD('cpd-front-left',   !!data["Vehicle.Cabin.Seat.Row1.DriverSide.Occupant.Identifier.Issuer"]);
    updateCPD('cpd-front-right',  !!data["Vehicle.Cabin.Seat.Row1.PassengerSide.Occupant.Identifier.Issuer"]);
    updateCPD('cpd-rear-left',    !!data["Vehicle.Cabin.Seat.Row2.DriverSide.Occupant.Identifier.Issuer"]);
    updateCPD('cpd-rear-middle',  !!data["Vehicle.Cabin.Seat.Row2.Middle.Occupant.Identifier.Issuer"]);
    updateCPD('cpd-rear-right',   !!data["Vehicle.Cabin.Seat.Row2.PassengerSide.Occupant.Identifier.Issuer"]);

    //updateCPD('cpd-front-left',   (data["Vehicle.Cabin.Seat.Row1.DriverSide.Occupant.Identifier.Issuer"] === "true"));
    //updateCPD('cpd-front-right',  (data["Vehicle.Cabin.Seat.Row1.PassengerSide.Occupant.Identifier.Issuer"] === "true"));
    //updateCPD('cpd-rear-left',    (data["Vehicle.Cabin.Seat.Row2.DriverSide.Occupant.Identifier.Issuer"] === "true"));
    //updateCPD('cpd-rear-middle',  (data["Vehicle.Cabin.Seat.Row2.Middle.Occupant.Identifier.Issuer"] === "true"));
    //updateCPD('cpd-rear-right',   (data["Vehicle.Cabin.Seat.Row2.PassengerSide.Occupant.Identifier.Issuer"] === "true"));

    // Breathing
    function updateBreathingUI(val, valId, statusId, iconId) {
        const rateEl = document.getElementById(valId);
        const statusEl = document.getElementById(statusId);
        const iconEl = iconId ? document.getElementById(iconId) : null; 
        const container = statusEl?.closest('.status, .status-sdv');

        if (rateEl) rateEl.innerText = val > 0 ? val : "--";
        
        if (statusEl && container) {
            container.classList.remove('state-stable', 'state-elevated', 'state-inactive');

            if (val > 0 && val < 40) {
                statusEl.innerText = "Stable Breathing";
                container.classList.add('state-stable');
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

    if (data["Vehicle.Cabin.ChildPresenceDetection.UWBBreathing"] !== undefined) {
        const val = parseInt(data["Vehicle.Cabin.ChildPresenceDetection.UWBBreathing"], 10); 

        updateBreathingUI(val, 'breathing-value-sdv', 'breathing-status-sdv', null);
    }

    // Temperature
        function updateTemperatureUI(val, valId, statusId, iconId) {
            const tempEl = document.getElementById(valId);
            const statusEl = document.getElementById(statusId);
            const iconEl = iconId ? document.getElementById(iconId) : null;
            const container = statusEl?.closest('.status, .status-sdv');

            if (tempEl) tempEl.innerText = val !== undefined ? val : "--";

            if (statusEl && container) {
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

        if (data["Vehicle.Cabin.HVAC.AmbientAirTemperature"] !== undefined) {
            const val = parseInt(data["Vehicle.Cabin.HVAC.AmbientAirTemperature"], 10);

            updateTemperatureUI(val, 'internal-temp-value-sdv', 'internal-temp-status-sdv', null);
        }

    // Counter and progress bar for driver notification delay
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

    // Toggle switches synchronization with incoming data
    if (data["Vehicle.Cabin.ChildPresenceDetection.IsCPDSystemActive"] !== undefined) {
        const toggle = document.getElementById('disable-child-toggle');
        if (toggle) toggle.checked = !data["Vehicle.Cabin.ChildPresenceDetection.IsCPDSystemActive"];
    }
    if (data["Vehicle.Cabin.ChildPresenceDetection.IsDeveloperOptionActive"] !== undefined) {
        const toggle = document.getElementById('dev-mode-toggle');
        if (toggle) toggle.checked = (data["Vehicle.Cabin.ChildPresenceDetection.IsDeveloperOptionActive"] === true || data["Vehicle.Cabin.ChildPresenceDetection.IsDeveloperOptionActive"] === 1);
    }

    // Slider synchronization
    if (data["Vehicle.Cabin.ChildPresenceDetection.DelayNotification"] !== undefined) {
        const minutes = Math.floor(data["Vehicle.Cabin.ChildPresenceDetection.DelayNotification"] / 60);
        const slider = document.getElementById('sdv-delay-slider');
        if (slider) {
            slider.value = minutes;
            updateDelayUI();
        }
    }
};