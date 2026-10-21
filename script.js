
const API_URL =
  "https://script.google.com/macros/s/AKfycbwL0dkMjE8-eWpS7A6zEV0FUKmOzaxjzOuT-9FWGvo673sg-ln9mVtv-EchNWckTuLM/exec";

const KUNCI_SESI = "ASAS_V2_TOKEN_SESI";

const loginPanel = document.getElementById("loginPanel");
const studentPanel = document.getElementById("studentPanel");
const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const statusElement = document.getElementById("status");

async function panggilAPI(data) {
  const respons = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=UTF-8"
    },
    body: JSON.stringify(data),
    redirect: "follow"
  });

  if (!respons.ok) {
    throw new Error("Server memulangkan ralat HTTP.");
  }

  return await respons.json();
}

loginForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const noPelajar = document
    .getElementById("noPelajar")
    .value.trim();

  const pin = document.getElementById("pin").value;

  if (!/^\d{6}$/.test(pin)) {
    statusElement.textContent = "PIN mestilah tepat 6 digit.";
    return;
  }

  loginButton.disabled = true;
  statusElement.textContent = "Sedang mengesahkan login...";

  try {
    const hasil = await panggilAPI({
      tindakan: "login",
      noPelajar: noPelajar,
      pin: pin
    });

    if (!hasil.berjaya || !hasil.tokenSesi || !hasil.pelajar) {
      statusElement.textContent =
        hasil.mesej || "Login tidak berjaya.";
      return;
    }

    sessionStorage.setItem(KUNCI_SESI, hasil.tokenSesi);

paparProfilPelajar(hasil.pelajar);
loginForm.reset();
statusElement.textContent = "Login berjaya.";

await muatkanSubjek();

  } catch (ralat) {
    console.error("Ralat login:", ralat);
    statusElement.textContent =
      "Sambungan login gagal. Cuba lagi dan semak jika terdapat ralat CORS.";
  } finally {
    loginButton.disabled = false;
  }
});

function paparProfilPelajar(pelajar) {
  loginPanel.hidden = true;
  studentPanel.hidden = false;

  document.getElementById("namaPelajar").textContent =
    pelajar.nama || "";

  document.getElementById("maklumatPelajar").textContent =
    "No. pelajar: " + (pelajar.noPelajar || "") +
    " | Kelas: " + (pelajar.kelas || "") +
    " | Semester: " + (pelajar.semester || "");

  document.getElementById("statusPelajar").textContent =
    "Login berjaya. Sesi pelajar telah diwujudkan.";
}

async function muatkanSubjek() {
  const statusSubjek = document.getElementById("statusSubjek");
  const senaraiSubjek = document.getElementById("senaraiSubjek");
  const tokenSesi = sessionStorage.getItem(KUNCI_SESI);

  senaraiSubjek.replaceChildren();
  statusSubjek.textContent = "Sedang memuatkan subjek...";

  try {
    const hasil = await panggilAPI({
      tindakan: "senaraiSubjek",
      tokenSesi: tokenSesi
    });

    if (!hasil.berjaya || !Array.isArray(hasil.subjek)) {
      statusSubjek.textContent =
        hasil.mesej || "Subjek tidak dapat dimuatkan.";
      return;
    }

    if (hasil.subjek.length === 0) {
      statusSubjek.textContent =
        "Tiada subjek aktif untuk semester dan program anda.";
      return;
    }

    statusSubjek.textContent =
      "Jumlah subjek: " + hasil.subjek.length;

    hasil.subjek.forEach(function (subjek) {
      const kad = document.createElement("div");
      const tajuk = document.createElement("h3");
      const kod = document.createElement("p");

      tajuk.textContent = subjek.namaKursus;
      kod.textContent = "Kod kursus: " + subjek.kodKursus;

      kad.appendChild(tajuk);
      kad.appendChild(kod);
      senaraiSubjek.appendChild(kad);
    });
  } catch (ralat) {
    console.error("Ralat memuatkan subjek:", ralat);
    statusSubjek.textContent =
      "Subjek gagal dimuatkan. Sila cuba log masuk semula.";
  }
}

document
  .getElementById("logoutButton")
  .addEventListener("click", async function () {
    const tokenSesi = sessionStorage.getItem(KUNCI_SESI);

    this.disabled = true;

    try {
      if (tokenSesi) {
        await panggilAPI({
          tindakan: "logout",
          tokenSesi: tokenSesi
        });
      }

      tamatkanPaparanSesi();

    } catch (ralat) {
      console.error("Ralat logout:", ralat);
      document.getElementById("statusPelajar").textContent =
        "Logout belum dapat disahkan oleh server. Cuba lagi.";
    } finally {
      this.disabled = false;
    }
  });

function tamatkanPaparanSesi() {
  sessionStorage.removeItem(KUNCI_SESI);
  studentPanel.hidden = true;
  loginPanel.hidden = false;
  statusElement.textContent = "Anda telah log keluar.";
}
