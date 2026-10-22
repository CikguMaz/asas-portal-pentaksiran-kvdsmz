
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

// ==============================
// LOGIN PELAJAR
// ==============================

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

// ==============================
// PAPAR PROFIL PELAJAR
// ==============================

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

// ==============================
// MUATKAN SENARAI SUBJEK
// ==============================

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
      const butang = document.createElement("button");

      tajuk.textContent = subjek.namaKursus;
      kod.textContent = "Kod kursus: " + subjek.kodKursus;

      butang.type = "button";
      butang.textContent = "Lihat Kuiz";

      butang.addEventListener("click", async function () {
        const statusKuiz = document.getElementById("statusKuiz");
        const senaraiKuiz = document.getElementById("senaraiKuiz");
        const token = sessionStorage.getItem(KUNCI_SESI);

        senaraiKuiz.replaceChildren();
        document.getElementById("senaraiSoalan").replaceChildren();
        document.getElementById("statusSoalan").textContent = "";
        statusKuiz.textContent = "Sedang memuatkan kuiz...";
        butang.disabled = true;

        try {
          const hasilKuiz = await panggilAPI({
            tindakan: "senaraiKuizSubjek",
            kodKursus: subjek.kodKursus,
            tokenSesi: token
          });

          if (!hasilKuiz.berjaya || !Array.isArray(hasilKuiz.kuiz)) {
            statusKuiz.textContent =
              hasilKuiz.mesej || "Senarai kuiz gagal dimuatkan.";
            return;
          }

          if (hasilKuiz.kuiz.length === 0) {
            statusKuiz.textContent =
              "Tiada kuiz aktif untuk subjek ini.";
            return;
          }

          statusKuiz.textContent =
            "Jumlah kuiz aktif: " + hasilKuiz.kuiz.length;

          hasilKuiz.kuiz.forEach(function (kuiz) {
            const kadKuiz = document.createElement("div");
            const tajukKuiz = document.createElement("h4");
            const maklumatKuiz = document.createElement("p");
            const butangMula = document.createElement("button");

            tajukKuiz.textContent = kuiz.tajuk;

            maklumatKuiz.textContent =
              "Kod: " + kuiz.kodPentaksiran +
              " | Markah penuh: " + kuiz.markahPenuh +
              " | Tempoh: " + kuiz.tempohMinit + " minit";

            butangMula.type = "button";
            butangMula.textContent = "Mula Kuiz";

            // ==============================
            // MULA KUIZ DAN PAPAR SOALAN
            // ==============================

            butangMula.addEventListener("click", async function () {
              const tokenKuiz = sessionStorage.getItem(KUNCI_SESI);
              const statusSoalan = document.getElementById("statusSoalan");
              const senaraiSoalan = document.getElementById("senaraiSoalan");

              statusSoalan.textContent = "Sedang memuatkan soalan...";
              senaraiSoalan.replaceChildren();
              butangMula.disabled = true;

              try {
                const hasilSoalan = await panggilAPI({
                  tindakan: "soalanKuiz",
                  kodPentaksiran: kuiz.kodPentaksiran,
                  tokenSesi: tokenKuiz
                });

                if (!hasilSoalan.berjaya) {
                  throw new Error(
                    hasilSoalan.mesej || "Soalan gagal dimuatkan."
                  );
                }

                if (
                  !Array.isArray(hasilSoalan.soalan) ||
                  hasilSoalan.soalan.length === 0
                ) {
                  statusSoalan.textContent =
                    "Tiada soalan tersedia untuk kuiz ini.";
                  return;
                }

                statusSoalan.textContent =
                  "Jumlah soalan: " + hasilSoalan.soalan.length;

                hasilSoalan.soalan.forEach(function (soalan, indeks) {
                  const kadSoalan = document.createElement("div");
                  const tajukSoalan = document.createElement("h4");
                  const pilihan = document.createElement("div");

                  tajukSoalan.textContent =
                    (indeks + 1) + ". " + soalan.soalan;

                  const pilihanJawapan = [
                    ["A", soalan.pilihanA],
                    ["B", soalan.pilihanB],
                    ["C", soalan.pilihanC],
                    ["D", soalan.pilihanD]
                  ];

                  pilihanJawapan.forEach(function (item) {
                    const label = document.createElement("label");
                    const radio = document.createElement("input");

                    radio.type = "radio";
                    radio.name = "jawapan_" + soalan.kodSoalan;
                    radio.value = item[0];

                    label.appendChild(radio);
                    label.appendChild(
                      document.createTextNode(
                        " " + item[0] + ". " + (item[1] || "")
                      )
                    );

                    pilihan.appendChild(label);
                    pilihan.appendChild(document.createElement("br"));
                  });

                  kadSoalan.appendChild(tajukSoalan);
                  kadSoalan.appendChild(pilihan);
                  senaraiSoalan.appendChild(kadSoalan);
                });

                // ==============================
                // BUTANG HANTAR JAWAPAN
                // ==============================

                const butangHantar = document.createElement("button");
                butangHantar.type = "button";
                butangHantar.textContent = "Hantar Jawapan";

                butangHantar.addEventListener("click", async function () {
                  const token = sessionStorage.getItem(KUNCI_SESI);
                  const jawapan = [];

                  hasilSoalan.soalan.forEach(function (soalan) {
                    const dipilih = document.querySelector(
                      'input[name="jawapan_' +
                      soalan.kodSoalan +
                      '"]:checked'
                    );

                    jawapan.push({
                      kodSoalan: soalan.kodSoalan,
                      jawapan: dipilih ? dipilih.value : ""
                    });
                  });

                  const belumJawab = jawapan.filter(function (item) {
                    return item.jawapan === "";
                  });

                  if (belumJawab.length > 0) {
                    statusSoalan.textContent =
                      "Sila jawab semua soalan dahulu. Belum dijawab: " +
                      belumJawab.length;
                    return;
                  }

                  const sahkan = confirm(
                    "Pastikan semua jawapan betul. Hantar jawapan sekarang?"
                  );

                  if (!sahkan) return;

                  butangHantar.disabled = true;
                  statusSoalan.textContent =
                    "Sedang menghantar jawapan...";

                  try {
                    const hasil = await panggilAPI({
                      tindakan: "hantarJawapan",
                      kodPentaksiran: kuiz.kodPentaksiran,
                      jawapan: jawapan,
                      tokenSesi: token
                    });

                    if (!hasil.berjaya) {
                      throw new Error(
                        hasil.mesej || "Jawapan gagal dihantar."
                      );
                    }

                    const keputusan = hasil.keputusan;

                    statusSoalan.textContent =
                      "Jawapan berjaya dihantar! Markah: " +
                      keputusan.markah + "/" + keputusan.markahPenuh +
                      " (" + keputusan.peratus + "%). " +
                      "Status: " + keputusan.statusPencapaian;

                    butangHantar.remove();

                  } catch (ralat) {
                    statusSoalan.textContent =
                      "Penghantaran gagal: " + ralat.message;
                    butangHantar.disabled = false;
                  }
                });

                senaraiSoalan.appendChild(butangHantar);

              } catch (ralat) {
                console.error("Ralat memuatkan soalan:", ralat);
                statusSoalan.textContent =
                  "Ralat: " + ralat.message;
              } finally {
                butangMula.disabled = false;
              }
            });

            kadKuiz.appendChild(tajukKuiz);
            kadKuiz.appendChild(maklumatKuiz);
            kadKuiz.appendChild(butangMula);
            senaraiKuiz.appendChild(kadKuiz);
          });

        } catch (ralat) {
          console.error("Ralat memuatkan kuiz:", ralat);
          statusKuiz.textContent =
            "Kuiz gagal dimuatkan. Cuba lagi.";
        } finally {
          butang.disabled = false;
        }
      });

      kad.appendChild(tajuk);
      kad.appendChild(kod);
      kad.appendChild(butang);
      senaraiSubjek.appendChild(kad);
    });

  } catch (ralat) {
    console.error("Ralat memuatkan subjek:", ralat);
    statusSubjek.textContent =
      "Subjek gagal dimuatkan. Sila cuba log masuk semula.";
  }
}

// ==============================
// LOGOUT
// ==============================

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
