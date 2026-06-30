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
const delayRange = document.querySelector("#delay-range");
const delayValue = document.querySelector("#delay-value");
const delayMinus = document.querySelector("#delay-minus");
const delayPlus = document.querySelector("#delay-plus");

function updateDelayValue(value) {
  if (!delayRange || !delayValue) return;

  const normalizedValue = Math.max(0, Math.min(10, Number(value)));

  delayRange.value = normalizedValue;
  delayValue.textContent = normalizedValue;
}

if (delayRange) {
  delayRange.addEventListener("input", () => {
    updateDelayValue(delayRange.value);
  });
}

if (delayMinus) {
  delayMinus.addEventListener("click", () => {
    updateDelayValue(Number(delayRange.value) - 1);
  });
}

if (delayPlus) {
  delayPlus.addEventListener("click", () => {
    updateDelayValue(Number(delayRange.value) + 1);
  });
}
``