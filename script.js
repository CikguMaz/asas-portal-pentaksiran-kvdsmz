
const API_URL = "https://script.google.com/macros/s/AKfycbwL0dkMjE8-eWpS7A6zEV0FUKmOzaxjzOuT-9FWGvo673sg-ln9mVtv-EchNWckTuLM/exec";
const KUNCI_SESI_PENSYARAH = "ASAS_V2_TOKEN_PENSYARAH";

let semuaKeputusan = [];
let kelasTersedia = [];
let pentaksiranTersedia = [];
let namaPensyarah = "";
let pemasaCarian = null;

const $ = (id) => document.getElementById(id);

function paparLoginAwal() {
  const loginPanel = $("loginPanel");
  const dashboardPanel = $("dashboardPanel");

  if (loginPanel) {
    loginPanel.hidden = false;
    loginPanel.classList.remove("hidden");
  }

  if (dashboardPanel) {
    dashboardPanel.hidden = true;
    dashboardPanel.classList.add("hidden");
  }
}

async function panggilAPI(data) {
  const respons = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=UTF-8"
    },
    body: JSON.stringify(data),
    redirect: "follow",
    cache: "no-store"
  });

  if (!respons.ok) {
    throw new Error("Pelayan memulangkan ralat HTTP " + respons.status);
  }

  return respons.json();
}

function paparMesejLogin(mesej) {
  const status = $("loginStatus");
  if (status) status.textContent = mesej || "";
}

function paparMesejDashboard(mesej) {
  const status = $("dashboardStatus");
  if (status) status.textContent = mesej || "";
}

// ==============================
// LOGIN PENSYARAH
// ==============================

async function kendaliLogin(event) {
  event.preventDefault();

  const borang = $("loginForm");
  const butang = $("loginButton");
  const idPensyarah = $("idPensyarah")?.value.trim() || "";
  const pin = $("pinPensyarah")?.value || "";

  if (!idPensyarah || !/^\d{6}$/.test(pin)) {
    paparMesejLogin("Masukkan ID pensyarah dan PIN 6 digit.");
    return;
  }

  if (butang) butang.disabled = true;
  paparMesejLogin("Sedang mengesahkan login...");

  try {
    const hasil = await panggilAPI({
      tindakan: "loginPensyarah",
      idPensyarah,
      pin
    });

    console.log("Respons login pensyarah:", {
      berjaya: hasil?.berjaya,
      adaToken: Boolean(hasil?.tokenPensyarah),
      mesej: hasil?.mesej
    });

    if (!hasil?.berjaya || !hasil?.tokenPensyarah) {
      paparMesejLogin(hasil?.mesej || "Login tidak berjaya.");
      return;
    }

    sessionStorage.setItem(
      KUNCI_SESI_PENSYARAH,
      hasil.tokenPensyarah
    );

    namaPensyarah =
      hasil.pensyarah?.nama ||
      hasil.pensyarah?.idPensyarah ||
      idPensyarah;

    if (borang) borang.reset();

    $("loginPanel").hidden = true;
    $("loginPanel").classList.add("hidden");

    $("dashboardPanel").hidden = false;
    $("dashboardPanel").classList.remove("hidden");

    $("namaPensyarah").textContent =
      "Log masuk sebagai " + namaPensyarah;

    paparMesejLogin("");
    paparMesejDashboard("Login berjaya. Sedang memuatkan dashboard...");

    await muatDashboardPensyarah();

  } catch (ralat) {
    console.error("Ralat login:", ralat);
    paparMesejLogin(
      "Tidak dapat menghubungi API. Semak URL dan deployment Apps Script."
    );
  } finally {
    if (butang) butang.disabled = false;
  }
}

// ==============================
// MUAT DATA DASHBOARD
// ==============================

async function muatDashboardPensyarah() {
  const token = sessionStorage.getItem(KUNCI_SESI_PENSYARAH);

  if (!token) {
    tamatkanSesiPensyarah("Sila log masuk semula.");
    return;
  }

  paparMesejDashboard("Sedang memuatkan keputusan...");

  try {
    const hasil = await panggilAPI({
      tindakan: "dashboardPensyarah",
      tokenPensyarah: token,
      kelas: $("filterKelas")?.value || "",
      kodPentaksiran: $("filterPentaksiran")?.value || "",
      carian: $("carian")?.value.trim() || ""
    });

    console.log("Respons dashboard:", {
      berjaya: hasil?.berjaya,
      mesej: hasil?.mesej,
      bilanganKeputusan: Array.isArray(hasil?.keputusan)
        ? hasil.keputusan.length
        : 0
    });

    if (!hasil?.berjaya) {
      // Jangan buang sesi secara automatik untuk semua jenis ralat.
      // Paparkan mesej supaya punca dapat dikenal pasti.
      paparMesejDashboard(
        hasil?.mesej || "Dashboard gagal dimuatkan."
      );
      return;
    }

    const ringkasan = hasil.ringkasan || {};

    $("jumlahPelajar").textContent =
      ringkasan.jumlahPelajar ?? 0;

    $("purataMarkah").textContent =
      (ringkasan.purataMarkah ?? 0) + "%";

    $("kadarLulus").textContent =
      (ringkasan.kadarLulus ?? 0) + "%";

    $("jumlahRekod").textContent =
      ringkasan.jumlahRekod ?? 0;

    kelasTersedia = Array.isArray(hasil.kelas) ? hasil.kelas : [];
    pentaksiranTersedia = Array.isArray(hasil.pentaksiran)
      ? hasil.pentaksiran
      : [];
    semuaKeputusan = Array.isArray(hasil.keputusan)
      ? hasil.keputusan
      : [];

    kemasKiniPilihan("filterKelas", kelasTersedia, "Semua kelas");
    kemasKiniPilihan(
      "filterPentaksiran",
      pentaksiranTersedia,
      "Semua pentaksiran"
    );

    paparKeputusan(semuaKeputusan);

    paparMesejDashboard(
      hasil.mesej ||
      "Dashboard dimuatkan. Jumlah rekod: " +
      semuaKeputusan.length + "."
    );

  } catch (ralat) {
    console.error("Ralat memuatkan dashboard:", ralat);
    paparMesejDashboard(
      "Login berjaya tetapi dashboard gagal dimuatkan. " +
      "Semak respons API dan deployment."
    );
  }
}

