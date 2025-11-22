// firebase-core.js

// ======= FIREBASE CONFIG =======
const firebaseConfig = {
    apiKey: "AIzaSyCPa1qbQwQ1A5rQJAdHd5A42Ww8EPdelQ0",
    authDomain: "prayogsetu.firebaseapp.com",
    databaseURL: "https://prayogsetu-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "prayogsetu",
    storageBucket: "prayogsetu.appspot.com",
    messagingSenderId: "672822791748",
    appId: "1:672822791748:web:10c64ff3772dfb0f323611"
};

// Initialize Firebase if not already
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Keep session persistent
firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(err => {
    console.warn("Could not set persistence:", err);
});

// -----------------------------
// Helpers
// -----------------------------
function normalizeEmail(email) {
    if (!email) return "";
    return String(email).trim().toLowerCase();
}

function extractNameFromEmail(email) {
    if (!email) return "";
    const local = email.split("@")[0] || "";
    const firstSegment = local.split(/[._]/)[0];
    const alphaOnly = firstSegment.replace(/[0-9]/g, "");
    if (!alphaOnly) return "";
    return alphaOnly.charAt(0).toUpperCase() + alphaOnly.slice(1);
}

async function getUserRole(email) {
    try {
        const norm = normalizeEmail(email);
        const snap = await firebase.database().ref("users/role").once("value");
        const roles = snap.val();
        if (!roles) return null;

        for (const roleKey of Object.keys(roles)) {
            const roleBucket = roles[roleKey];
            if (!roleBucket) continue;

            if (typeof roleBucket === "string") {
                if (normalizeEmail(roleBucket) === norm) return roleKey;
            } else if (typeof roleBucket === "object") {
                for (const childKey of Object.keys(roleBucket)) {
                    const candidate = roleBucket[childKey];
                    if (normalizeEmail(candidate) === norm) return roleKey;
                }
            }
        }
        return null;
    } catch (err) {
        console.error("Error fetching roles:", err);
        return null;
    }
}

// -----------------------------
// Load user info globally
// -----------------------------
async function loadUserInfo(user) {
    if (!user || !user.email) {
        window.userInfo = null;
        return;
    }
    const roleKey = await getUserRole(user.email);
    const name = extractNameFromEmail(user.email);

    let roleLabel = null;
    if (roleKey === "primary") roleLabel = "Primary Admin";
    else if (roleKey === "secondary") roleLabel = "Secondary Admin";
    else if (roleKey === "volunteer") roleLabel = "Volunteer";

    window.userInfo = {
        email: user.email,
        roleKey,
        roleLabel,
        name
    };

    return window.userInfo;
}

// -----------------------------
// Populate drawer/footer dynamically
// -----------------------------
function populateDrawerFooter() {
    const loggedInName = document.getElementById("loggedInName");
    const loggedInRole = document.getElementById("loggedInRole");
    const logoutBtn = document.getElementById("logoutBtn");

    if (!loggedInName || !loggedInRole || !logoutBtn) return;

    loggedInName.textContent = window.userInfo?.name || "Admin";
    loggedInRole.textContent = window.userInfo?.roleLabel || "Admin";

    logoutBtn.addEventListener("click", async () => {
        await firebase.auth().signOut();
        window.location.href = "index.html";
    });
}

// Wait until userInfo is ready
const userInfoInterval = setInterval(() => {
    if (window.userInfo) {
        clearInterval(userInfoInterval);
        populateDrawerFooter();
    }
}, 100);

// -----------------------------
// Auto session handling & page protection
// -----------------------------
firebase.auth().onAuthStateChanged(async (user) => {
    const page = window.location.pathname.split("/").pop() || "index.html";

    if (!user) {
        if (page !== "index.html") window.location.href = "index.html";
        window.userInfo = null;
        return;
    }

    await loadUserInfo(user);
    const roleKey = window.userInfo?.roleKey;

    if (!roleKey) {
        if (page !== "index.html") {
            await firebase.auth().signOut();
            window.location.href = "index.html";
        }
        return;
    }

    // Protect pages
    if (page === "admindash.html" && roleKey !== "primary") window.location.href = "unauthorized.html";
    if (page === "managerdash.html" && !(roleKey === "primary" || roleKey === "secondary")) window.location.href = "unauthorized.html";
    if (page === "volunteerdash.html" && roleKey !== "volunteer") window.location.href = "unauthorized.html";
});
