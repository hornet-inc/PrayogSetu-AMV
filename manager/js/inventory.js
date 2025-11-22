/* ============================================================
   INVENTORY DASHBOARD – FULL JS
   Handles:
   1. Component Requests
   2. 3D Print Requests
   3. User Messages + Admin Replies
   ============================================================ */

// Firebase references
const db = firebase.database();

// DOM elements
const loggedInName = document.getElementById("loggedInName");
const loggedInRole = document.getElementById("loggedInRole");
const logoutBtn = document.getElementById("logoutBtn");

// Sections
const compRequestsBody = document.getElementById("componentRequestsBody");
const printRequestsBody = document.getElementById("printRequestsBody");
const messagesBody = document.getElementById("messagesBody");

/* ============================================================
   POPULATE USER INFO
============================================================ */
function populateUserInfo() {
    const user = window.userInfo || {};
    if (!user.email) return;

    loggedInName.textContent = user.name || "--";
    loggedInRole.textContent = user.roleLabel || "--";
}
populateUserInfo();

/* ============================================================
   LOGOUT
============================================================ */
logoutBtn.addEventListener("click", async () => {
    await firebase.auth().signOut();
    window.location.href = "index.html";
});

/* ============================================================
   INVENTORY DASHBOARD – COMPONENT REQUESTS ONLY
============================================================ */

// Modal elements
const componentModal = document.getElementById("componentModal");
const modalComponentID = document.getElementById("modalComponentID");
const modalComponentName = document.getElementById("modalComponentName");
const modalComponentDesc = document.getElementById("modalComponentDesc");
const modalTotalQty = document.getElementById("modalTotalQty");
const modalAvailableQty = document.getElementById("modalAvailableQty");
const modalRequestType = document.getElementById("modalRequestType");
const modalOkBtn = document.getElementById("modalOkBtn");

const specialNoteModal = document.getElementById("specialNoteModal");
const modalSpecialNote = document.getElementById("modalSpecialNote");
const specialOkBtn = document.getElementById("specialOkBtn");

// ================== FETCH SHEET LINK FROM FIREBASE ==================
async function getSheetLinkFromFirebase() {
    try {
        const snap = await db.ref("components/stockLink").once("value");
        return snap.val();
    } catch (err) {
        console.error("Error reading sheet link from Firebase:", err);
        return null;
    }
}

// ================== CONVERT GOOGLE SHEET URL TO CSV ==================
function convertSheetToCSV(url) {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) return null;
    const sheetId = match[1];
    return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
}

// ================== FETCH AND PARSE SHEET ==================
async function fetchInventoryDataFromSheet(sheetURL) {
    if (!sheetURL) return {};
    const csvURL = convertSheetToCSV(sheetURL);
    if (!csvURL) return {};

    try {
        const resp = await fetch(csvURL);
        const csvText = await resp.text();

        const lines = csvText.trim().split("\n");
        const headers = lines.shift().split(",").map(h => h.trim());

        const data = {};
        lines.forEach(line => {
            const values = line.split(",").map(v => v.trim());
            const obj = {};
            headers.forEach((h, i) => obj[h] = values[i] || "");
            if (obj["Component ID"]) {
                data[obj["Component ID"]] = {
                    id: obj["Component ID"],
                    name: obj["Component Name"] || "--",
                    description: obj["Description"] || "--",
                    totalQty: obj["Total Quantity"] || "--",
                    availableQty: obj["Quantity Available"] || "--",
                    requestType: obj["Request Type"] || "Normal"
                };
            }
        });

        return data;
    } catch (err) {
        console.error("Error fetching sheet CSV:", err);
        return {};
    }
}

