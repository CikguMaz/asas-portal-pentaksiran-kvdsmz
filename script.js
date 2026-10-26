// ASAS Portal Pentaksiran KVDSMZ V2 — Dashboard Pensyarah

const API_URL = "https://script.google.com/macros/s/AKfycbwL0dkMjE8-eWpS7A6zEV0FUKmOzaxjzOuT-9FWGvo673sg-ln9mVtv-EchNWckTuLM/exec";
const TOKEN_KEY = "ASAS_V2_TOKEN_PENSYARAH";

let kodSoalanSedangDiedit = "";

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
isiSelect(
  "bankKodPentaksiran",
  pilihanPentaksiran,
  "Pilih pentaksiran"
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

/* =========================================
   SEMAKAN SOALAN SUBJEKTIF V2
   Tampal di hujung script.js sedia ada
   ========================================= */

let cacheJawapanSubjektif = [];

async function muatJawapanSubjektif() {
  const tokenPensyarah = sessionStorage.getItem(TOKEN_KEY);
  const statusEl = $("statusSubjektifMesej");
  const tbody = $("jadualSubjektif");
  const butang = $("muatSubjektifButton");

  if (!tbody) return;

  if (!tokenPensyarah) {
    paparMesej(statusEl, "Sila log masuk sebagai pensyarah.");
    return;
  }

  paparMesej(statusEl, "Memuatkan jawapan subjektif...");
  if (butang) butang.disabled = true;

  try {
    const hasil = await panggilAPI({
      tindakan: "senaraiJawapanSubjektifV2",
      tokenPensyarah: tokenPensyarah,
      status: "SEMUA",
      kodPentaksiran: ""
    });

    if (!hasil.berjaya) {
      throw new Error(
        hasil.mesej || "Jawapan subjektif gagal dimuatkan."
      );
    }

    cacheJawapanSubjektif = Array.isArray(hasil.jawapan)
      ? hasil.jawapan
      : [];

    const kodPentaksiran = [
      ...new Set(
        cacheJawapanSubjektif
          .map(item => item.kodPentaksiran)
          .filter(Boolean)
      )
    ].sort();

    isiSelect(
      "filterSubjektif",
      kodPentaksiran,
      "Semua pentaksiran"
    );

    tapisJawapanSubjektif();

    paparMesej(
      statusEl,
      `Berjaya memuatkan ${cacheJawapanSubjektif.length} jawapan subjektif.`
    );

  } catch (error) {
    console.error("Ralat jawapan subjektif:", error);
    paparMesej(statusEl, error.message);

  } finally {
    if (butang) butang.disabled = false;
  }
}

function tapisJawapanSubjektif() {
  const kod = $("filterSubjektif")?.value || "";
  const status = $("statusSubjektif")?.value || "BELUM_DISEMAK";

  const jawapan = cacheJawapanSubjektif.filter(item =>
    (!kod || item.kodPentaksiran === kod) &&
    (status === "SEMUA" || item.statusSemakan === status)
  );

  paparJadualSubjektif(jawapan);
}

function paparJadualSubjektif(jawapan) {
  const tbody = $("jadualSubjektif");
  if (!tbody) return;

  tbody.replaceChildren();

  if (!jawapan.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");

    td.colSpan = 7;
    td.textContent =
      "Tiada jawapan subjektif untuk penapis yang dipilih.";

    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  jawapan.forEach(item => {
    const tr = document.createElement("tr");

    function tambahSel(text) {
      const td = document.createElement("td");
      td.textContent = String(text ?? "");
      tr.appendChild(td);
      return td;
    }

    tambahSel(
      `${item.namaPelajar || ""} (${item.noPelajar || ""})`
    );

    tambahSel(item.kodPentaksiran);

    tambahSel(
      `${item.soalan || ""} [${item.kodSoalan || ""}]`
    );

    const selJawapan = tambahSel(
      item.jawapan || "(Tiada jawapan)"
    );
    selJawapan.style.whiteSpace = "pre-wrap";

    const selMarkah = document.createElement("td");
    const inputMarkah = document.createElement("input");

    inputMarkah.type = "number";
    inputMarkah.min = "0";
    inputMarkah.max = String(item.markahPenuh || 0);
    inputMarkah.step = "any";
    inputMarkah.value = String(item.markahDiperoleh ?? 0);
    inputMarkah.style.width = "75px";

    selMarkah.appendChild(inputMarkah);
    selMarkah.appendChild(
      document.createTextNode(` / ${item.markahPenuh || 0}`)
    );
    tr.appendChild(selMarkah);

    tambahSel(item.statusSemakan || "BELUM_DISEMAK");

    const selTindakan = document.createElement("td");
    const butangSimpan = document.createElement("button");

    butangSimpan.type = "button";
    butangSimpan.textContent = "Simpan Markah";

    butangSimpan.addEventListener("click", async () => {
      const markah = Number(inputMarkah.value);
      const maksimum = Number(item.markahPenuh) || 0;

      if (
        inputMarkah.value.trim() === "" ||
        !Number.isFinite(markah) ||
        markah < 0 ||
        markah > maksimum
      ) {
        paparMesej(
          $("statusSubjektifMesej"),
          `Markah mesti antara 0 hingga ${maksimum}.`
        );
        inputMarkah.focus();
        return;
      }

      butangSimpan.disabled = true;

      paparMesej(
        $("statusSubjektifMesej"),
        "Sedang menyimpan markah..."
      );

      try {
        const hasil = await panggilAPI({
          tindakan: "simpanMarkahSubjektifV2",
          tokenPensyarah:
            sessionStorage.getItem(TOKEN_KEY),
          payload: {
            idCubaan: item.idCubaan,
            kodSoalan: item.kodSoalan,
            markah: markah
          }
        });

        if (!hasil.berjaya) {
          throw new Error(
            hasil.mesej || "Markah gagal disimpan."
          );
        }

        paparMesej(
          $("statusSubjektifMesej"),
          hasil.mesej || "Markah berjaya disimpan."
        );

        await muatJawapanSubjektif();
        await muatDashboard();

      } catch (error) {
        console.error("Ralat simpan markah:", error);
        paparMesej(
          $("statusSubjektifMesej"),
          error.message || "Markah gagal disimpan."
        );

      } finally {
        butangSimpan.disabled = false;
      }
    });

    selTindakan.appendChild(butangSimpan);
    tr.appendChild(selTindakan);
    tbody.appendChild(tr);
  });
}

$("muatSubjektifButton")
  ?.addEventListener("click", muatJawapanSubjektif);

$("filterSubjektif")
  ?.addEventListener("change", tapisJawapanSubjektif);

$("statusSubjektif")
  ?.addEventListener("change", tapisJawapanSubjektif);


// Nota: Fungsi semakan subjektif belum dimasukkan dalam versi ini.

/* =========================================
   BANK SOALAN V2
   ========================================= */

let cacheBankSoalan = [];

async function muatBankSoalan() {
  const tokenPensyarah = sessionStorage.getItem(TOKEN_KEY);
  const kodPentaksiran = $("bankKodPentaksiran")?.value || "";
  const carian = $("bankCarian")?.value.trim() || "";
  const statusEl = $("bankStatus");
  const tbody = $("bankJadualBody");
  const butang = $("bankMuatButton");

  if (!tbody) return;

  if (!tokenPensyarah) {
    paparMesej(statusEl, "Sila log masuk sebagai pensyarah.");
    return;
  }

  if (!kodPentaksiran) {
    paparMesej(statusEl, "Sila pilih kod pentaksiran.");
    tbody.replaceChildren();

    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 6;
    td.textContent = "Pilih pentaksiran untuk melihat bank soalan.";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  paparMesej(statusEl, "Memuatkan bank soalan...");
  if (butang) butang.disabled = true;

  try {
    const hasil = await panggilAPI({
      tindakan: "senaraiBankSoalanV2",
      tokenPensyarah,
      payload: {
        kodPentaksiran,
        carian
      }
    });

    if (!hasil.berjaya) {
      throw new Error(
        hasil.mesej || "Bank soalan gagal dimuatkan."
      );
    }

    cacheBankSoalan = Array.isArray(hasil.soalan)
      ? hasil.soalan
      : [];

    paparJadualBankSoalan(cacheBankSoalan);

    paparMesej(
      statusEl,
      `Berjaya memuatkan ${cacheBankSoalan.length} soalan.`
    );
  } catch (error) {
    console.error("Ralat bank soalan:", error);
    paparMesej(statusEl, error.message);

    tbody.replaceChildren();
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 6;
    td.textContent = "Bank soalan gagal dimuatkan.";
    tr.appendChild(td);
    tbody.appendChild(tr);
  } finally {
    if (butang) butang.disabled = false;
  }
}


function paparJadualBankSoalan(soalan) {
  const tbody = $("bankJadualBody");
  if (!tbody) return;

  tbody.replaceChildren();

  if (!soalan.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 7;
    td.textContent = "Tiada soalan ditemui.";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  soalan.forEach(item => {
    const tr = document.createElement("tr");

    const nilai = [
      item.kodSoalan,
      item.jenisSoalan,
      item.soalan,
      item.jawapanBetul,
      item.markah,
      item.topik
    ];

    nilai.forEach((teks, index) => {
      const td = document.createElement("td");
      td.textContent = String(teks ?? "");

      if (index === 2) {
        td.style.whiteSpace = "pre-wrap";
        td.style.minWidth = "220px";
      }

      tr.appendChild(td);
    });

    // Butang Edit
    const tdTindakan = document.createElement("td");

    const butangEdit = document.createElement("button");
    butangEdit.type = "button";
    butangEdit.textContent = "Edit";
    butangEdit.addEventListener("click", () => {
      editSoalanBank(item.kodSoalan);
    });

    // Butang Arkib
    const butangArkib = document.createElement("button");
    butangArkib.type = "button";
    butangArkib.textContent = "Arkib";
    butangArkib.style.marginLeft = "6px";
    butangArkib.addEventListener("click", () => {
      arkibSoalanBank(item.kodSoalan);
    });

    tdTindakan.appendChild(butangEdit);
    tdTindakan.appendChild(butangArkib);
    tr.appendChild(tdTindakan);

    tbody.appendChild(tr);
  });
}

function editSoalanBank(kodSoalan) {
  const statusEl = $("bankStatus");

  const item = cacheBankSoalan.find(
    soalan => String(soalan.kodSoalan) === String(kodSoalan)
  );

  if (!item) {
    paparMesej(statusEl, "Soalan tidak ditemui. Muat semula bank soalan.");
    return;
  }

  kodSoalanSedangDiedit = item.kodSoalan;

  $("bankKodPentaksiran").value = item.kodPentaksiran || "";
  $("bankJenisSoalan").value = item.jenisSoalan || "OBJEKTIF";
  $("bankSoalan").value = item.soalan || "";
  $("bankMarkah").value = item.markah ?? "";
  $("bankTopik").value = item.topik || "";
  $("bankKodGambar").value = item.kodGambar || "";
  $("bankPilihanA").value = item.pilihanA || "";
  $("bankPilihanB").value = item.pilihanB || "";
  $("bankPilihanC").value = item.pilihanC || "";
  $("bankPilihanD").value = item.pilihanD || "";
  $("bankJawapanBetul").value = item.jawapanBetul || "";

  kemasKiniJenisBankSoalan();

  const butang = $("bankSimpanButton");
  if (butang) {
    butang.textContent = "Simpan Perubahan";
  }

  paparMesej(
    statusEl,
    "Mod edit: ubah maklumat soalan, kemudian tekan Simpan Perubahan."
  );

  $("bankSoalan").focus();
}

async function arkibSoalanBank(kodSoalan) {
  const tokenPensyarah = sessionStorage.getItem(TOKEN_KEY);
  const statusEl = $("bankStatus");

  if (!tokenPensyarah) {
    paparMesej(statusEl, "Sila log masuk sebagai pensyarah.");
    return;
  }

  const item = cacheBankSoalan.find(
    soalan => String(soalan.kodSoalan) === String(kodSoalan)
  );

  if (!item) {
    paparMesej(statusEl, "Soalan tidak ditemui. Muat semula bank soalan.");
    return;
  }

  const sahkan = window.confirm(
    `Adakah anda pasti mahu mengarkibkan soalan ${kodSoalan}?\n\n` +
    "Soalan tidak akan dipadam, tetapi tidak lagi dipaparkan dalam senarai aktif."
  );

  if (!sahkan) return;

  paparMesej(statusEl, "Sedang mengarkibkan soalan...");

  try {
    const hasil = await panggilAPI({
      tindakan: "arkibSoalanBankV2",
      tokenPensyarah,
      payload: {
        kodSoalan
      }
    });

    if (!hasil.berjaya) {
      throw new Error(
        hasil.mesej || "Soalan gagal diarkibkan."
      );
    }

    if (kodSoalanSedangDiedit === kodSoalan) {
      kodSoalanSedangDiedit = "";

      $("bankBorang")?.reset();
      kemasKiniJenisBankSoalan();

      const butang = $("bankSimpanButton");
      if (butang) {
        butang.textContent = "Simpan Soalan";
      }
    }

    paparMesej(
      statusEl,
      hasil.mesej || "Soalan berjaya diarkibkan."
    );

    await muatBankSoalan();

  } catch (error) {
    console.error("Ralat arkib soalan:", error);
    paparMesej(statusEl, error.message);
  }
}


function kemasKiniJenisBankSoalan() {
  const jenis = $("bankJenisSoalan")?.value || "OBJEKTIF";
  const panelPilihan = $("bankPilihanPanel");
  const medanPilihan = [
    $("bankPilihanA"),
    $("bankPilihanB"),
    $("bankPilihanC"),
    $("bankPilihanD")
  ];
  const jawapanBetul = $("bankJawapanBetul");

  const objektif = jenis === "OBJEKTIF";

  if (panelPilihan) {
    panelPilihan.hidden = !objektif;
  }

  medanPilihan.forEach(medan => {
    if (medan) {
      medan.required = objektif;
    }
  });

  if (jawapanBetul) {
    jawapanBetul.required = objektif;
  }
}


async function simpanBankSoalan(event) {
  event.preventDefault();

  const tokenPensyarah = sessionStorage.getItem(TOKEN_KEY);
  const statusEl = $("bankStatus");
  const borang = $("bankBorang");
  const butang = $("bankSimpanButton");

  if (!tokenPensyarah) {
    paparMesej(statusEl, "Sila log masuk sebagai pensyarah.");
    return;
  }

  if (!borang.reportValidity()) return;

  const kodPentaksiran = $("bankKodPentaksiran")?.value || "";

  if (!kodPentaksiran) {
    paparMesej(statusEl, "Sila pilih kod pentaksiran terlebih dahulu.");
    $("bankKodPentaksiran")?.focus();
    return;
  }

  const jenisSoalan = $("bankJenisSoalan").value;

  const payload = {
    kodPentaksiran,
    jenisSoalan,
    soalan: $("bankSoalan").value.trim(),
    markah: Number($("bankMarkah").value),
    topik: $("bankTopik").value.trim(),
    kodGambar: $("bankKodGambar").value.trim(),
    pilihanA: $("bankPilihanA").value.trim(),
    pilihanB: $("bankPilihanB").value.trim(),
    pilihanC: $("bankPilihanC").value.trim(),
    pilihanD: $("bankPilihanD").value.trim(),
    jawapanBetul: jenisSoalan === "OBJEKTIF"
      ? $("bankJawapanBetul").value
      : ""
  };

  if (
    !Number.isFinite(payload.markah) ||
    payload.markah <= 0
  ) {
    paparMesej(statusEl, "Markah penuh mesti lebih besar daripada sifar.");
    $("bankMarkah").focus();
    return;
  }

  if (
    jenisSoalan === "OBJEKTIF" &&
    !["A", "B", "C", "D"].includes(payload.jawapanBetul)
  ) {
    paparMesej(statusEl, "Sila pilih jawapan betul A, B, C atau D.");
    return;
  }

  const modEdit = Boolean(kodSoalanSedangDiedit);

  if (modEdit) {
    payload.kodSoalan = kodSoalanSedangDiedit;
  }

  if (butang) butang.disabled = true;

  paparMesej(
    statusEl,
    modEdit ? "Sedang mengemas kini soalan..." : "Sedang menyimpan soalan..."
  );

  try {
    console.log("Mod edit:", modEdit);
console.log(
  "Token tersedia:",
  Boolean(tokenPensyarah)
);
console.log(
  "Panjang token:",
  tokenPensyarah ? tokenPensyarah.length : 0
);
console.log(
  "Tindakan dihantar:",
  modEdit ? "kemasKiniSoalanBankV2" : "tambahSoalanBankV2"
);
   const hasil = await panggilAPI({
  tindakan: modEdit
    ? "kemasKiniSoalanBankV2"
    : "tambahSoalanBankV2",
  tokenPensyarah,
  payload
});

console.log("MOD EDIT:", modEdit);
console.log("PAYLOAD DIHANTAR:", payload);
console.log("RESPONS API:", hasil);

    if (!hasil.berjaya) {
      throw new Error(
        hasil.mesej || (
          modEdit
            ? "Soalan gagal dikemas kini."
            : "Soalan gagal disimpan."
        )
      );
    }

    paparMesej(
      statusEl,
      hasil.mesej || (
        modEdit
          ? "Soalan berjaya dikemas kini."
          : "Soalan berjaya disimpan."
      )
    );

    kodSoalanSedangDiedit = "";
    borang.reset();
    kemasKiniJenisBankSoalan();

    if (butang) {
      butang.textContent = "Simpan Soalan";
    }

    await muatBankSoalan();

  } catch (error) {
    console.error("Ralat simpan bank soalan:", error);
    paparMesej(statusEl, error.message);
  } finally {
    if (butang) butang.disabled = false;
  }
}

// Daftarkan event Bank Soalan
$("bankMuatButton")?.addEventListener("click", muatBankSoalan);

$("bankKodPentaksiran")?.addEventListener("change", muatBankSoalan);

$("bankCarian")?.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    event.preventDefault();
    muatBankSoalan();
  }
});

$("bankBorang")?.addEventListener("submit", simpanBankSoalan);

$("bankJenisSoalan")?.addEventListener(
  "change",
  kemasKiniJenisBankSoalan
);

// Tetapkan paparan awal pilihan objektif/subjektif
kemasKiniJenisBankSoalan();

