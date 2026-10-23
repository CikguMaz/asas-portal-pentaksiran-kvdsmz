// PULIHKAN PAPARAN LOGIN SEMASA HALAMAN DIBUKA
document.addEventListener("DOMContentLoaded", function () {
  const loginPanel = document.getElementById("loginPanel");
  const dashboardPanel = document.getElementById("dashboardPanel");

  if (loginPanel) {
    loginPanel.hidden = false;
    loginPanel.classList.remove("hidden");
  }

  if (dashboardPanel) {
    dashboardPanel.hidden = true;
    dashboardPanel.classList.add("hidden");
  }
});
const API_URL = "https://script.google.com/macros/s/AKfycbwL0dkMjE8-eWpS7A6zEV0FUKmOzaxjzOuT-9FWGvo673sg-ln9mVtv-EchNWckTuLM/exec";

const KUNCI_SESI_PENSYARAH = "ASAS_V2_TOKEN_PENSYARAH";

const loginPanel = document.getElementById("loginPanel");
const dashboardPanel = document.getElementById("dashboardPanel");
const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const loginStatus = document.getElementById("loginStatus");
const dashboardStatus = document.getElementById("dashboardStatus");

let semuaKeputusan = [];
let kelasTersedia = [];
let pentaksiranTersedia = [];
let namaPensyarah = "";

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
    throw new Error("Pelayan memulangkan ralat HTTP.");
  }

  return respons.json();
}

// ==============================
// LOGIN PENSYARAH
// ==============================

loginForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const idPensyarah = document
    .getElementById("idPensyarah")
    .value.trim();

  const pin = document.getElementById("pinPensyarah").value;

  if (!idPensyarah || !/^\d{6}$/.test(pin)) {
    loginStatus.textContent =
      "Masukkan ID pensyarah dan PIN yang mengandungi 6 digit.";
    return;
  }

  loginButton.disabled = true;
  loginStatus.textContent = "Sedang mengesahkan login...";

  try {
    const hasil = await panggilAPI({
      tindakan: "loginPensyarah",
      idPensyarah: idPensyarah,
      pin: pin
    });

    if (!hasil.berjaya || !hasil.tokenPensyarah) {
      loginStatus.textContent =
        hasil.mesej || "Login tidak berjaya.";
      return;
    }

    sessionStorage.setItem(
      KUNCI_SESI_PENSYARAH,
      hasil.tokenPensyarah
    );

    namaPensyarah =
      hasil.pensyarah?.nama ||
      hasil.pensyarah?.idPensyarah ||
      "Pensyarah";

    loginForm.reset();
    loginPanel.hidden = true;
    dashboardPanel.hidden = false;

    document.getElementById("namaPensyarah").textContent =
      "Log masuk sebagai " + namaPensyarah;

    loginStatus.textContent = "";
    await muatDashboardPensyarah();

  } catch (ralat) {
    console.error(ralat);
    loginStatus.textContent =
      "Login gagal disambungkan. Semak URL Apps Script dan deployment.";
  } finally {
    loginButton.disabled = false;
  }
});

// ==============================
// MUAT DATA DASHBOARD
// ==============================

async function muatDashboardPensyarah() {
  const token = sessionStorage.getItem(KUNCI_SESI_PENSYARAH);

  if (!token) {
    tamatkanSesiPensyarah("Sila log masuk semula.");
    return;
  }

  dashboardStatus.textContent = "Sedang memuatkan keputusan...";

  try {
    const hasil = await panggilAPI({
      tindakan: "dashboardPensyarah",
      tokenPensyarah: token,
      kelas: document.getElementById("filterKelas").value,
      kodPentaksiran:
        document.getElementById("filterPentaksiran").value,
      carian: document.getElementById("carian").value.trim()
    });

    if (!hasil.berjaya) {
      tamatkanSesiPensyarah(
        hasil.mesej || "Sesi tamat. Sila log masuk semula."
      );
      return;
    }

    const ringkasan = hasil.ringkasan || {};

    document.getElementById("jumlahPelajar").textContent =
      ringkasan.jumlahPelajar ?? 0;

    document.getElementById("purataMarkah").textContent =
      (ringkasan.purataMarkah ?? 0) + "%";

    document.getElementById("kadarLulus").textContent =
      (ringkasan.kadarLulus ?? 0) + "%";

    document.getElementById("jumlahRekod").textContent =
      ringkasan.jumlahRekod ?? 0;

    kelasTersedia = hasil.kelas || [];
    pentaksiranTersedia = hasil.pentaksiran || [];
    semuaKeputusan = hasil.keputusan || [];

    kemasKiniPilihan(
      "filterKelas",
      kelasTersedia,
      "Semua kelas"
    );

    kemasKiniPilihan(
      "filterPentaksiran",
      pentaksiranTersedia,
      "Semua pentaksiran"
    );

    paparKeputusan(semuaKeputusan);

    dashboardStatus.textContent =
      hasil.mesej ||
      "Keputusan berjaya dimuatkan: " +
      semuaKeputusan.length + " rekod.";

  } catch (ralat) {
    console.error(ralat);
    dashboardStatus.textContent =
      "Gagal memuatkan dashboard. Semak sambungan dan URL API.";
  }
}

