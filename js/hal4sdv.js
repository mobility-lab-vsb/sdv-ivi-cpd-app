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

  menuButtons.forEach(button => {
    button.addEventListener("click", function() {
      // 1. Změna stavu tlačítek (zelená barva, linka)
      menuButtons.forEach(btn => btn.classList.remove("active"));
      this.classList.add("active");

      // 2. Přepnutí obrazovky (Info / Delay / Settings)
      const targetScreenId = this.getAttribute("data-screen");
      
      screens.forEach(screen => {
        if(screen.id === targetScreenId) {
            screen.style.display = "block";
            // Drobný trik pro restartování CSS animace
            screen.classList.remove("active");
            void screen.offsetWidth; 
            screen.classList.add("active");
        } else {
            screen.style.display = "none";
            screen.classList.remove("active");
        }
      });
    });
  });
});