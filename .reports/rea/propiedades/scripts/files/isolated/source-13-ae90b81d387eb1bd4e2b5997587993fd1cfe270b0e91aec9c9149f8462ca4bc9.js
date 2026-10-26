

document.addEventListener("DOMContentLoaded", function () {
  const customSelect = document.querySelector(".drop_select");
  const selectButton = document.querySelector(".drop_tog_select");
  const textDropSelect = selectButton.querySelector(".text_drop_select"); 
  const dropdown = document.querySelector(".drop_list_option_select");
  const realSelect = document.getElementById("real-select");

 
  dropdown.innerHTML = "";
  realSelect.querySelectorAll("option").forEach((option, index) => {
    if (index === 0) return; 
    const div = document.createElement("div");
    div.classList.add("option_drop_select");
    div.textContent = option.textContent;
    div.dataset.value = option.value;
    dropdown.appendChild(div);
  });


  const selectedOption = realSelect.querySelector("option[selected]") || realSelect.options[0];
  if (selectedOption) {
    textDropSelect.textContent = selectedOption.textContent;
    selectButton.dataset.value = selectedOption.value;
  }

  dropdown.querySelectorAll(".option_drop_select").forEach((item) => {
    item.addEventListener("click", function () {
      const selectedValue = this.dataset.value;

      dropdown.querySelectorAll(".option_drop_select").forEach(el => el.classList.remove("is-active"));

      this.classList.add("is-active");

      textDropSelect.textContent = this.textContent;
      textDropSelect.classList.add("is-active");
      selectButton.dataset.value = selectedValue;
      realSelect.value = selectedValue;

      closeAllDropdowns();
    });
  });


  document.addEventListener("click", function (e) {
    if (!customSelect.contains(e.target)) {
      closeAllDropdowns();
    }
  });



  function closeAllDropdowns() {
     $('.drop_tog_select').closest('.w-dropdown').triggerHandler('w-close');
  }


});

