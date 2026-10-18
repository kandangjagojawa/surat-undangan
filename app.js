let templateData = null;

const ANGKA_JAWA = {
  '0': '꧐', '1': '꧑', '2': '꧒', '3': '꧓', '4': '꧔',
  '5': '꧕', '6': '꧖', '7': '꧗', '8': '꧘', '9': '꧙'
};

const BULAN_INDO = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

document.addEventListener("DOMContentLoaded", () => {
  fetch('undangan.json')
    .then(res => res.json())
    .then(data => { templateData = data; })
    .catch(err => console.error("Gagal memuat undangan.json:", err));
  
  toggleDocTypeFields();
  updateEngineOptions();
});

function toggleDocTypeFields() {
  const docType = document.getElementById('docType').value;
  document.getElementById('undanganFields').style.display = (docType === 'undangan') ? 'block' : 'none';
  document.getElementById('suratFields').style.display = (docType === 'surat') ? 'block' : 'none';
}

function updateEngineOptions() {
  const docLang = document.getElementById('docLang').value;
  document.getElementById('engineGroup').style.display = (docLang === 'jawa') ? 'block' : 'none';
}

function toAngkaJawa(numberStr) {
  let str = String(numberStr);
  let res = "";
  for (let i = 0; i < str.length; i++) {
    res += ANGKA_JAWA[str[i]] || str[i];
  }
  return `꧇${res}꧇`;
}

function formatTanggalAksara(dateString, transliterateFn) {
  if (!dateString) return "";
  const d = new Date(dateString);
  const dayNum = d.getDate();
  const monthName = BULAN_INDO[d.getMonth()];
  const yearNum = d.getFullYear();

  const dayAksara = toAngkaJawa(dayNum);
  const monthAksara = transliterateFn(monthName);
  const yearAksara = toAngkaJawa(yearNum);

  return `${dayAksara} ${monthAksara} ${yearAksara}`;
}

