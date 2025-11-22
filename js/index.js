// index.js

// Elements
const loginForm = document.getElementById("loginForm");
const loginBtn = document.getElementById("loginBtn");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const errorMsg = document.getElementById("error-msg");

const dialogOverlay = document.getElementById("dialogOverlay");
const dialogTitle = document.getElementById("dialogTitle");
const dialogMessage = document.getElementById("dialogMessage");
const dialogBtn = document.getElementById("dialogBtn");
const dialogIcon = document.getElementById("dialogIcon");

// Domain enforcement
function isDomainValid(email) {
  return String(email || "").toLowerCase().endsWith("@presidencyuniversity.in");
}

// Show dialog helper
function showDialog(type, title, message, cb) {
  dialogOverlay.classList.remove("hidden");
  dialogTitle.textContent = title;
  dialogMessage.textContent = message;

  dialogIcon.className =
    "dialog-icon " +
    (type === "success" ? "success" : type === "error" ? "error" : "warn");

  dialogBtn.onclick = () => {
    dialogOverlay.classList.add("hidden");
    if (typeof cb === "function") cb();
  };
}

// Background particles
(function particlesInit() {
  const canvas = document.getElementById("particles");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  let w, h, particles = [];

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resize);
  resize();

  function createParticles() {
    particles = [];
    const count = Math.max(40, Math.floor((w * h) / 60000));
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.8 + Math.random() * 2.2,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        hue: 190 + Math.random() * 40,
        life: 40 + Math.random() * 100
      });
    }
  }

  createParticles();
  window.addEventListener("resize", createParticles);

  function draw() {
    ctx.clearRect(0, 0, w, h);

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.05;

      if (p.x < -20) p.x = w + 20;
      if (p.x > w + 20) p.x = -20;
      if (p.y < -20) p.y = h + 20;
      if (p.y > h + 20) p.y = -20;

      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 6);
      g.addColorStop(0, `hsla(${p.hue},90%,80%,0.18)`);
      g.addColorStop(0.6, `hsla(${p.hue},80%,65%,0.06)`);
      g.addColorStop(1, `rgba(0,0,0,0)`);

      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 6, 0, Math.PI * 2);
      ctx.fill();
    });

    requestAnimationFrame(draw);
  }

  requestAnimationFrame(draw);
})();

// ENTER key triggers submit
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter") loginBtn.click();
});

// UI busy helper
function setBusy(isBusy) {
  loginBtn.disabled = isBusy;
  loginBtn.textContent = isBusy ? "Signing in..." : "Sign in";
}

// Submit handler
loginForm.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  errorMsg.textContent = "";

  const email = (emailInput.value || "").trim().toLowerCase();
  const password = passwordInput.value;

  // Validation
  if (!email || !password) {
    errorMsg.textContent = "Email and password are required";
    return;
  }

  if (!isDomainValid(email)) {
    console.warn("⚠ Unauthorized domain attempt:", email);
    showDialog("warn", "Unauthorized Domain", "Please use your @presidencyuniversity.in email.");
    return;
  }

  setBusy(true);

  try {
    // Firebase login
    await firebase.auth().signInWithEmailAndPassword(email, password);

    // Wait for firebase-core.js to populate window.userInfo
    await new Promise(res => setTimeout(res, 200));

    const info = window.userInfo || {};
    const roleKey = info.roleKey;
    const roleLabel = info.roleLabel;
    let name = info.name || email.split("@")[0].split(".")[0];

    if (!roleKey) {
      await firebase.auth().signOut();
      setBusy(false);

      showDialog(
        "error",
        "Unauthorized User",
        `Hello ${name}, you do not have access to this dashboard.`,
      );

      return;
    }

    // SUCCESS POPUP
    showDialog(
      "success",
      "Login Successful",
      `Welcome ${name}, ${roleLabel}`,
      () => {
        if (roleKey === "primary") window.location.href = "admin/admindash.html";
        else if (roleKey === "secondary") window.location.href = "manager/managerdash.html";
        else if (roleKey === "volunteer") window.location.href = "volunteer/volunteerdash.html";
        else window.location.href = "index.html";
      }
    );

  } catch (err) {
    console.error("Login failed:", err);
    setBusy(false);
    errorMsg.textContent = "Sign-in failed. Check credentials.";

    // shake animation
    const card = document.querySelector(".glass-card");
    if (card) {
      card.animate(
        [
          { transform: "translateX(0)" },
          { transform: "translateX(-8px)" },
          { transform: "translateX(8px)" },
          { transform: "translateX(0)" }
        ],
        { duration: 360, easing: "ease-out" }
      );
    }
  }
});
