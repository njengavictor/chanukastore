/* =========================================================
   CHANUKA MARKET - MAIN FRONTEND ENGINE WITH SUPABASE CHAT 
   & COMMISSION / PICKUP STATION NOTIFICATIONS
   ========================================================= */

// Initialize Supabase Client Configuration
const SUPABASE_URL = "https://altpysjlcjifckilnomq.supabase.co";
const SUPABASE_KEY = "sb_publishable_kpkKcjiQck7a3hNzqxJtmw_dFJOAV-8"; // Replace with your active Supabase key

/* 1. CHAT WITH SELLER HANDLER */
window.startChat = async function(productId, productName, sellerId, sellerName, price = "0", image = "", sellerPhone = "") {
  const buyerId = localStorage.getItem('userId') || 'buyer_' + Date.now();
  const buyerName = localStorage.getItem('userName') || 'Guest Buyer';
  localStorage.setItem('userId', buyerId);

  // Safely construct URL parameters to pass item, seller, price, and seller phone details to chat.html
  const chatUrl = `chat.html?product=${encodeURIComponent(productName)}&price=${encodeURIComponent(price)}&seller=${encodeURIComponent(sellerName)}&image=${encodeURIComponent(image)}&sellerId=${encodeURIComponent(sellerId)}&sellerPhone=${encodeURIComponent(sellerPhone || "0712345678")}`;
  
  window.location.href = chatUrl;
}

/* 2. HELPER UTILITIES */
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
  if(n.startsWith("0")) n = "254" + n.slice(1);
  if(n.startsWith("7") || n.startsWith("1")) n = "254" + n;
  return n.length === 12 ? n : null;
}

/* 3. INITIALIZE APP ON DOM LOAD */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else { 
  init(); 
}

