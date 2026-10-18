// =====================================================
// Chanuka Market Store - main.js - FINAL FIXED
// =====================================================
function parsePrice(text) {
    return Number(String(text).replace(/[^0-9.]/g, "")) || 0;
}
function formatPrice(amount) {
    return "KSh " + amount.toLocaleString("en-KE");
}
function loadData(key, fallback) {
    try {
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : fallback;
    } catch (error) {
        return fallback;
    }
}
function saveData(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {}
}
let toastTimer;
function showToast(message) {
    let toast = document.getElementById("toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "toast";
        toast.setAttribute("role", "status");
        Object.assign(toast.style, {
            position: "fixed", left: "50%", bottom: "24px",
            transform: "translateX(-50%)", background: "rgb(59, 59, 173)",
            color: "white", padding: "0.8rem 1.2rem", borderRadius: "0.5rem",
            fontWeight: "600", zIndex: "200", boxShadow: "0 10px 30px rgb(0 0 0 / 0.3)",
            transition: "opacity 0.3s ease", opacity: "0"
        });
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.opacity = "1";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.style.opacity = "0"; }, 3500);
}
function normalizePhoneFrontend(phone){
  let n = String(phone).replace(/[^0-9]/g,"");
  if(n.startsWith("0")) n = "254"+n.slice(1);
  if(n.startsWith("7") || n.startsWith("1")) n = "254"+n;
  return n.length===12 ? n : null;
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else { init(); }

function init() {
const menuButton = document.getElementById("menuButton");
const navMenu = document.getElementById("nav");
if (menuButton && navMenu) menuButton.addEventListener("click", function () {
    navMenu.classList.toggle("show");
});
if (navMenu) navMenu.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () { navMenu.classList.remove("show"); });
});
document.addEventListener("click", function (event) {
    if (navMenu && !event.target.closest(".header")) { navMenu.classList.remove("show"); }
});

document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function (event) {
        const id = link.getAttribute("href").slice(1);
        if (!id) return;
        const target = document.getElementById(id) || Array.from(document.querySelectorAll("[id]")).find(function (element) {
            return element.id.toLowerCase() === id.toLowerCase();
        });
        event.preventDefault();
        if (target) {
            target.scrollIntoView({ behavior: "smooth" });
            history.replaceState(null, "", "#" + target.id);
        } else { showToast(link.textContent.trim() + " section is coming soon!"); }
    });
});

const searchInput = document.getElementById("searchinput");
const searchButton = document.getElementById("searchButon");
const categoryButtons = document.querySelectorAll(".category-btn");
const productsGrid = document.getElementById("productsGrid");
const productCards = document.querySelectorAll(".product-card");
let activeCategory = "All";
const noResults = document.createElement("p");
noResults.textContent = "No products found. Try another search or category.";
Object.assign(noResults.style, { gridColumn: "1 / -1", textAlign: "center", padding: "2rem", fontWeight: "600", display: "none" });
if (productsGrid) productsGrid.appendChild(noResults);
function filterProducts() {
    const searchText = searchInput ? searchInput.value.trim().toLowerCase() : "";
    let visibleCount = 0;
    productCards.forEach(function (card) {
        const category = card.dataset.category || "";
        const text = ((card.dataset.name || "") + " " + card.textContent).toLowerCase();
        const matchesCategory = activeCategory === "All" || category === activeCategory;
        const matchesSearch = searchText === "" || text.includes(searchText);
        if (matchesCategory && matchesSearch) { card.style.display = ""; visibleCount++; }
        else { card.style.display = "none"; }
    });
    noResults.style.display = visibleCount === 0 ? "block" : "none";
    return visibleCount;
}
if (searchInput) searchInput.addEventListener("input", filterProducts);
function runSearch() {
    const count = filterProducts();
    const productsSection = document.getElementById("products") || productsGrid;
    if (productsSection) productsSection.scrollIntoView({ behavior: "smooth" });
    if (searchInput && searchInput.value.trim() !== "") {
        showToast(count + (count === 1 ? " product" : " products") + " found");
    }
}
if (searchButton) searchButton.addEventListener("click", runSearch);
if (searchInput) searchInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") { event.preventDefault(); runSearch(); }
});
categoryButtons.forEach(function (button) {
    button.addEventListener("click", function () {
        categoryButtons.forEach(function (btn) { btn.classList.remove("active"); });
        button.classList.add("active");
        activeCategory = button.dataset.category || button.textContent.trim();
        filterProducts();
    });
});

