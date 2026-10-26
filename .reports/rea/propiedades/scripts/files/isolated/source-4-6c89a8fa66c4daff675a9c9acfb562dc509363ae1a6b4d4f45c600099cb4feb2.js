
// Get the input field
const phoneInput = document.getElementById("Phone");

phoneInput.addEventListener('input', (e) => {
  let val = e.target.value;

  val = val.replace(/\D/g, '');

  //(starts with 7 or 8, 11 digits)
  if (val.length === 11 && (val[0] === '7' || val[0] === '8')) {
    // Форматирование для России
    e.target.value = val.replace(/^(\d{1})(\d{3})(\d{3})(\d{2})(\d{2})$/, '$1($2)$3-$4-$5');

  // (starts with 1, 11 digits)
  } else if (val.length === 11 && val[0] === '1') {
    e.target.value = val.replace(/^(\d{1})(\d{3})(\d{3})(\d{4})$/, '$1($2)$3-$4');

  //(for example, +44, +49, etc.)
  } else if (val.length >= 12 && val[0] === '+') {
    e.target.value = val.replace(/^(\+?)(\d{1,4})(\d{1,4})(\d{1,4})(\d{1,4})$/, '$1$2($3)$4-$5');
  } else {
    e.target.value = val; 
  }
});
