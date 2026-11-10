/* Wrap.Co ordering: cart + WhatsApp checkout */

// Country code + number, no "+" and no spaces.
// Change this if your WhatsApp number is different from your delivery number.
var SHOP_WHATSAPP = "6738152583";

// Product ids here must match the data-id on each "Add to Cart" button.
var PRODUCTS = {
  wrap:    { name: "Rollin' N Crispy (Chicken Wrap with Fries)", price: 3.50 },
  cheese:  { name: "Cheese Sauce add-on", price: 0.50 },
  bites_s: { name: "The Co.Bites (S) - 10 pcs", price: 1.50 },
  bites_m: { name: "The Co.Bites (M) - 15 pcs", price: 2.00 },
  bites_l: { name: "The Co.Bites (L) - 20 pcs", price: 2.50 }
};

var CART_KEY = "wrapco_cart";

function loadCart() {
  try {
    var raw = localStorage.getItem(CART_KEY);
    var saved = raw ? JSON.parse(raw) : {};
    var clean = {};
    for (var id in saved) {
      var qty = parseInt(saved[id], 10);
      if (PRODUCTS[id] && qty > 0) {
        clean[id] = Math.min(qty, 99);
      }
    }
    return clean;
  } catch (e) {
    return {};
  }
}

function saveCart(cart) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch (e) {}
}

function money(n) {
  return "$" + n.toFixed(2);
}

function cartCount(cart) {
  var count = 0;
  for (var id in cart) { count += cart[id]; }
  return count;
}

function cartTotal(cart) {
  var total = 0;
  for (var id in cart) { total += PRODUCTS[id].price * cart[id]; }
  return total;
}

function updateBadges() {
  var n = cartCount(loadCart());
  var badges = document.querySelectorAll(".cart-count");
  for (var i = 0; i < badges.length; i++) {
    badges[i].textContent = n;
  }
}

var toastTimer;
function showToast(message) {
  var toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () {
    toast.classList.remove("show");
  }, 1800);
}

function addToCart(id) {
  if (!PRODUCTS[id]) { return; }
  var cart = loadCart();
  cart[id] = Math.min((cart[id] || 0) + 1, 99);
  saveCart(cart);
  updateBadges();
  showToast("Added: " + PRODUCTS[id].name);
}

function changeQty(id, delta) {
  var cart = loadCart();
  cart[id] = (cart[id] || 0) + delta;
  if (cart[id] <= 0) { delete cart[id]; }
  if (cart[id] > 99) { cart[id] = 99; }
  saveCart(cart);
  updateBadges();
  renderCart();
}

function clearCart() {
  saveCart({});
  updateBadges();
  renderCart();
}

function makeQtyButton(label, id, delta) {
  var b = document.createElement("button");
  b.type = "button";
  b.textContent = label;
  b.setAttribute("aria-label", (delta > 0 ? "Add one " : "Remove one ") + PRODUCTS[id].name);
  b.addEventListener("click", function () { changeQty(id, delta); });
  return b;
}

function renderCart() {
  var list = document.getElementById("cart-items");
  if (!list) { return; }

  var cart = loadCart();
  var ids = Object.keys(cart);
  var empty = document.getElementById("cart-empty");
  var content = document.getElementById("cart-content");

  list.innerHTML = "";

  if (ids.length === 0) {
    empty.style.display = "block";
    content.style.display = "none";
    return;
  }
  empty.style.display = "none";
  content.style.display = "flex";

  ids.forEach(function (id) {
    var row = document.createElement("div");
    row.className = "cart-row";

    var name = document.createElement("div");
    name.className = "cart-name";
    name.textContent = PRODUCTS[id].name;

    var controls = document.createElement("div");
    controls.className = "qty-controls";
    var qty = document.createElement("span");
    qty.textContent = cart[id];
    controls.appendChild(makeQtyButton("-", id, -1));
    controls.appendChild(qty);
    controls.appendChild(makeQtyButton("+", id, 1));

    var price = document.createElement("div");
    price.className = "cart-line-price";
    price.textContent = money(PRODUCTS[id].price * cart[id]);

    row.appendChild(name);
    row.appendChild(controls);
    row.appendChild(price);
    list.appendChild(row);
  });

  document.getElementById("cart-total").textContent = money(cartTotal(cart));
}

function showFormError(message) {
  var box = document.getElementById("form-error");
  if (!box) { return; }
  box.textContent = message;
  box.style.display = message ? "block" : "none";
}

function toggleAddress() {
  var checked = document.querySelector('input[name="order-type"]:checked');
  var wrap = document.getElementById("address-wrap");
  if (wrap && checked) {
    wrap.style.display = checked.value === "Delivery" ? "block" : "none";
  }
}

function sendOrder(event) {
  event.preventDefault();
  showFormError("");

  var cart = loadCart();
  if (cartCount(cart) === 0) {
    showFormError("Your cart is empty. Please add something from the menu first.");
    return;
  }

  var name = document.getElementById("cust-name").value.trim();
  var phone = document.getElementById("cust-phone").value.trim();
  var type = document.querySelector('input[name="order-type"]:checked').value;
  var address = document.getElementById("cust-address").value.trim();
  var notes = document.getElementById("cust-notes").value.trim();

  if (!name || !phone) {
    showFormError("Please enter your name and phone number.");
    return;
  }
  if (type === "Delivery" && !address) {
    showFormError("Please enter your delivery address.");
    return;
  }

  var lines = [
    "New Wrap.Co order",
    "",
    "Name: " + name,
    "Phone: " + phone,
    "Type: " + type
  ];
  if (type === "Delivery") {
    lines.push("Address: " + address);
  }
  lines.push("", "Items:");
  Object.keys(cart).forEach(function (id) {
    lines.push("- " + cart[id] + " x " + PRODUCTS[id].name + " = " + money(PRODUCTS[id].price * cart[id]));
  });
  lines.push("", "Total: " + money(cartTotal(cart)) + " (delivery fee, if any, to be confirmed)");
  if (notes) {
    lines.push("", "Notes: " + notes);
  }

  var url = "https://wa.me/" + SHOP_WHATSAPP + "?text=" + encodeURIComponent(lines.join("\n"));
  var opened = window.open(url, "_blank");
  if (!opened) {
    window.location.href = url;
  }
}

// Add-to-cart buttons work on every page
document.addEventListener("click", function (e) {
  var btn = e.target.closest ? e.target.closest(".add-to-cart") : null;
  if (btn) {
    addToCart(btn.getAttribute("data-id"));
  }
});

document.addEventListener("DOMContentLoaded", function () {
  updateBadges();
  renderCart();

  var form = document.getElementById("order-form");
  if (form) {
    form.addEventListener("submit", sendOrder);
    var radios = document.querySelectorAll('input[name="order-type"]');
    for (var i = 0; i < radios.length; i++) {
      radios[i].addEventListener("change", toggleAddress);
    }
    toggleAddress();
  }

  var clearBtn = document.getElementById("clear-cart");
  if (clearBtn) {
    clearBtn.addEventListener("click", clearCart);
  }
});
