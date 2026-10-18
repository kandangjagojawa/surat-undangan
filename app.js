// Variabel Global Data & Template
let templateData = null;

// Peta Angka Latin ke Angka Aksara Jawa
const ANGKA_JAWA = {
  '0': '꧐', '1': '꧑', '2': '꧒', '3': '꧓', '4': '꧔',
  '5': '꧕', '6': '꧖', '7': '꧗', '8': '꧘', '9': '꧙'
};

// Nama Bulan Bahasa Indonesia & Jawa
const BULAN_INDO = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

// Inisialisasi: Muat Berkas undangan.json
document.addEventListener("DOMContentLoaded", () => {
  fetch('undangan.json')
    .then(res => res.json())
    .then(data => { templateData = data; })
    .catch(err => console.error("Gagal memuat undangan.json:", err));
  
  toggleDocTypeFields();
  updateEngineOptions();
});

// Toggle Tampilan Form Sesuai Jenis Dokumen (Undangan vs Surat)
function toggleDocTypeFields() {
  const docType = document.getElementById('docType').value;
  const undanganFields = document.getElementById('undanganFields');
  const suratFields = document.getElementById('suratFields');

  if (docType === 'undangan') {
    undanganFields.style.display = 'block';
    suratFields.style.display = 'none';
  } else {
    undanganFields.style.display = 'none';
    suratFields.style.display = 'block';
  }
}

// Update Opsi Engine Transliterasi berdasarkan Pilihan Bahasa
function updateEngineOptions() {
  const docLang = document.getElementById('docLang').value;
  const engineGroup = document.getElementById('engineGroup');

  if (docLang === 'indonesia') {
    engineGroup.style.display = 'none';
  } else {
    engineGroup.style.display = 'block';
  }
}

// Konversi Angka Latin ke Angka Aksara Jawa (berisi Pada Pangkat ꧇)
function toAngkaJawa(numberStr) {
  let str = String(numberStr);
  let res = "";
  for (let i = 0; i < str.length; i++) {
    res += ANGKA_JAWA[str[i]] || str[i];
  }
  return `꧇${res}꧇`;
}

// Transliterasi Tanggal ke Aksara Jawa (Tanggal: Angka, Bulan: Teks Aksara Jawa, Tahun: Angka)
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

// Mengambil Fungsi Transliterasi & Font Sesuai Skenario
function getTransliterationConfig() {
  const docLang = document.getElementById('docLang').value;
  let transliterateFn = window.transliterasiKalimat; // Default
  let fontClass = "font-ngayogyann";

  if (docLang === 'indonesia') {
    // Skenario 3a: Bahasa Indonesia -> jawaindo.js, Font: ngayogyann.ttf
    transliterateFn = window.transliterasiKalimat; 
    fontClass = "font-ngayogyann";
  } else {
    // Skenario 3b: Bahasa Jawa
    const engine = document.getElementById('docEngine').value;
    if (['kbj.js', 'sriwedari.js', 'simplified.js'].includes(engine)) {
      transliterateFn = window.transliterasiKalimat;
      fontClass = "font-ngayogyann";
    } else if (engine === 'tradisional.js' || engine === 'carakawi.js') {
      transliterateFn = window.transliterateKawi || window.transliterasiKalimat;
      fontClass = "font-ngayogyan";
    }
  }

  return { transliterateFn, fontClass };
}

// Fungsi Random Pick Pengantar & Penutup
function getRandomText(array) {
  if (!array || array.length === 0) return "";
  const idx = Math.floor(Math.random() * array.length);
  return array[idx];
}

// Processing Submit Formulir
document.getElementById('docForm').addEventListener('submit', function(e) {
  e.preventDefault();

  const docType = document.getElementById('docType').value;
  const docLang = document.getElementById('docLang').value;
  const config = getTransliterationConfig();
  const t = config.transliterateFn;

  // Set CSS Font Class ke Kontainer PDF
  const pdfContainer = document.getElementById('pdfContainer');
  pdfContainer.className = `a4-page ${config.fontClass}`;

  // 1. Kota & Tanggal Surat
  const kota = document.getElementById('inputKota').value;
  const tglSurat = document.getElementById('inputTanggalSurat').value;
  const kotaAksara = t(kota);
  const tglSuratAksara = formatTanggalAksara(tglSurat, t);
  document.getElementById('previewKotaTanggal').innerText = `${kotaAksara}, ${tglSuratAksara}`;

  // 2. Tujuan / Penerima
  const penerima = document.getElementById('inputPenerima').value;
  let labelTujuan = (docLang === 'indonesia') ? "Kepada: Bapak/Ibu/Saudara" : "Kagem: Bapak/Ibu/Sadhérék";
  document.getElementById('previewTujuanLabel').innerText = t(labelTujuan);
  document.getElementById('previewPenerimaNama').innerText = t(penerima);

  // 3. Isi Dokumen (Undangan vs Surat)
  if (docType === 'undangan') {
    document.getElementById('previewDetailAcara').style.display = 'block';
    document.getElementById('previewIsiSuratText').style.display = 'none';

    // Pengantar & Penutup Otomatis
    if (templateData && templateData[docLang]) {
      const pengantarRaw = getRandomText(templateData[docLang].pengantar);
      const penutupRaw = getRandomText(templateData[docLang].penutup);
      document.getElementById('previewPengantar').innerText = t(pengantarRaw);
      document.getElementById('previewPenutup').innerText = t(penutupRaw);
    }

    // Detail Acara
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
    // Surat (Tanpa pengantar/penutup otomatis)
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

  // Pindah Tampilan ke Preview Section
  document.getElementById('formSection').style.display = 'none';
  document.getElementById('previewSection').style.display = 'block';
  document.getElementById('previewActions').style.display = 'flex';
  document.getElementById('postDownloadMenu').style.display = 'none';
});

// Kembali ke Edit Form
function editForm() {
  document.getElementById('formSection').style.display = 'block';
  document.getElementById('previewSection').style.display = 'none';
}

// Generate & Download PDF A4
function downloadPDF() {
  const docType = document.getElementById('docType').value;
  
  // Format Nama File: jenis_yymmdd.pdf
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const fileName = `${docType}_${yy}${mm}${dd}.pdf`;

  const element = document.getElementById('pdfContainer');
  
  const opt = {
    margin:       0,
    filename:     fileName,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  html2pdf().set(opt).from(element).save().then(() => {
    // Tampilkan Menu Lanjutan Setelah PDF Berhasil Didownload
    document.getElementById('previewActions').style.display = 'none';
    document.getElementById('postDownloadMenu').style.display = 'block';
  });
}

// Reset Formulir & Kembali ke Depan
function resetForm() {
  document.getElementById('docForm').reset();
  toggleDocTypeFields();
  updateEngineOptions();
  document.getElementById('formSection').style.display = 'block';
  document.getElementById('previewSection').style.display = 'none';
}
