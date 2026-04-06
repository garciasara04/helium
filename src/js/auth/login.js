document.addEventListener("DOMContentLoaded", () => {

  const card = document.getElementById("loginCard");

  if (card) {

    requestAnimationFrame(() => {

      card.classList.remove("opacity-0", "translate-y-6");
      card.classList.add("opacity-100", "translate-y-0");

    });


  }

  

});