function init() {
  const menuButton = document.getElementById("menuButton");
  const navMenu = document.getElementById("nav");

  if (menuButton && navMenu) {
    menuButton.addEventListener("click", function () {
      navMenu.classList.toggle("show");
    });
  }

  if (navMenu) {
    navMenu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () { navMenu.classList.remove("show"); });
    });
  }

  document.addEventListener("click", function (event) {
    if (navMenu && !event.target.closest(".header")) { navMenu.classList.remove("show"); }
  });

  /* Smooth Scrolling */
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
      } else { 
        showToast(link.textContent.trim() + " section is coming soon!"); 
      }
    });
  });

  /* Search & Category Filter Logic */
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
      if (matchesCategory && matchesSearch) { 
        card.style.display = ""; 
        visibleCount++; 
      } else { 
        card.style.display = "none"; 
      }
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

  /* Product Card Attachments: Modal Click, Chat Buttons & Favorites */
  productCards.forEach(function(card) {
    const pId = card.dataset.id || "prod_" + Date.now();
    const pName = card.dataset.name || card.querySelector("h3, h2")?.textContent.trim() || "Product";
    const pPrice = card.dataset.price || parsePrice(card.querySelector(".product-button strong")?.textContent || "0");
    const pImg = card.querySelector("img")?.src || "";
    const pDesc = card.dataset.description || card.querySelector(".product-description")?.textContent.trim() || "";
    const pCategory = card.dataset.category || card.querySelector(".product-category")?.textContent.trim() || "General";
    const pSeller = card.dataset.seller || "Chanuka Verified Seller";

    // Extract multi-image URLs (up to 4) from data-images attribute or fallback to card image
    let pImages = [];
    if (card.dataset.images) {
      pImages = card.dataset.images.split(",").map(url => url.trim()).filter(Boolean);
    }
    if (pImages.length === 0 && pImg) {
      pImages = [pImg];
    }

    // Attach card click modal trigger
    card.style.cursor = 'pointer';
    card.addEventListener("click", function(e) {
      if (e.target.closest(".add-to-cart") || e.target.closest(".favorite-button") || e.target.closest(".chat-with-seller-btn") || e.target.closest("a")) {
        return;
      }
      if (typeof openProductModal === "function") {
        openProductModal({
          id: pId,
          name: pName,
          price: pPrice,
          image: pImg,
          images: pImages.slice(0, 4),
          description: pDesc,
          category: pCategory,
          seller: pSeller
        });
      }
    });

    // Chat Button Handler
    const chatBtn = card.querySelector(".chat-with-seller-btn, [data-action='chat']");
    if (chatBtn) {
      chatBtn.addEventListener("click", function(e) {
        e.stopPropagation();
        e.preventDefault();
        const pSellerId = card.dataset.sellerId || "merchant_default";
        const pSellerPhone = card.dataset.sellerPhone || "0712345678";
        window.startChat(pId, pName, pSellerId, pSeller, pPrice, pImg, pSellerPhone);
      });
    }
  });

  /* Favorites Logic */
  let favorites = loadData("chanukaFavorites", []);
  document.querySelectorAll(".favorite-button").forEach(function (button) {
    const card = button.closest(".product-card");
    if (!card) return;
    const name = card.dataset.name || card.querySelector("h3, h2")?.textContent.trim() || "Product";
    button.setAttribute("aria-label", "Add " + name + " to favorites");
    if (favorites.includes(name)) { button.classList.add("liked"); }
    button.addEventListener("click", function (e) {
      e.stopPropagation();
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

  /* 4. SHOPPING CART & CHECKOUT DRAWER */
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
      cartItemsBox.innerHTML = '<p style="text-align:center;padding:2rem 0;">Your cart is empty.</p>'; 
      return;
    }

    cart.forEach(function (item, index) {
      const row = document.createElement("div");
      Object.assign(row.style, { background: "white", border: "1px solid blue", borderRadius: "0.5rem", padding: "0.8rem", display: "flex", flexDirection: "column", gap: "0.5rem" });
      const title = document.createElement("strong"); 
      title.textContent = item.name + (item.seller ? ` (Seller: ${item.seller})` : "");
      
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
      row.appendChild(title); 
      row.appendChild(controls); 
      cartItemsBox.appendChild(row);
    });
  }

  // Original Card Add to Cart Buttons Handler
  document.querySelectorAll(".add-to-cart").forEach(function (button) {
    button.addEventListener("click", function (e) {
      e.stopPropagation();
      const card = button.closest(".product-card");
      const name = button.dataset.name || (card && card.dataset.name) || "Product";
      const price = parsePrice(button.dataset.price || (card && card.dataset.price) || (card && card.querySelector("strong")?.textContent) || 0);
      const seller = button.dataset.seller || (card && card.dataset.seller) || "Merchant Store";
      const sellerPhone = button.dataset.sellerPhone || (card && card.dataset.sellerPhone) || "0712345678";
      
      const existing = cart.find(function (item) { return item.name === name; });
      if (existing) { 
        existing.quantity++; 
      } else { 
        cart.push({ name: name, price: price, quantity: 1, seller: seller, sellerPhone: sellerPhone }); 
      }

      saveData("chanukaCart", cart); 
      renderCart(); 
      showToast(name + " added to cart");

      if (cartButton) { 
        cartButton.style.transform = "scale(1.15)"; 
        setTimeout(function () { cartButton.style.transform = ""; }, 160); 
      }
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

  /* 5. CHECKOUT & STK PUSH WITH COMMISSION AND PICKUP DESTINATION NOTIFICATIONS */
  cartPanel.querySelector("[data-cart-checkout]").addEventListener("click", async () => {
    if (cart.length === 0) { showToast("Your cart is empty"); return; }

    const loggedUser = localStorage.getItem("chanuka_user") || localStorage.getItem("chanukaUser") || localStorage.getItem("userId");
    if (!loggedUser) {
      showToast("Please create an account first");
      localStorage.setItem("redirectAfterLogin", "cart");
      window.location.href = "register.html";
      return;
    }

    const stations = ["cooperative on campus", "Gataka - Destiny", "G-place Gataka", "Eldoret - Zion mall", "Delivery within gataka (Ksh 150)"];
    let choice = prompt("Choose pickup station:\n" + stations.map((s,i) => `${i+1}. ${s}`).join("\n") + "\n\nEnter number (1-5):");
    if (!choice) return;
    
    const idx = parseInt(choice) - 1;
    if (isNaN(idx) || idx < 0 || idx >= stations.length) { showToast("Invalid station"); return; }
    const selectedStation = stations[idx];

    const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    
    const commissionRate = 0.05; 
    const platformCommission = totalPrice * commissionRate;
    const sellerPayout = totalPrice - platformCommission;

    let phone = prompt("Enter M-Pesa number to pay: " + formatPrice(totalPrice) + " | Pickup: " + selectedStation + "\n(e.g. 0712345678)");
    if (!phone) return;
    
    const normalized = normalizePhoneFrontend(phone);
    if (!normalized) { showToast("Invalid phone. Use 07... or 2547..."); return; }
    
    const checkoutBtn = cartPanel.querySelector("[data-cart-checkout]");
    const originalText = checkoutBtn.textContent;

    try {
      checkoutBtn.textContent = "Sending...";
      checkoutBtn.disabled = true;
      showToast("Sending STK push to " + normalized + "...");

      const BACKEND_URL = "https://chanukamarket.onrender.com";

      const res = await fetch(`${BACKEND_URL}/stkpush`, {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ 
          phone: normalized, 
          amount: totalPrice, 
          station: selectedStation,
          commission: platformCommission,
          sellerPayout: sellerPayout,
          items: cart
        })
      });

      const data = await res.json();
      console.log("Server response:", data);

      if (data.ResponseCode == '0' || data.ResponseCode == 0) {
        showToast("STK Sent! Check your phone " + normalized + " and enter PIN");

        if (typeof supabase !== 'undefined' && SUPABASE_KEY !== "Your_Supabase_Key_Here") {
          const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
          for (const item of cart) {
            const sellerName = item.seller || "Merchant Store";
            const sellerPhone = item.sellerPhone || "0712345678";
            try {
              await client.from('notifications').insert([{
                seller_name: sellerName,
                message: `🎉 Sale Confirmed! Item: "${item.name}" (Qty: ${item.quantity}). 📍 Deliver to: ${selectedStation}. 📞 Buyer Contact: ${normalized}`,
                is_read: false
              }]);

              await client.from('orders').insert([{
                product_name: item.name,
                amount: item.price * item.quantity,
                buyer_phone: normalized,
                seller_phone: sellerPhone,
                pickup_station: selectedStation,
                status: 'PAID'
              }]);
            } catch (notifErr) {
              console.warn("Supabase sync error:", notifErr);
            }
          }
        }

        saveData("chanukaLastOrder", {
          station: selectedStation,
          items: cart,
          buyerPhone: normalized
        });

        cart = []; 
        saveData("chanukaCart", cart); 
        renderCart(); 
        closeCart();
      } else {
        showToast("Failed: " + (data.errorMessage || data.error || data.ResultDesc || "Try again"));
      }
    } catch (err) {
      console.error(err);
      showToast("Backend connection note: " + err.message);
    } finally {
      checkoutBtn.textContent = originalText;
      checkoutBtn.disabled = false;
    }
  });

  renderCart();
}