/* ============================================================
   LOAD COMPONENT REQUESTS (optimized)
============================================================ */
function loadComponentRequestsRealtime() {
    compRequestsBody.innerHTML = "";

    const sheetLinkPromise = getSheetLinkFromFirebase();

    db.ref("requests").on("value", async (usersSnap) => {
        compRequestsBody.innerHTML = "";

        const usersData = usersSnap.val() || {};
        const fragment = document.createDocumentFragment();
        let slNo = 1;

        const sheetLink = await sheetLinkPromise;
        window.inventoryData = await fetchInventoryDataFromSheet(sheetLink);

        for (const userEmail in usersData) {
            const userRequests = usersData[userEmail];
            const [userNamePart, rollPart] = userEmail.split("@")[0].split("_");
            const userName = userNamePart || userEmail;
            const rollNumber = rollPart || "--";

            for (const productId in userRequests) {
                if (!/^\d+$/.test(productId)) continue;
                const history = userRequests[productId].history || {};

                for (const timestamp in history) {
                    const req = history[timestamp];
                    const productInfo = window.inventoryData?.[productId] || {};

                    const row = document.createElement("tr");
                    row.innerHTML = `
                        <td>${slNo++}</td>
                        <td>${userName}</td>
                        <td>${rollNumber}</td>
                        <td>
                            <span class="component-link" 
                                  data-id="${productId}" 
                                  data-name="${productInfo.name || `ID ${productId}`}" 
                                  data-desc="${productInfo.description || "--"}" 
                                  data-total="${productInfo.totalQty || "--"}" 
                                  data-available="${productInfo.availableQty || "--"}" 
                                  data-requesttype="${productInfo.requestType || req.requestType || "Normal"}">
                                ${productId}
                            </span>
                        </td>
                        <td>${req.requestedQty || "--"}</td>
                        <td>
                            <select data-user="${userEmail}" data-product="${productId}" data-timestamp="${timestamp}">
                                <option value="raised" ${req.status === "raised" ? "selected" : ""}>Raised</option>
                                <option value="approved" ${req.status === "approved" ? "selected" : ""}>Approved</option>
                                <option value="rejected" ${req.status === "rejected" ? "selected" : ""}>Rejected</option>
                                <option value="delivered" ${req.status === "delivered" ? "selected" : ""}>Delivered</option>
                                <option value="returned" ${req.status === "returned" ? "selected" : ""}>Returned</option>
                            </select>
                        </td>
                        <td>${new Date(req.time || timestamp).toLocaleString()}</td>
                        <td>
                            ${req.specialNote ? `<i class="special-note-btn" data-note="${req.specialNote}">🛈</i>` : ""}
                        </td>
                        <td>
                            <button class="save-btn" 
                                    data-user="${userEmail}" 
                                    data-product="${productId}" 
                                    data-timestamp="${timestamp}">
                                Update
                            </button>
                        </td>
                    `;
                    fragment.appendChild(row);
                }
            }
        }
        compRequestsBody.appendChild(fragment);
    });
}


// ================== MODAL & SAVE HANDLERS ==================
document.addEventListener("click", async (e) => {
if (e.target.classList.contains("save-btn")) {
    const btn = e.target;
    const userEmail = btn.dataset.user;
    const productId = btn.dataset.product;
    const timestamp = btn.dataset.timestamp;

    const selectElem = document.querySelector(
        `select[data-user="${userEmail}"][data-product="${productId}"][data-timestamp="${timestamp}"]`
    );
    const newStatus = selectElem.value;

    try {
        await db.ref(`requests/${userEmail}/${productId}/history/${timestamp}/status`).set(newStatus);

        // Show popup
        const popup = document.getElementById("savePopup");
        const popupMsg = document.getElementById("savePopupMessage");
        popupMsg.textContent = `Status updated to "${newStatus}" for ${productId} (${userEmail})`;
        popup.style.display = "block";

        // Close button handler
        document.getElementById("savePopupOk").onclick = () => {
            popup.style.display = "none";
        };

        // Optional: Auto-close after 2.5 seconds
        setTimeout(() => { popup.style.display = "none"; }, 2500);

    } catch (err) {
        console.error(err);
    }
}


    if (e.target.classList.contains("component-link")) {
        modalComponentID.textContent = e.target.dataset.id;
        modalComponentName.textContent = e.target.dataset.name;
        modalComponentDesc.textContent = e.target.dataset.desc;
        modalTotalQty.textContent = e.target.dataset.total;
        modalAvailableQty.textContent = e.target.dataset.available;
        modalRequestType.textContent = e.target.dataset.requesttype;
        componentModal.style.display = "flex";
    }

    if (e.target.classList.contains("special-note-btn")) {
        modalSpecialNote.textContent = e.target.dataset.note;
        specialNoteModal.style.display = "flex";
    }
});

modalOkBtn.addEventListener("click", () => componentModal.style.display = "none");
specialOkBtn.addEventListener("click", () => specialNoteModal.style.display = "none");

// ================== INITIAL LOAD ==================
// loadComponentRequests(); // remove this
loadComponentRequestsRealtime();




