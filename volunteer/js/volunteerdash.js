// ======== admindash-full.js ========

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
populateUserInfo();

// -----------------------------
// Logout
// -----------------------------
logoutBtn.addEventListener("click", async () => {
    await firebase.auth().signOut();
    window.location.href = "index.html";
});

// -----------------------------
// Background particles
// -----------------------------
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
                hue: 40 + Math.random() * 20, // golden tones
                hueDir: Math.random() < 0.5 ? 1 : -1, // direction of hue shift
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

            // Animate hue for gradient shimmer
            p.hue += p.hueDir * 0.1;
            if (p.hue > 60) p.hueDir = -1;
            if (p.hue < 30) p.hueDir = 1;

            if (p.x < -20) p.x = w + 20;
            if (p.x > w + 20) p.x = -20;
            if (p.y < -20) p.y = h + 20;
            if (p.y > h + 20) p.y = -20;

            const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 6);
            g.addColorStop(0, `hsla(${p.hue},90%,60%,0.25)`);
            g.addColorStop(0.6, `hsla(${p.hue},80%,50%,0.1)`);
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
