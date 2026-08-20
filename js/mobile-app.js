const menuButtons = document.querySelectorAll(".menu-button");
const tabPanels = document.querySelectorAll(".tab-panel");

function switchTab(tabName) {
  tabPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === `tab-${tabName}`);
  });

  menuButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabName);
  });
}

menuButtons.forEach((button) => {
  button.addEventListener("click", () => {
    switchTab(button.dataset.tab);
  });
});

/* Delay controls */
const delayToggle = document.querySelector("#delay-toggle");
const delayRange = document.querySelector("#delay-range");
const delayValue = document.querySelector("#delay-value");
const delayMinus = document.querySelector("#delay-minus");
const delayPlus = document.querySelector("#delay-plus");

const delayValueCard = document.querySelector(".delay-value-card");
const delaySliderCard = document.querySelector(".delay-slider-card");

function updateDelayValue(value) {
  if (!delayRange || !delayValue) return;

  const min = Number(delayRange.min);
  const max = Number(delayRange.max);
  const normalizedValue = Math.max(min, Math.min(max, Number(value)));

  delayRange.value = normalizedValue;
  delayValue.textContent = normalizedValue;
}

function updateDelayLockState() {
  if (!delayToggle) return;

  const isLocked = delayToggle.checked;

  if (delayRange) {
    delayRange.disabled = isLocked;
  }

  if (delayMinus) {
    delayMinus.disabled = isLocked;
  }

  if (delayPlus) {
    delayPlus.disabled = isLocked;
  }

  delayValueCard?.classList.toggle("disabled", isLocked);
  delaySliderCard?.classList.toggle("disabled", isLocked);
}

delayRange?.addEventListener("input", () => {
  updateDelayValue(delayRange.value);
});

delayMinus?.addEventListener("click", () => {
  updateDelayValue(Number(delayRange.value) - 1);
});

delayPlus?.addEventListener("click", () => {
  updateDelayValue(Number(delayRange.value) + 1);
});

delayToggle?.addEventListener("change", updateDelayLockState);

updateDelayLockState();