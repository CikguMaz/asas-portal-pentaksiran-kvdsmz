
const API_URL = "https://script.google.com/macros/s/AKfycbwL0dkMjE8-eWpS7A6zEV0FUKmOzaxjzOuT-9FWGvo673sg-ln9mVtv-EchNWckTuLM/exec";

async function ujiSambunganAPI() {
  const status = document.getElementById("status");

  status.textContent = "Sedang menguji sambungan...";
  
  try {
    const respons = await fetch(API_URL);
    const data = await respons.json();

    if (
      data.berjaya === true &&
      data.sistem === "ASAS Portal Pentaksiran KVDSMZ V2"
    ) {
      status.textContent = "Sambungan ke server berjaya.";
    } else {
      status.textContent = "Server memberi respons yang tidak dijangka.";
    }
  } catch (ralat) {
    console.error("Ralat sambungan API:", ralat);
    status.textContent =
      "Sambungan gagal. Semak konsol pelayar untuk maklumat lanjut.";
  }
}