// ==============================
// PILIHAN KELAS DAN PENTAKSIRAN
// ==============================

function kemasKiniPilihan(id, senarai, labelSemua) {
  const elemen = $(id);
  if (!elemen) return;

  const nilaiSemasa = elemen.value;
  elemen.replaceChildren();

  const pilihanSemua = document.createElement("option");
  pilihanSemua.value = "";
  pilihanSemua.textContent = labelSemua;
  elemen.appendChild(pilihanSemua);

  senarai.forEach((nilai) => {
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
  const tbody = $("jadualKeputusan");
  if (!tbody) return;

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

  senarai.forEach((rekod, indeks) => {
    const baris = document.createElement("tr");

    const nilai = [
      indeks + 1,
      rekod.noPelajar ?? "",
      rekod.nama ?? "",
      rekod.kelas ?? "",
      rekod.kodPentaksiran ?? "",
      (rekod.markah ?? 0) + " / " + (rekod.markahPenuh ?? 0),
      (rekod.peratus ?? 0) + "%",
      rekod.status ?? ""
    ];

    nilai.forEach((teks) => {
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

function tetapkanPenapis() {
  $("carian")?.addEventListener("input", function () {
    clearTimeout(pemasaCarian);
    pemasaCarian = setTimeout(muatDashboardPensyarah, 350);
  });

  $("filterKelas")?.addEventListener(
    "change",
    muatDashboardPensyarah
  );

  $("filterPentaksiran")?.addEventListener(
    "change",
    muatDashboardPensyarah
  );

  $("resetFilter")?.addEventListener("click", function () {
    $("carian").value = "";
    $("filterKelas").value = "";
    $("filterPentaksiran").value = "";
    muatDashboardPensyarah();
  });
}

// ==============================
// LOG KELUAR
// ==============================

async function kendaliLogout() {
  const butang = $("logoutButton");
  const token = sessionStorage.getItem(KUNCI_SESI_PENSYARAH);

  if (butang) butang.disabled = true;

  try {
    if (token) {
      await panggilAPI({
        tindakan: "logoutPensyarah",
        tokenPensyarah: token
      });
    }

    tamatkanSesiPensyarah("Anda telah log keluar.");

  } catch (ralat) {
    console.error("Ralat logout:", ralat);
    paparMesejDashboard(
      "Permintaan log keluar gagal. Sesi tempatan akan ditamatkan."
    );
    tamatkanSesiPensyarah("Anda telah log keluar pada peranti ini.");
  } finally {
    if (butang) butang.disabled = false;
  }
}

function tamatkanSesiPensyarah(mesej) {
  sessionStorage.removeItem(KUNCI_SESI_PENSYARAH);

  semuaKeputusan = [];
  kelasTersedia = [];
  pentaksiranTersedia = [];

  if ($("dashboardPanel")) {
    $("dashboardPanel").hidden = true;
    $("dashboardPanel").classList.add("hidden");
  }

  if ($("loginPanel")) {
    $("loginPanel").hidden = false;
    $("loginPanel").classList.remove("hidden");
  }

  paparMesejDashboard("");
  paparMesejLogin(mesej);

  if ($("jadualKeputusan")) {
    $("jadualKeputusan").replaceChildren();
    const baris = document.createElement("tr");
    const sel = document.createElement("td");
    sel.colSpan = 8;
    sel.textContent = "Log masuk untuk melihat keputusan.";
    baris.appendChild(sel);
    $("jadualKeputusan").appendChild(baris);
  }

  if ($("jumlahPelajar")) $("jumlahPelajar").textContent = "0";
  if ($("purataMarkah")) $("purataMarkah").textContent = "0%";
  if ($("kadarLulus")) $("kadarLulus").textContent = "0%";
  if ($("jumlahRekod")) $("jumlahRekod").textContent = "0";
}

// ==============================
// MULAKAN APLIKASI
// ==============================

document.addEventListener("DOMContentLoaded", function () {
  paparLoginAwal();

  $("loginForm")?.addEventListener("submit", kendaliLogin);
  $("logoutButton")?.addEventListener("click", kendaliLogout);

  tetapkanPenapis();

  // Jangan pulihkan dashboard menggunakan token lama secara automatik.
  // Pensyarah perlu log masuk semula untuk mendapatkan sesi yang sah.
  sessionStorage.removeItem(KUNCI_SESI_PENSYARAH);
});
