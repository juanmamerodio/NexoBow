
  document.addEventListener("DOMContentLoaded", function() {
    const menuButton = document.querySelector(".w-nav-button"); 
    const closeElement = document.querySelectorAll(".bn_nav");  

    closeElement.forEach(el => {
      el.addEventListener("click", () => {
        if (menuButton.classList.contains("w--open")) {
          menuButton.click(); 
        }
      });
    });
  });