// ==============================
// PILIHAN KELAS DAN PENTAKSIRAN
// ==============================

function kemasKiniPilihan(id, senarai, labelSemua) {
  const elemen = document.getElementById(id);
  const nilaiSemasa = elemen.value;

  elemen.replaceChildren();

  const pilihanSemua = document.createElement("option");
  pilihanSemua.value = "";
  pilihanSemua.textContent = labelSemua;
  elemen.appendChild(pilihanSemua);

  senarai.forEach(function (nilai) {
    const pilihan = document.createElement("option");
    pilihan.value = nilai;
    pilihan.textContent = nilai;
    elemen.appendChild(pilihan);
  });

  if (senarai.includes(nilaiSemasa)) {
    elemen.value = nilaiSemasa;
  }
}

// ==============================
// PAPAR JADUAL KEPUTUSAN
// ==============================

function paparKeputusan(senarai) {
  const tbody = document.getElementById("jadualKeputusan");
  tbody.replaceChildren();

  if (!senarai.length) {
    const baris = document.createElement("tr");
    const sel = document.createElement("td");

    sel.colSpan = 8;
    sel.textContent = "Tiada keputusan ditemui.";

    baris.appendChild(sel);
    tbody.appendChild(baris);
    return;
  }

  senarai.forEach(function (rekod, indeks) {
    const baris = document.createElement("tr");

    const nilai = [
      indeks + 1,
      rekod.noPelajar,
      rekod.nama,
      rekod.kelas,
      rekod.kodPentaksiran,
      (rekod.markah ?? 0) + " / " + (rekod.markahPenuh ?? 0),
      (rekod.peratus ?? 0) + "%",
      rekod.status || ""
    ];

    nilai.forEach(function (teks) {
      const sel = document.createElement("td");
      sel.textContent = String(teks);
      baris.appendChild(sel);
    });

    tbody.appendChild(baris);
  });
}

// ==============================
// PENAPIS KEPUTUSAN
// ==============================

let pemasaCarian;

document.getElementById("carian").addEventListener(
  "input",
  function () {
    clearTimeout(pemasaCarian);

    pemasaCarian = setTimeout(function () {
      muatDashboardPensyarah();
    }, 350);
  }
);

document.getElementById("filterKelas").addEventListener(
  "change",
  muatDashboardPensyarah
);

document.getElementById("filterPentaksiran").addEventListener(
  "change",
  muatDashboardPensyarah
);

document.getElementById("resetFilter").addEventListener(
  "click",
  function () {
    document.getElementById("carian").value = "";
    document.getElementById("filterKelas").value = "";
    document.getElementById("filterPentaksiran").value = "";

    muatDashboardPensyarah();
  }
);

// ==============================
// LOG KELUAR
// ==============================

document.getElementById("logoutButton").addEventListener(
  "click",
  async function () {
    const token = sessionStorage.getItem(KUNCI_SESI_PENSYARAH);
    this.disabled = true;

    try {
      if (token) {
        await panggilAPI({
          tindakan: "logoutPensyarah",
          tokenPensyarah: token
        });
      }

      tamatkanSesiPensyarah("Anda telah log keluar.");

    } catch (ralat) {
      console.error(ralat);
      dashboardStatus.textContent =
        "Log keluar gagal disahkan. Cuba sekali lagi.";
    } finally {
      this.disabled = false;
    }
  }
);

function tamatkanSesiPensyarah(mesej) {
  sessionStorage.removeItem(KUNCI_SESI_PENSYARAH);

  semuaKeputusan = [];
  kelasTersedia = [];
  pentaksiranTersedia = [];

  dashboardPanel.hidden = true;
  loginPanel.hidden = false;

  dashboardStatus.textContent = "";
  loginStatus.textContent = mesej;

  document.getElementById("jadualKeputusan").replaceChildren();
  document.getElementById("jumlahPelajar").textContent = "0";
  document.getElementById("purataMarkah").textContent = "0%";
  document.getElementById("kadarLulus").textContent = "0%";
  document.getElementById("jumlahRekod").textContent = "0";
}
