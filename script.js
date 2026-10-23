// ASAS Portal Pentaksiran KVDSMZ V2 — Dashboard Pensyarah

const API_URL = "https://script.google.com/macros/s/AKfycbwL0dkMjE8-eWpS7A6zEV0FUKmOzaxjzOuT-9FWGvo673sg-ln9mVtv-EchNWckTuLM/exec";
const TOKEN_KEY = "ASAS_V2_TOKEN_PENSYARAH";

const $ = (id) => document.getElementById(id);
const loginForm = $("loginForm");
const loginButton = $("loginButton");
const loginPanel = $("loginPanel");
const dashboardPanel = $("dashboardPanel");
const loginStatus = $("loginStatus");
const dashboardStatus = $("dashboardStatus");

async function panggilAPI(data) {
  let response;

  try {
    response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=UTF-8"
      },
      body: JSON.stringify(data),
      redirect: "follow"
    });
  } catch (error) {
    throw new Error(
      "Tidak dapat menghubungi backend. Semak URL Web App dan deployment Apps Script. Butiran: " +
      error.message
    );
  }

  if (!response.ok) {
    throw new Error("Backend memulangkan HTTP " + response.status + ".");
  }

  try {
    return await response.json();
  } catch (_) {
    throw new Error(
      "Backend tidak memulangkan JSON. Semak URL dan deployment Web App Apps Script."
    );
  }
}

function paparMesej(el, mesej) {
  if (el) el.textContent = mesej || "";
}

function isiSelect(id, nilai, labelSemua) {
  const el = $(id);
  if (!el) return;

  const sebelumnya = el.value;
  el.replaceChildren();

  const semua = document.createElement("option");
  semua.value = "";
  semua.textContent = labelSemua;
  el.appendChild(semua);

  (nilai || []).forEach((item) => {
    const opt = document.createElement("option");
    opt.value = item;
    opt.textContent = item;
    el.appendChild(opt);
  });

  if ((nilai || []).includes(sebelumnya)) {
    el.value = sebelumnya;
  }
}

