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

// -----------------------------
// Graphs Setup (6 graphs, 3x2 grid)
// -----------------------------
document.addEventListener("DOMContentLoaded", () => {
    // Graphs
    const graphs = [];
    for(let i=1; i<=6; i++){
        const canvas = document.getElementById(`graph${i}`);
        canvas.height = 150; // important
        const ctx = canvas.getContext('2d');
        graphs.push(new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array.from({length:10}, (_,k)=>k+1),
                datasets:[{
                    label: `Vital ${i}`,
                    data: Array.from({length:10}, ()=>Math.random()*100),
                    borderColor:`hsl(${Math.random()*360},70%,50%)`,
                    backgroundColor:'rgba(255,255,255,0.05)',
                    tension:0.4,
                    fill:true
                }]
            },
            options:{
                responsive:true,
                animation:{ duration: 500 },
                plugins:{ legend:{ display:false } },
                scales:{
                    x:{ ticks:{ color:'#d0f0ff' } },
                    y:{ beginAtZero:true, max:100, ticks:{ color:'#d0f0ff' } }
                }
            }
        }));
    }

    // Update graphs every second
    setInterval(()=>{
        graphs.forEach(g=>{
            g.data.datasets[0].data.shift();
            g.data.datasets[0].data.push(Math.random()*100);
            g.update();
        });
    }, 1000);

    // Seven-segment displays
    function updateSegments(){
        document.getElementById('segment1').textContent = new Date().toLocaleTimeString();
        document.getElementById('segment2').textContent = Math.floor(Math.random()*500);
        document.getElementById('segment3').textContent = Math.floor(Math.random()*1000);
    }
    updateSegments();
    setInterval(updateSegments,1000);
});
