const spinner = document.getElementById("global-spinner");

if (spinner) {

  let timer = null;
  let spinnerActive = false;


  function showSpinnerDelayed() {
    if (spinnerActive) return;

    spinnerActive = true;

    timer = setTimeout(() => {
      spinner.classList.remove("hidden");
    }, 300); 
  }

  function hideSpinnerSafe() {
    clearTimeout(timer);
    timer = null;
    spinner.classList.add("hidden");
    spinnerActive = false;
  }

  document.addEventListener("click", (e) => {
    const link = e.target.closest("a");

    if (
      link &&
      link.href &&
      !link.target &&
      !link.href.includes("#") &&
      !link.hasAttribute("data-no-spinner")
    ) {
      showSpinnerDelayed();
    }
  });


  window.addEventListener("load", hideSpinnerSafe);

  window.addEventListener("pageshow", (event) => {
    if (event.persisted) hideSpinnerSafe();
  });


  const originalFetch = window.fetch;

  window.fetch = async (...args) => {
    showSpinnerDelayed();

    try {
      return await originalFetch(...args);
    } catch (error) {
      throw error; 
    } finally {
      hideSpinnerSafe(); 
    }
  };

}