let favorites = loadData("chanukaFavorites", []);
document.querySelectorAll(".favorite-button").forEach(function (button) {
    const card = button.closest(".product-card");
    if (!card) return;
    const name = card.dataset.name || card.querySelector("h3, h2")?.textContent.trim() || "Product";
    button.setAttribute("aria-label", "Add " + name + " to favorites");
    if (favorites.includes(name)) { button.classList.add("liked"); }
    button.addEventListener("click", function () {
        const isLiked = favorites.includes(name);
        if (isLiked) {
            favorites = favorites.filter(function (item) { return item !== name; });
            showToast(name + " removed from favorites");
        } else {
            favorites.push(name);
            showToast(name + " added to favorites");
        }
        saveData("chanukaFavorites", favorites);
        document.querySelectorAll(".product-card").forEach(function (otherCard) {
            const otherButton = otherCard.querySelector(".favorite-button");
            if (otherCard.dataset.name === name && otherButton) {
                otherButton.classList.toggle("liked", !isLiked);
            }
        });
    });
});

const cartButton = document.getElementById("cart-button");
const cartCount = document.getElementById("cartcount");
let cart = loadData("chanukaCart", []);
const cartOverlay = document.createElement("div");
Object.assign(cartOverlay.style, { position: "fixed", inset: "0", background: "rgb(0 0 0 / 0.5)", zIndex: "100", display: "none" });
const cartPanel = document.createElement("aside");
cartPanel.setAttribute("aria-label", "Shopping cart");
Object.assign(cartPanel.style, {
    position: "absolute", top: "0", right: "0", width: "min(380px, 100%)", height: "100%",
    background: "whitesmoke", display: "flex", flexDirection: "column", boxShadow: "-10px 0 30px rgb(0 0 0 / 0.3)"
});
cartPanel.innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:center;padding:1rem;background-color:rgb(159, 62, 78);color:white;">' +
        '<h3>Your Cart</h3>' +
        '<button data-cart-close aria-label="Close cart" style="border:none;background:none;color:white;font-size:24px;">&times;</button>' +
    '</div>' +
    '<div data-cart-items style="flex:1;overflow-y:auto;padding:1rem;display:flex;flex-direction:column;gap:0.8rem;"></div>' +
    '<div style="padding:1rem;border-top:1px solid #ccc;display:flex;flex-direction:column;gap:0.8rem;">' +
        '<div style="display:flex;justify-content:space-between;font-size:18px;"><strong>Total</strong><strong data-cart-total style="color:green;">KSh 0</strong></div>' +
        '<button data-cart-checkout style="border:none;background-color:#2e37d1;color:white;padding:0.8rem;border-radius:0.5rem;font-weight:600;">Checkout</button>' +
        '<button data-cart-clear style="border:1px solid #2e37d1;background:none;color:#2e37d1;padding:0.6rem;border-radius:0.5rem;font-weight:600;">Clear cart</button>' +
    '</div>';
cartOverlay.appendChild(cartPanel);
document.body.appendChild(cartOverlay);
const cartItemsBox = cartPanel.querySelector("[data-cart-items]");
const cartTotal = cartPanel.querySelector("[data-cart-total]");