function paparKeputusan(rows) {
  const tbody = $("jadualKeputusan");
  if (!tbody) return;

  tbody.replaceChildren();

  if (!rows || !rows.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");

    td.colSpan = 8;
    td.textContent =
      "Tiada keputusan sepadan dengan carian atau penapis.";

    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  rows.forEach((r, index) => {
    const tr = document.createElement("tr");

    [
      index + 1,
      r.noPelajar,
      r.nama,
      r.kelas,
      r.kodPentaksiran,
      `${r.markah ?? 0} / ${r.markahPenuh ?? 0}`,
      `${r.peratus ?? 0}%`,
      r.status
    ].forEach((value) => {
      const td = document.createElement("td");
      td.textContent = String(value ?? "");
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
}

let pilihanKelas = [];
let pilihanPentaksiran = [];
let semuaKeputusan = [];

async function muatDashboard() {
  const tokenPensyarah = sessionStorage.getItem(TOKEN_KEY);
  if (!tokenPensyarah) return;

  paparMesej(dashboardStatus, "Memuatkan dashboard...");

  try {
    const hasil = await panggilAPI({
      tindakan: "dashboardPensyarah",
      tokenPensyarah,
      kelas: $("filterKelas")?.value || "",
      kodPentaksiran: $("filterPentaksiran")?.value || "",
      carian: $("carian")?.value.trim() || ""
    });

    if (!hasil.berjaya) {
      paparMesej(
        dashboardStatus,
        hasil.mesej || "Sesi tidak sah. Sila log masuk semula."
      );
      return;
    }

    const ringkasan = hasil.ringkasan || {};

    $("jumlahPelajar").textContent =
      ringkasan.jumlahPelajar ?? 0;

    $("purataMarkah").textContent =
      `${ringkasan.purataMarkah ?? 0}%`;

    $("kadarLulus").textContent =
      `${ringkasan.kadarLulus ?? 0}%`;

    $("jumlahRekod").textContent =
      ringkasan.jumlahRekod ?? 0;

    pilihanKelas = hasil.kelas || pilihanKelas;
    pilihanPentaksiran = hasil.pentaksiran || pilihanPentaksiran;

    isiSelect("filterKelas", pilihanKelas, "Semua kelas");

    isiSelect(
      "filterPentaksiran",
      pilihanPentaksiran,
      "Semua pentaksiran"
    );

    semuaKeputusan = hasil.keputusan || [];
    paparKeputusan(semuaKeputusan);

    paparMesej(
      $("statusKeputusan"),
      `${semuaKeputusan.length} rekod dipaparkan. ${hasil.asas || ""}`.trim()
    );

    paparMesej(
      dashboardStatus,
      "Dashboard berjaya dimuatkan."
    );

  } catch (error) {
    console.error("Ralat dashboard:", error);
    paparMesej(dashboardStatus, error.message);
  }
}

// LOGIN PENSYARAH

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const idInput = $("idPensyarah");
    const pinInput = $("pinPensyarah");

    if (!idInput || !pinInput) {
      paparMesej(
        loginStatus,
        "Ralat struktur halaman: medan ID pensyarah atau PIN tidak ditemui."
      );
      return;
    }

    const idPensyarah = idInput.value.trim();
    const pin = pinInput.value;

    if (!/^\d{6}$/.test(pin)) {
      paparMesej(loginStatus, "PIN mestilah tepat 6 digit.");
      return;
    }

    loginButton.disabled = true;
    paparMesej(loginStatus, "Sedang mengesahkan login...");

    try {
      const hasil = await panggilAPI({
        tindakan: "loginPensyarah",
        idPensyarah,
        pin
      });

      if (!hasil.berjaya || !hasil.tokenPensyarah) {
        paparMesej(
          loginStatus,
          hasil.mesej || "Login tidak berjaya."
        );
        return;
      }

      sessionStorage.setItem(
        TOKEN_KEY,
        hasil.tokenPensyarah
      );

      loginPanel.hidden = true;
      dashboardPanel.hidden = false;
      dashboardPanel.classList.remove("hidden");

      paparMesej(
        $("namaPensyarah"),
        hasil.pensyarah?.nama ||
        hasil.pensyarah?.idPensyarah ||
        idPensyarah
      );

      loginForm.reset();

      await muatDashboard();

    } catch (error) {
      console.error("Ralat login pensyarah:", error);
      paparMesej(loginStatus, error.message);

    } finally {
      loginButton.disabled = false;
    }
  });
}

// PENAPIS DASHBOARD

["filterKelas", "filterPentaksiran"].forEach((id) => {
  $(id)?.addEventListener("change", muatDashboard);
});

$("carian")?.addEventListener("input", () => {
  clearTimeout(window.__asasCarianTimer);

  window.__asasCarianTimer = setTimeout(
    muatDashboard,
    300
  );
});

$("resetFilter")?.addEventListener("click", () => {
  if ($("carian")) $("carian").value = "";
  if ($("filterKelas")) $("filterKelas").value = "";
  if ($("filterPentaksiran")) {
    $("filterPentaksiran").value = "";
  }

  muatDashboard();
});

// LOG KELUAR PENSYARAH

$("logoutButton")?.addEventListener("click", async () => {
  const tokenPensyarah = sessionStorage.getItem(TOKEN_KEY);

  try {
    if (tokenPensyarah) {
      await panggilAPI({
        tindakan: "logoutPensyarah",
        tokenPensyarah
      });
    }
  } catch (error) {
    console.warn(
      "Logout server tidak dapat disahkan:",
      error
    );
  }

  sessionStorage.removeItem(TOKEN_KEY);

  dashboardPanel.hidden = true;
  dashboardPanel.classList.add("hidden");
  loginPanel.hidden = false;

  paparMesej(loginStatus, "Anda telah log keluar.");
});

// PULIHKAN PAPARAN JIKA SESI MASIH TERSIMPAN

if (sessionStorage.getItem(TOKEN_KEY)) {
  loginPanel.hidden = true;
  dashboardPanel.hidden = false;
  dashboardPanel.classList.remove("hidden");

  muatDashboard();
}

// Nota: Fungsi semakan subjektif belum dimasukkan dalam versi ini.