function loadScriptEngine(scriptFile) {
  return new Promise((resolve, reject) => {
    const existingScript = document.getElementById('activeEngineScript');
    if (existingScript) {
      existingScript.remove();
    }

    delete window.transliterasiKalimat;
    delete window.transliterateKawi;

    const script = document.createElement('script');
    script.id = 'activeEngineScript';
    script.src = scriptFile + '?v=' + new Date().getTime();
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Gagal memuat script engine: ${scriptFile}`));
    document.head.appendChild(script);
  });
}

function getRandomText(array) {
  if (!array || array.length === 0) return "";
  const idx = Math.floor(Math.random() * array.length);
  return array[idx];
}

// Fungsi pembantu untuk mengubah teks biasa ke lowercase, 
// tetapi mempertahankan singkatan (minimal 2 huruf kapital, format bertitik, atau sintaks «...»)
function normalisasiInputTeks(text) {
  if (!text) return "";
  const singkatanRegex = /(«[^»]+»|<<[^>]+>>|\b[A-Z]{2,}(?::[1-4])?\b|\b(?:[A-Z]\.)+)/g;
  
  let result = "";
  let lastIndex = 0;
  let match;

  while ((match = singkatanRegex.exec(text)) !== null) {
    result += text.slice(lastIndex, match.index).toLowerCase();
    result += match[0]; // Pertahankan huruf kapital singkatan
    lastIndex = singkatanRegex.lastIndex;
  }
  result += text.slice(lastIndex).toLowerCase();
  return result;
}

document.getElementById('docForm').addEventListener('submit', async function(e) {
  e.preventDefault();

  const docType = document.getElementById('docType').value;
  const docLang = document.getElementById('docLang').value;

  let scriptFile = 'jawaindo.js';
  let fontClass = 'font-ngayogyann';

  if (docLang === 'indonesia') {
    scriptFile = 'jawaindo.js';
    fontClass = 'font-ngayogyann';
  } else {
    const selectedEngine = document.getElementById('docEngine').value;
    scriptFile = selectedEngine;
    if (selectedEngine === 'tradisional.js' || selectedEngine === 'carakawi.js') {
      fontClass = 'font-ngayogyan';
    } else {
      fontClass = 'font-ngayogyann';
    }
  }

  try {
    await loadScriptEngine(scriptFile);
  } catch (err) {
    alert("Terjadi kesalahan saat memuat mesin transliterasi.");
    return;
  }

  let rawTranslitterateFn = window.transliterasiKalimat;
  if (scriptFile === 'tradisional.js' || scriptFile === 'carakawi.js') {
    rawTranslitterateFn = window.transliterateKawi || window.transliterasiKalimat;
  }

  if (typeof rawTranslitterateFn !== 'function') {
    alert("Fungsi transliterasi tidak ditemukan pada paugeran terpilih.");
    return;
  }

  // WRAPPER PENYESUAIAN: Mengubah kata biasa menjadi lowercase, 
  // namun mempertahankan kapitalisasi pada singkatan (minimal 2 huruf besar)
  const t = function(text) {
    if (!text) return "";
    return rawTranslitterateFn(normalisasiInputTeks(String(text)));
  };

  const pdfContainer = document.getElementById('pdfContainer');
  pdfContainer.className = `a4-page ${fontClass}`;

  // 1. Kota & Tanggal Surat
  const kota = document.getElementById('inputKota').value;
  const tglSurat = document.getElementById('inputTanggalSurat').value;
  const kotaAksara = t(kota);
  const tglSuratAksara = formatTanggalAksara(tglSurat, t);
  document.getElementById('previewKotaTanggal').innerText = `${kotaAksara}, ${tglSuratAksara}`;

  // 2. Tujuan
  const penerima = document.getElementById('inputPenerima').value;
  let labelTujuan = (docLang === 'indonesia') ? "Kepada: Bapak/Ibu/Saudara" : "Kagem: Bapak/Ibu/Sadhérék";
  document.getElementById('previewTujuanLabel').innerText = t(labelTujuan);
  document.getElementById('previewPenerimaNama').innerText = t(penerima);

  // 3. Isi Dokumen
  if (docType === 'undangan') {
    document.getElementById('previewDetailAcara').style.display = 'block';
    document.getElementById('previewIsiSuratText').style.display = 'none';

    if (templateData && templateData[docLang]) {
      const pengantarRaw = getRandomText(templateData[docLang].pengantar);
      const penutupRaw = getRandomText(templateData[docLang].penutup);
      document.getElementById('previewPengantar').innerText = t(pengantarRaw);
      document.getElementById('previewPenutup').innerText = t(penutupRaw);
    }

    const tglAcara = document.getElementById('inputTanggalAcara').value;
    const jamAcara = document.getElementById('inputJamAcara').value;
    const tempatAcara = document.getElementById('inputTempatAcara').value;
    const namaAcara = document.getElementById('inputNamaAcara').value;

    document.getElementById('lblHariTanggal').innerText = t("Hari, Tanggal");
    document.getElementById('lblJam').innerText = t("Jam");
    document.getElementById('lblTempat').innerText = t("Tempat");
    document.getElementById('lblAcara').innerText = t("Acara");

    document.getElementById('previewHariTanggal').innerText = formatTanggalAksara(tglAcara, t);
    document.getElementById('previewJam').innerText = t(jamAcara);
    document.getElementById('previewTempat').innerText = t(tempatAcara);
    document.getElementById('previewNamaAcara').innerText = t(namaAcara);

  } else {
    document.getElementById('previewDetailAcara').style.display = 'none';
    document.getElementById('previewIsiSuratText').style.display = 'block';
    document.getElementById('previewPengantar').innerText = "";
    document.getElementById('previewPenutup').innerText = "";

    const isiSuratRaw = document.getElementById('inputIsiSurat').value;
    document.getElementById('previewIsiSuratText').innerText = t(isiSuratRaw);
  }

  // 4. Pengirim
  const pengirim = document.getElementById('inputPengirim').value;
  let labelPengirim = (docLang === 'indonesia') ? "Pengirim:" : "Ingkang ngaturi:";
  document.getElementById('previewPengirimLabel').innerText = t(labelPengirim);
  document.getElementById('previewPengirimNama').innerText = t(pengirim);

  // Tampilkan Section Preview
  document.getElementById('formSection').style.display = 'none';
  document.getElementById('previewSection').style.display = 'block';
  document.getElementById('previewActions').style.display = 'flex';
  document.getElementById('postDownloadMenu').style.display = 'none';
});

function editForm() {
  document.getElementById('formSection').style.display = 'block';
  document.getElementById('previewSection').style.display = 'none';
}

function downloadPDF() {
  window.print();

  setTimeout(() => {
    document.getElementById('previewActions').style.display = 'none';
    document.getElementById('postDownloadMenu').style.display = 'block';
  }, 500);
}

function resetForm() {
  document.getElementById('docForm').reset();
  toggleDocTypeFields();
  updateEngineOptions();
  document.getElementById('formSection').style.display = 'block';
  document.getElementById('previewSection').style.display = 'none';
                                          }
      