function renderCart() {
    const totalItems = cart.reduce(function (sum, item) { return sum + item.quantity; }, 0);
    const totalPrice = cart.reduce(function (sum, item) { return sum + item.price * item.quantity; }, 0);
    if (cartCount) cartCount.textContent = totalItems;
    cartTotal.textContent = formatPrice(totalPrice);
    cartItemsBox.innerHTML = "";
    if (cart.length === 0) {
        cartItemsBox.innerHTML = '<p style="text-align:center;padding:2rem 0;">Your cart is empty.</p>'; return;
    }
    cart.forEach(function (item, index) {
        const row = document.createElement("div");
        Object.assign(row.style, { background: "white", border: "1px solid blue", borderRadius: "0.5rem", padding: "0.8rem", display: "flex", flexDirection: "column", gap: "0.5rem" });
        const title = document.createElement("strong"); title.textContent = item.name;
        const controls = document.createElement("div");
        Object.assign(controls.style, { display: "flex", justifyContent: "space-between", alignItems: "center" });
        const buttonStyle = "border:none;background-color:rgb(59, 59, 173);color:white;width:30px;height:30px;border-radius:0.3rem;font-weight:600;";
        controls.innerHTML = '<div style="display:flex;align-items:center;gap:0.5rem;">' + '<button data-action="decrease" style="' + buttonStyle + '">-</button>' + '<span>' + item.quantity + '</span>' + '<button data-action="increase" style="' + buttonStyle + '">+</button>' + '</div>' + '<span style="color:green;font-weight:bold;">' + formatPrice(item.price * item.quantity) + '</span>' + '<button data-action="remove" style="border:none;background:none;color:#d03030;font-weight:600;">Remove</button>';
        controls.querySelectorAll("button").forEach(function (button) {
            button.addEventListener("click", function () {
                const action = button.dataset.action;
                if (action === "increase") { item.quantity++; } else if (action === "decrease") { item.quantity--; }
                if (action === "remove" || item.quantity <= 0) { cart.splice(index, 1); }
                saveData("chanukaCart", cart); renderCart();
            });
        });
        row.appendChild(title); row.appendChild(controls); cartItemsBox.appendChild(row);
    });
}
document.querySelectorAll(".add-to-cart").forEach(function (button) {
    button.addEventListener("click", function () {
        const card = button.closest(".product-card");
        const name = button.dataset.name || (card && card.dataset.name) || "Product";
        const price = parsePrice(button.dataset.price || (card && card.querySelector(".price, .product-price")?.textContent) || 0);
        const existing = cart.find(function (item) { return item.name === name; });
        if (existing) { existing.quantity++; } else { cart.push({ name: name, price: price, quantity: 1 }); }
        saveData("chanukaCart", cart); renderCart(); showToast(name + " added to cart");
        if (cartButton) { cartButton.style.transform = "scale(1.15)"; setTimeout(function () { cartButton.style.transform = ""; }, 160); }
    });
});
function openCart() { cartOverlay.style.display = "block"; document.body.style.overflow = "hidden"; }
function closeCart() { cartOverlay.style.display = "none"; document.body.style.overflow = ""; }
if (cartButton) cartButton.addEventListener("click", openCart);
cartPanel.querySelector("[data-cart-close]").addEventListener("click", closeCart);
cartOverlay.addEventListener("click", function (event) { if (event.target === cartOverlay) { closeCart(); } });
document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") { closeCart(); if (navMenu) navMenu.classList.remove("show"); }
});
cartPanel.querySelector("[data-cart-clear]").addEventListener("click", function () {
    cart = []; saveData("chanukaCart", cart); renderCart();
});

// --- FIXED CHECKOUT - FINAL VERSION ---
cartPanel.querySelector("[data-cart-checkout]").addEventListener("click", async () => {
    if (cart.length === 0) { showToast("Your cart is empty"); return; }
    const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    let phone = prompt("Enter M-Pesa number to pay: " + formatPrice(totalPrice) + "\n(e.g. 0712345678 or 2547...)");
    if (!phone) return;
    const normalized = normalizePhoneFrontend(phone);
    if (!normalized) { showToast("Invalid phone. Use 07... or 2547..."); return; }
    
    const checkoutBtn = cartPanel.querySelector("[data-cart-checkout]");
    const originalText = checkoutBtn.textContent;
    try {
        checkoutBtn.textContent = "Sending...";
        checkoutBtn.disabled = true;
        showToast("Sending STK push to " + normalized + "...");
        const res = await fetch('https://backendchanuka.onrender.com/api/stkpush', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: normalized, amount: Math.round(totalPrice) || 1 })
        });
        const data = await res.json();
        console.log("Server response:", data);
        if (data.ResponseCode == '0' || data.ResponseCode == 0) {
            showToast("STK Sent! Check your phone " + normalized + " and enter PIN");
            cart = []; saveData("chanukaCart", cart); renderCart(); closeCart();
        } else {
            showToast("Failed: " + (data.errorMessage || data.error || data.ResultDesc || JSON.stringify(data).slice(0,100)));
        }
    } catch (err) {
        console.error(err);
        showToast("Cannot connect to backend. Is node server.js running on port 3000?");
    } finally {
        checkoutBtn.textContent = originalText;
        checkoutBtn.disabled = false;
    }
});

renderCart();
}