/* ============================================================
   LOAD 3D PRINT REQUESTS (optimized)
============================================================ */
function load3DPrintRequestsRealtime() {
    printRequestsBody.innerHTML = "";

    db.ref("requests").on("value", (usersSnap) => {
        printRequestsBody.innerHTML = "";
        const usersData = usersSnap.val() || {};
        const fragment = document.createDocumentFragment();
        let slNo = 1;

        for (const userEmail in usersData) {
            const userRequests = usersData[userEmail];
            const printJobs = userRequests["3D_Print"]?.history || {};
            const [userNamePart] = userEmail.split("@")[0].split("_");
            const userName = userNamePart || userEmail;

            for (const timestamp in printJobs) {
                const job = printJobs[timestamp];
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${slNo++}</td>
                    <td>${userName}</td>
                    <td>${job.requestType || "--"}</td>
                    <td>${job.material || "--"}</td>
                    <td>${job.link ? `<a href="${job.link}" target="_blank">View STL</a>` : "--"}</td>
                    <td>
                        <select data-user="${userEmail}" data-timestamp="${timestamp}">
                            <option value="raised" ${job.status === "raised" ? "selected" : ""}>Raised</option>
                            <option value="approved" ${job.status === "approved" ? "selected" : ""}>Approved</option>
                            <option value="rejected" ${job.status === "rejected" ? "selected" : ""}>Rejected</option>
                            <option value="delivered" ${job.status === "delivered" ? "selected" : ""}>Delivered</option>
                        </select>
                    </td>
                    <td>${new Date(job.time || timestamp).toLocaleString()}</td>
                    <td>
                        <button class="save-print-btn" data-user="${userEmail}" data-timestamp="${timestamp}">
                            Update
                        </button>
                    </td>
                `;
                fragment.appendChild(row);
            }
        }
        printRequestsBody.appendChild(fragment);
    });
}

// ================== SAVE 3D PRINT STATUS ==================
document.addEventListener("click", async (e) => {
    if (e.target.classList.contains("save-print-btn")) {
        const btn = e.target;
        const userEmail = btn.dataset.user;
        const timestamp = btn.dataset.timestamp;

        const selectElem = document.querySelector(
            `select[data-user="${userEmail}"][data-timestamp="${timestamp}"]`
        );
        const newStatus = selectElem.value;

        try {
            await db.ref(`requests/${userEmail}/3D_Print/history/${timestamp}/status`).set(newStatus);

            // Show popup
            const popup = document.getElementById("savePopup");
            const popupMsg = document.getElementById("savePopupMessage");
            popupMsg.textContent = `3D Print status updated to "${newStatus}" for ${userEmail}`;
            popup.style.display = "block";

            document.getElementById("savePopupOk").onclick = () => {
                popup.style.display = "none";
            };
            setTimeout(() => { popup.style.display = "none"; }, 2500);

        } catch (err) {
            console.error(err);
        }
    }
});

// ================== INITIAL LOAD ==================
// load3DPrintRequests(); // remove this
load3DPrintRequestsRealtime();

/* ============================
   MENTOR SUPPORT CHAT (ADMIN)
   Real-time updates + individual admin timestamps
============================ */

const messageUserList = document.getElementById("messageUserList");
const chatHeaderText = document.getElementById("chatHeaderText");
const deleteChatBtn = document.getElementById("deleteChatBtn");
const chatBody = document.getElementById("chatBody");
const chatInput = document.getElementById("chatInput");
const sendReplyBtn = document.getElementById("sendReplyBtn");

let selectedUserEmail = null;
let selectedMessageTimestamp = null;
let chatListenerRef = null; // to track active listener

// Helper: format date/time
function formatDate(ts) {
    const d = new Date(Number(ts));
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString();
}
function formatTime(ts) {
    const d = new Date(Number(ts));
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Enable/disable input
function updateInputState() {
    const enabled = !!selectedUserEmail && !!selectedMessageTimestamp;
    chatInput.disabled = !enabled;
    sendReplyBtn.disabled = !enabled;
}

// ----------------- Load user list -----------------
function loadMessageUsers() {
    messageUserList.innerHTML = "";

    // Real-time listener for all users
    db.ref("requests").on("value", (snap) => {
        const data = snap.val() || {};
        messageUserList.innerHTML = "";

        Object.entries(data).forEach(([email, userData]) => {
            if (!userData.Mentor_Support || !userData.Mentor_Support.history) return;

            const [namePart, rollPart] = email.split("@")[0].split("_");
            const displayName = namePart || email;
            const displayRoll = rollPart || "--";

            const item = document.createElement("div");
            item.className = "user-item";
            item.dataset.email = email;
            item.innerHTML = `
                <div class="user-name">${displayName}</div>
                <div class="user-roll">${displayRoll}</div>
            `;

            item.addEventListener("click", () => {
                document.querySelectorAll(".user-item").forEach(i => i.classList.remove("active"));
                item.classList.add("active");

                selectedUserEmail = email;
                selectedMessageTimestamp = null;
                chatHeaderText.textContent = `Chat – ${displayName} (${displayRoll})`;
                deleteChatBtn.style.display = "inline-block";

                // Remove previous listener if exists
                if (chatListenerRef) chatListenerRef.off();

                loadChatMessages(email);
                updateInputState();
            });

            messageUserList.appendChild(item);
        });
    });
}

// ----------------- Load chat messages -----------------
function loadChatMessages(email) {
    chatBody.innerHTML = "";
    selectedMessageTimestamp = null;
    updateInputState();

    const histRef = db.ref(`requests/${email}/Mentor_Support/history`);
    chatListenerRef = histRef; // track current listener

    histRef.on("value", (snap) => {
        const messages = snap.val() || {};
        const entries = Object.entries(messages)
            .map(([k, v]) => ({ key: k, data: v }))
            .sort((a, b) => Number(a.key) - Number(b.key));

        chatBody.innerHTML = "";
        if (!entries.length) {
            chatBody.innerHTML = `<div class="empty-chat-note" style="text-align:center;color:#9fb8c8;padding:30px">No messages yet.</div>`;
            return;
        }

        let lastDate = null;
        entries.forEach(({ key: ts, data }) => {
            if (!data.query) return;

            // Date separator
            const msgDate = formatDate(ts);
            if (msgDate !== lastDate) {
                const dateSep = document.createElement("div");
                dateSep.style.textAlign = "center";
                dateSep.style.margin = "12px 0";
                dateSep.style.color = "#bfefff";
                dateSep.style.fontSize = "0.9rem";
                dateSep.textContent = msgDate;
                chatBody.appendChild(dateSep);
                lastDate = msgDate;
            }

            // User message (no timestamp)
            const userWrapper = document.createElement("div");
            userWrapper.className = "chat-item-wrapper";
            userWrapper.dataset.ts = ts;

            const userMsg = document.createElement("div");
            userMsg.className = "chat-msg user";
            userMsg.textContent = data.query;

            userWrapper.appendChild(userMsg);
            userWrapper.addEventListener("click", () => {
                document.querySelectorAll(".chat-item-wrapper.selected").forEach(n => n.classList.remove("selected"));
                userWrapper.classList.add("selected");
                selectedMessageTimestamp = ts;
                updateInputState();
                chatInput.focus();
            });

            chatBody.appendChild(userWrapper);

            // Admin reply (with timestamp below)
            if (data.solution) {
                const solWrapper = document.createElement("div");
                solWrapper.className = "chat-item-wrapper";

                const adminMsg = document.createElement("div");
                adminMsg.className = "chat-msg admin";
                adminMsg.textContent = data.solution;

                const adminTime = document.createElement("div");
                adminTime.className = "chat-time";
                adminTime.style.fontSize = "0.75rem";
                adminTime.style.opacity = "0.85";
                adminTime.style.marginTop = "6px";
                adminTime.textContent = formatTime(data.time || ts);

                solWrapper.appendChild(adminMsg);
                solWrapper.appendChild(adminTime);

                chatBody.appendChild(solWrapper);
            }
        });

        // Auto-select last unanswered
        const lastUnanswered = entries.slice().reverse().find(e => e.data && e.data.query && !e.data.solution);
        if (lastUnanswered) {
            const wrapperEl = chatBody.querySelector(`.chat-item-wrapper[data-ts="${lastUnanswered.key}"]`);
            if (wrapperEl) {
                wrapperEl.classList.add("selected");
                selectedMessageTimestamp = lastUnanswered.key;
            }
        }

        chatBody.scrollTop = chatBody.scrollHeight;
        updateInputState();
    });
}

// ----------------- Send admin reply -----------------
sendReplyBtn.addEventListener("click", async () => {
    if (!selectedUserEmail) return alert("Select a user first.");
    if (!selectedMessageTimestamp) return alert("Select a user message to reply to.");

    const text = chatInput.value.trim();
    if (!text) return alert("Enter a reply.");

    const replyTS = Date.now();

    try {
        await db.ref(`requests/${selectedUserEmail}/Mentor_Support/history/${selectedMessageTimestamp}`).update({
            solution: text,
            time: replyTS
        });
        chatInput.value = "";
        loadChatMessages(selectedUserEmail);
    } catch (err) {
        console.error("Error sending reply:", err);
        alert("Failed to send reply.");
    }
});

// ----------------- Delete entire chat -----------------
if (deleteChatBtn) {
    deleteChatBtn.addEventListener("click", async () => {
        if (!selectedUserEmail) return;
        if (!confirm(`Delete entire chat history for ${selectedUserEmail}? This cannot be undone.`)) return;

        try {
            await db.ref(`requests/${selectedUserEmail}/Mentor_Support`).remove();
            selectedUserEmail = null;
            selectedMessageTimestamp = null;
            chatHeaderText.textContent = "Select a user to view messages";
            deleteChatBtn.style.display = "none";
            chatBody.innerHTML = "";
            chatInput.value = "";
            updateInputState();
            loadMessageUsers();
        } catch (err) {
            console.error("Failed to delete chat:", err);
            alert("Delete failed.");
        }
    });
}

// ----------------- Initial -----------------
chatInput.disabled = true;
sendReplyBtn.disabled = true;
deleteChatBtn.style.display = "none";
loadMessageUsers();

