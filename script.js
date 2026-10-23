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

// LOGIN PENSYARAH

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

    borang?.reset();

    $("loginPanel").hidden = true;
    $("loginPanel").classList.add("hidden");

    $("dashboardPanel").hidden = false;
    $("dashboardPanel").classList.remove("hidden");

    $("namaPensyarah").textContent =
      "Log masuk sebagai " + namaPensyarah;

    paparMesejLogin("");
    paparMesejDashboard("Login berjaya. Memuatkan dashboard...");

    await muatDashboardPensyarah();
    await muatJawapanSubjektif();

  } catch (ralat) {
    console.error("Ralat login:", ralat);
    paparMesejLogin(
      "Tidak dapat menghubungi API. Semak URL dan deployment Apps Script."
    );
  } finally {
    if (butang) butang.disabled = false;
  }
}

// DASHBOARD

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

    if (!hasil?.berjaya) {
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

    kelasTersedia = Array.isArray(hasil.kelas)
      ? hasil.kelas
      : [];

    pentaksiranTersedia = Array.isArray(hasil.pentaksiran)
      ? hasil.pentaksiran
      : [];

    semuaKeputusan = Array.isArray(hasil.keputusan)
      ? hasil.keputusan
      : [];

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

    paparMesejDashboard(
      hasil.mesej ||
      "Dashboard dimuatkan. Jumlah rekod: " +
      semuaKeputusan.length + "."
    );

  } catch (ralat) {
    console.error("Ralat dashboard:", ralat);

    paparMesejDashboard(
      "Dashboard gagal dimuatkan: " + ralat.message
    );
  }
}

// PILIHAN PENAPIS

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

// PAPAR KEPUTUSAN

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
      (rekod.markah ?? 0) + " / " +
        (rekod.markahPenuh ?? 0),
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

// CARIAN DAN PENAPIS

