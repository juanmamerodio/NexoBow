
document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".drop_prod_slide").forEach((dropToggle, index) => {
    const dropBox = document.querySelectorAll(".bx_drop_prod_slide")[index];
    const dropLine = document.querySelectorAll(".line_ver_prod_slide")[index];

    if (!dropBox || !dropLine) return;

    dropToggle.addEventListener("click", function (event) {
      event.stopPropagation(); 
      const isActive = dropBox.classList.contains("is-active");

      
      document.querySelectorAll(".bx_drop_prod_slide").forEach((el) => el.classList.remove("is-active"));
      document.querySelectorAll(".line_ver_prod_slide").forEach((el) => el.classList.remove("is-active"));

    
      if (!isActive) {
        dropBox.classList.add("is-active");
        dropLine.classList.add("is-active");
      }
    });
  });


  document.addEventListener("click", function (event) {
    if (!event.target.closest(".drop_prod_slide") && !event.target.closest(".bx_drop_prod_slide")) {
      document.querySelectorAll(".bx_drop_prod_slide").forEach((el) => el.classList.remove("is-active"));
      document.querySelectorAll(".line_ver_prod_slide").forEach((el) => el.classList.remove("is-active"));
    }
  });
});
