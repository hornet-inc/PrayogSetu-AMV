// Elements
const userNameElem = document.getElementById("loggedInName");
const userRoleElem = document.getElementById("loggedInRole");
const logoutBtn = document.getElementById("logoutBtn");

// -----------------------------
// Populate User Info
// -----------------------------
function populateUserInfo() {
    const user = window.userInfo || {};
    if (!user || !user.email) return;

    const name = user.name || "--";
    const roleLabel = user.roleLabel || "--";

    userNameElem.textContent = name;
    userRoleElem.textContent = roleLabel;
}

// Call it once
populateUserInfo();

// ================================
// ELEMENTS
// ================================
const googleSheetURL = document.getElementById("googleSheetURL");
const uploadBtn = document.getElementById("uploadBtn");
const deleteBtn = document.getElementById("deleteBtn");
const tableBody = document.querySelector("#stockTable tbody");
const fileStatus = document.getElementById("currentFile");
const googleSheetStatus = document.getElementById("currentGoogleSheet");

// Firebase reference
const DB_PATH = "components/stockLink";

let currentWorkbook = null;


// ================================
// MAIN UPLOAD BUTTON HANDLER
// ================================
uploadBtn.addEventListener("click", async () => {
    const gsheetURL = googleSheetURL.value.trim();

    if (gsheetURL === "") {
        showPopup("No URL", "Please paste a valid Google Sheets link.");
        return;
    }

    // Validate link
    if (!validateSheetURL(gsheetURL)) {
        showPopup("Invalid URL", "Please enter a valid Google Sheets link.");
        return;
    }

    // Save to Firebase
    await saveLinkToFirebase(gsheetURL);

    // Load data
    loadGoogleSheet(gsheetURL);
});

// ================================
// AUTO-FILL GOOGLE SHEET LINK (ON LOAD)
// ================================
async function autoFillGoogleSheetLink() {
    try {
        const snap = await firebase.database().ref(DB_PATH).once("value");
        const url = snap.val();
        if (url) {
            googleSheetURL.value = url;          // fill input box
            googleSheetStatus.textContent = `Sheet: ${url}`;
            googleSheetStatus.style.color = "#00ffea";

            // Optionally, auto-load the sheet immediately
            loadGoogleSheet(url);
        }
    } catch (err) {
        console.error("Error fetching Google Sheet link from Firebase:", err);
    }
}

// Call on load
autoFillGoogleSheetLink();


// ================================
// DELETE SHEET LINK + RESET TABLE
// ================================
deleteBtn.addEventListener("click", async () => {
    tableBody.innerHTML = "";
    currentWorkbook = null;

    fileStatus.textContent = "No source selected";
    fileStatus.style.color = "#ff6b6b";

    googleSheetStatus.textContent = "";
    googleSheetURL.value = "";

    // Clear Firebase
    await firebase.database().ref(DB_PATH).remove().catch(() => {});

    showPopup("Deleted", "Inventory link removed from Database");
});


// ================================
// READ GOOGLE SHEET (CSV EXPORT)
// ================================
async function loadGoogleSheet(url) {
    try {
        const csvURL = convertSheetToCSV(url);

        if (!csvURL) {
            showPopup("Invalid Link", "Error converting Google Sheet link.");
            return;
        }

        const response = await fetch(csvURL);
        const csvText = await response.text();

        // Convert CSV → Workbook
        const workbook = XLSX.read(csvText, { type: "string", raw: false });
        populateTable(workbook);

        fileStatus.textContent = "Using Inventory Data from Google Sheets";
        fileStatus.style.color = "#00ffea";

        googleSheetStatus.textContent = `Sheet: ${url}`;
        googleSheetStatus.style.color = "#00ffea";

        showPopup("Loaded", "Inventory data loaded successfully!");
    } 
    catch (err) {
        showPopup("Load Error", "Failed to load Google Sheet. Make sure it is public.");
    }
}


// ================================
// VALIDATE GOOGLE SHEETS LINK
// ================================
function validateSheetURL(url) {
    return url.includes("docs.google.com/spreadsheets");
}


// Convert Google Sheet → CSV URL
function convertSheetToCSV(url) {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) return null;

    const sheetId = match[1];
    return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
}


// ================================
// SAVE GOOGLE SHEET LINK TO FIREBASE
// ================================
async function saveLinkToFirebase(url) {
    await firebase.database().ref(DB_PATH).set(url);
    showPopup("Saved", "Inventory link saved successfully!");
}


// ================================
// POPULATE TABLE
// ================================
function populateTable(workbook) {
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    tableBody.innerHTML = "";

    rows.forEach((row, index) => {
        const safe = v => (v === undefined ? "" : v);

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${safe(row["Component ID"])}</td>
            <td>${safe(row["Component Name"])}</td>
            <td>${safe(row["Total Quantity"])}</td>
            <td>${safe(row["Quantity Available"])}</td>
            <td>${safe(row["Description"])}</td>
            <td>${safe(row["Request Type"])}</td>
        `;
        tableBody.appendChild(tr);
    });

    highlightTable();
}


// ================================
// ANIMATION
// ================================
function highlightTable() {
    const card = document.querySelector(".table-card");
    card.style.animation = "flashCard 0.4s ease";
    setTimeout(() => (card.style.animation = ""), 400);
}


// ================================
// POPUP SYSTEM
// ================================
function showPopup(title, message) {
    document.getElementById("popupTitle").textContent = title;
    document.getElementById("popupMessage").textContent = message;

    const overlay = document.getElementById("popupOverlay");
    overlay.style.display = "flex";

    document.getElementById("popupOkBtn").onclick = () => {
        overlay.style.display = "none";
    };
}