function tetapkanPenapis() {
  $("carian")?.addEventListener("input", function () {
    clearTimeout(pemasaCarian);

    pemasaCarian = setTimeout(
      muatDashboardPensyarah,
      350
    );
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

// LOG KELUAR

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

    tamatkanSesiPensyarah(
      "Sesi pada peranti ini telah ditamatkan."
    );
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

  if ($("jadualSubjektif")) {
    $("jadualSubjektif").replaceChildren();

    const baris = document.createElement("tr");
    const sel = document.createElement("td");

    sel.colSpan = 7;
    sel.textContent = "Log masuk untuk melihat jawapan subjektif.";

    baris.appendChild(sel);
    $("jadualSubjektif").appendChild(baris);
  }

  if ($("jumlahPelajar")) $("jumlahPelajar").textContent = "0";
  if ($("purataMarkah")) $("purataMarkah").textContent = "0%";
  if ($("kadarLulus")) $("kadarLulus").textContent = "0%";
  if ($("jumlahRekod")) $("jumlahRekod").textContent = "0";
}

// SEMAKAN SUBJEKTIF

async function muatJawapanSubjektif() {
  const token = sessionStorage.getItem(KUNCI_SESI_PENSYARAH);
  const status = $("statusSubjektifMesej");
  const tbody = $("jadualSubjektif");

  if (!token) {
    if (status) status.textContent = "Sila log masuk semula.";
    return;
  }

  if (status) status.textContent = "Sedang memuatkan jawapan...";
  if (tbody) tbody.replaceChildren();

  try {
    const hasil = await panggilAPI({
      tindakan: "senaraiJawapanSubjektifV2",
      tokenPensyarah: token,
      kodPentaksiran: $("filterSubjektif")?.value || "",
      status: $("statusSubjektif")?.value || "BELUM_DISEMAK"
    });

    if (!hasil?.berjaya) {
      throw new Error(
        hasil?.mesej || "Gagal memuatkan jawapan."
      );
    }

    const senarai = Array.isArray(hasil.jawapan)
      ? hasil.jawapan
      : [];

    if (!tbody) return;

    if (!senarai.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");

      td.colSpan = 7;
      td.textContent =
        "Tiada jawapan subjektif untuk penapis ini.";

      tr.appendChild(td);
      tbody.appendChild(tr);
    }

    senarai.forEach((item) => {
      const tr = document.createElement("tr");

      const buatSel = (teks) => {
        const td = document.createElement("td");
        td.textContent = String(teks ?? "");
        return td;
      };

      tr.appendChild(
        buatSel(
          `${item.namaPelajar || ""} (${item.noPelajar || ""})`
        )
      );

      tr.appendChild(buatSel(item.kodPentaksiran));
      tr.appendChild(buatSel(item.soalan));

      const jawapanTd = buatSel(
        item.jawapan || "[Tiada jawapan]"
      );

      jawapanTd.style.whiteSpace = "pre-wrap";
      jawapanTd.style.minWidth = "220px";
      tr.appendChild(jawapanTd);

      const markahTd = document.createElement("td");
      const input = document.createElement("input");

      input.type = "number";
      input.min = "0";
      input.max = String(item.markahPenuh ?? 0);
      input.step = "0.5";
      input.value = String(item.markahDiperoleh ?? 0);
      input.style.minWidth = "90px";

      input.setAttribute(
        "aria-label",
        "Markah daripada " + (item.markahPenuh ?? 0)
      );

      markahTd.appendChild(input);
      markahTd.appendChild(
        document.createTextNode(
          " / " + (item.markahPenuh ?? 0)
        )
      );

      tr.appendChild(markahTd);
      tr.appendChild(buatSel(item.statusSemakan));

      const tindakanTd = document.createElement("td");
      const butang = document.createElement("button");

      butang.type = "button";
      butang.textContent = "Simpan Markah";

      butang.addEventListener("click", async () => {
        const markah = Number(input.value);
        const markahPenuh = Number(item.markahPenuh);

        if (
          !Number.isFinite(markah) ||
          markah < 0 ||
          markah > markahPenuh
        ) {
          if (status) {
            status.textContent =
              `Markah mesti antara 0 hingga ${markahPenuh}.`;
          }
          return;
        }

        butang.disabled = true;

        if (status) {
          status.textContent = "Sedang menyimpan markah...";
        }

        try {
          const simpan = await panggilAPI({
            tindakan: "simpanMarkahSubjektifV2",
            tokenPensyarah: token,
            payload: {
              idCubaan: item.idCubaan,
              kodSoalan: item.kodSoalan,
              markah
            }
          });

          if (!simpan?.berjaya) {
            throw new Error(
              simpan?.mesej || "Markah gagal disimpan."
            );
          }

          if (status) {
            status.textContent =
              simpan.mesej || "Markah berjaya disimpan.";
          }

          await muatJawapanSubjektif();
          await muatDashboardPensyarah();

        } catch (ralat) {
          if (status) {
            status.textContent =
              ralat.message || "Markah gagal disimpan.";
          }
        } finally {
          butang.disabled = false;
        }
      });

      tindakanTd.appendChild(butang);
      tr.appendChild(tindakanTd);
      tbody.appendChild(tr);
    });

    kemasKiniPilihan(
      "filterSubjektif",
      [
        ...new Set(
          senarai
            .map((item) => item.kodPentaksiran)
            .filter(Boolean)
        )
      ],
      "Semua pentaksiran"
    );

    if (status) {
      status.textContent =
        `Ditemui ${senarai.length} jawapan subjektif.`;
    }

  } catch (ralat) {
    console.error("Ralat semakan subjektif:", ralat);

    if (status) {
      status.textContent =
        ralat.message ||
        "Tidak dapat memuatkan jawapan subjektif.";
    }
  }
}

// MULAKAN APLIKASI

document.addEventListener("DOMContentLoaded", function () {
  paparLoginAwal();

  $("loginForm")?.addEventListener("submit", kendaliLogin);
  $("logoutButton")?.addEventListener("click", kendaliLogout);

  $("muatSubjektifButton")?.addEventListener(
    "click",
    muatJawapanSubjektif
  );

  $("statusSubjektif")?.addEventListener(
    "change",
    muatJawapanSubjektif
  );

  $("filterSubjektif")?.addEventListener(
    "change",
    muatJawapanSubjektif
  );

  tetapkanPenapis();

  // Sesi lama tidak dipulihkan secara automatik.
  sessionStorage.removeItem(KUNCI_SESI_PENSYARAH);
});
