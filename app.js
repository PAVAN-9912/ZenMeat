// =====================================================
// ZENMEAT FINAL APP.JS
// Customer + Vendor + Orders + Payment + Realtime Flow
// =====================================================


// ---------------------
// BASIC HELPERS
// ---------------------

const $ = id => document.getElementById(id);

const show = el => {
  if (el) el.classList.remove("hidden");
};

const hide = el => {
  if (el) el.classList.add("hidden");
};

const escapeHtml = value => {
  if (value == null) return "";

  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
};

const money = value => Number(value || 0).toFixed(2);


// ---------------------
// FIREBASE
// ---------------------

if (!window.firebase) {
  alert("Firebase is not loaded.");
  throw new Error("Firebase not loaded");
}

const auth = firebase.auth();
const db = firebase.firestore();


// ---------------------
// UI REFERENCES
// ---------------------

const authCard = $("authCard");

const browsePanel = $("browsePanel");
const ordersPanel = $("ordersPanel");
const mapPanel = $("mapPanel");
const vendorPanel = $("vendorPanel");

const itemGrid = $("itemGrid");
const myOrders = $("myOrders");
const vendorOrders = $("vendorOrders");

const customerNav = $("customerNav");

const menuBtn = $("menuBtn");
const menuSheet = $("menuSheet");
const menuOverlay = $("menuOverlay");
const menuClose = $("menuClose");

const customerMenuOptions = $("customerMenuOptions");
const vendorMenuOptions = $("vendorMenuOptions");

const navBrowse = $("navBrowse");
const navOrders = $("navOrders");
const navMap = $("navMap");

let currentRole = null;
let currentProfile = null;

let pendingProfileSetup = false;
let pendingProfileUid = null;

let unsubscribeItems = null;
let unsubscribeMyOrders = null;
let unsubscribeVendorOrders = null;


// ---------------------
// PAGE NAVIGATION
// ---------------------

function hideAllPages() {
  hide(browsePanel);
  hide(ordersPanel);
  hide(mapPanel);
  hide(vendorPanel);
}

function setActiveNav(page) {
  [navBrowse, navOrders, navMap].forEach(btn => {
    if (btn) btn.classList.remove("active");
  });

  if (page === "browse") navBrowse?.classList.add("active");
  if (page === "orders") navOrders?.classList.add("active");
  if (page === "map") navMap?.classList.add("active");
}

function openPage(page) {

  hideAllPages();

  if (currentRole === "vendor") {
    show(vendorPanel);
    closeMenu();
    return;
  }

  if (page === "browse") {
    show(browsePanel);
  }

  if (page === "orders") {
    show(ordersPanel);
  }

  if (page === "map") {
    show(mapPanel);
  }

  setActiveNav(page);
  closeMenu();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


// ---------------------
// MENU
// ---------------------

function openMenu() {
  show(menuSheet);
  show(menuOverlay);
}

function closeMenu() {
  hide(menuSheet);
  hide(menuOverlay);
}

menuBtn.addEventListener("click", openMenu);
menuClose.addEventListener("click", closeMenu);
menuOverlay.addEventListener("click", closeMenu);

document.querySelectorAll(".menu-item").forEach(button => {
  button.addEventListener("click", () => {
    openPage(button.dataset.page);
  });
});

document.querySelectorAll(".backBtn").forEach(button => {
  button.addEventListener("click", () => {
    openPage("browse");
  });
});

navBrowse.addEventListener("click", () => openPage("browse"));
navOrders.addEventListener("click", () => openPage("orders"));
navMap.addEventListener("click", () => openPage("map"));


// ---------------------
// SIGNUP
// ---------------------

$("signupBtn").addEventListener("click", async () => {

  const name = $("name").value.trim();
  const email = $("email").value.trim();
  const phone = $("phone").value.trim();
  const password = $("password").value;
  const role = $("role").value;

  if (!name || !email || !password) {
    alert("Please enter your name, email and password.");
    return;
  }

  if (password.length < 6) {
    alert("Password must contain at least 6 characters.");
    return;
  }

  try {

    pendingProfileSetup = true;

    const credential =
      await auth.createUserWithEmailAndPassword(email, password);

    pendingProfileUid = credential.user.uid;

    const profileData = {
      name,
      email,
      phone,
      role,
      createdAt: new Date().toISOString()
    };

    try {
      await db.collection("profiles")
        .doc(credential.user.uid)
        .set(profileData);
    } catch (firestoreError) {
      if (firestoreError?.code === "permission-denied") {
        console.warn("Firestore profile save failed, using localStorage");
      } else {
        throw firestoreError;
      }
    }

    localStorage.setItem(
      `zenmeat_profile_${credential.user.uid}`,
      JSON.stringify(profileData)
    );

    pendingProfileSetup = false;
    pendingProfileUid = null;

    alert("Account created successfully!");

  } catch (error) {
    console.error(error);
    pendingProfileSetup = false;
    pendingProfileUid = null;

    if (error?.code === "auth/email-already-in-use") {
      alert(
        "This email is already registered. Please login or use another email."
      );
      return;
    }

    if (error?.code === "auth/invalid-email") {
      alert("The email address is invalid. Please check it and try again.");
      return;
    }

    if (error?.code === "auth/weak-password") {
      alert("Password must be at least 6 characters long.");
      return;
    }

    alert("Signup error: " + error.message);
  }
});


// ---------------------
// LOGIN
// ---------------------

$("loginBtn").addEventListener("click", async () => {

  const email = $("email").value.trim();
  const password = $("password").value;

  if (!email || !password) {
    alert("Enter email and password.");
    return;
  }

  try {

    await auth.signInWithEmailAndPassword(
      email,
      password
    );

  } catch (error) {
    console.error(error);
    alert("Login error: " + error.message);
  }
});


// ---------------------
// LOGOUT
// ---------------------

$("logoutBtn").addEventListener("click", async () => {

  closeMenu();

  try {
    await auth.signOut();
  } catch (error) {
    alert("Logout error: " + error.message);
  }
});


// ---------------------
// VENDOR ADD PRODUCT
// ---------------------

$("addItemBtn").addEventListener("click", async () => {

  const user = auth.currentUser;

  if (!user || currentRole !== "vendor") {
    alert("Only vendors can add products.");
    return;
  }

  const name = $("itemName").value.trim();
  const price = Number($("price").value);
  const stock = Number($("stock").value);

  if (!name) {
    alert("Enter the item name.");
    return;
  }

  if (!price || price <= 0) {
    alert("Enter a valid price.");
    return;
  }

  if (!stock || stock <= 0) {
    alert("Enter valid stock.");
    return;
  }

  try {

    await db.collection("items").add({
      name,
      price,
      stock,
      vendorId: user.uid,
      vendorName: currentProfile?.name || "Local Vendor",
      createdAt:
        firebase.firestore.FieldValue.serverTimestamp()
    });

    $("itemName").value = "";
    $("price").value = "";
    $("stock").value = "";

    alert("Product added successfully!");

  } catch (error) {
    console.error(error);
    alert("Could not add product: " + error.message);
  }
});


// ---------------------
// LOAD PRODUCTS
// ---------------------

function loadItems() {

  if (unsubscribeItems) unsubscribeItems();

  itemGrid.innerHTML =
    `<div class="empty-state">Loading fresh products...</div>`;

  unsubscribeItems = db.collection("items")
    .orderBy("createdAt", "desc")
    .onSnapshot(snapshot => {

      itemGrid.innerHTML = "";

      if (snapshot.empty) {
        itemGrid.innerHTML =
          `<div class="empty-state">
            No products available right now.
          </div>`;
        return;
      }

      snapshot.forEach(documentSnapshot => {

        const item = documentSnapshot.data();

        const card = document.createElement("article");
        card.className = "product-card";

        card.dataset.search =
          `${item.name || ""} ${item.vendorName || ""}`.toLowerCase();

        card.innerHTML = `
          <div class="product-icon">🥩</div>

          <h3>${escapeHtml(item.name)}</h3>

          <div class="product-meta">
            🏪 ${escapeHtml(item.vendorName || "Local Vendor")}<br>
            📦 ${Number(item.stock || 0)} kg available
          </div>

          <div class="product-price">
            ₹${money(item.price)}
            <span class="muted">/ kg</span>
          </div>

          <button class="btn primary buy-btn">
            Buy Now
          </button>
        `;

        card.querySelector(".buy-btn")
          .addEventListener("click", () => {
            openPaymentModal(
              documentSnapshot.id,
              item
            );
          });

        itemGrid.appendChild(card);
      });

    }, error => {

      if (error?.code !== "permission-denied") {
        console.error("Product loading error:", error);
      }

      itemGrid.innerHTML =
        `<div class="empty-state">
          Could not load products.
        </div>`;
    });
}


// ---------------------
// SEARCH PRODUCTS / SHOPS
// ---------------------

$("searchInput").addEventListener("input", event => {

  const query = event.target.value
    .trim()
    .toLowerCase();

  document.querySelectorAll(".product-card")
    .forEach(card => {

      const matches =
        card.dataset.search.includes(query);

      card.style.display =
        matches ? "" : "none";
    });
});


// ---------------------
// PAYMENT MODAL
// ---------------------

function openPaymentModal(itemId, item) {

  const oldModal = $("paymentModal");

  if (oldModal) oldModal.remove();

  const price = Number(item.price);

  const backdrop = document.createElement("div");

  backdrop.id = "paymentModal";
  backdrop.className = "modal-backdrop";

  backdrop.innerHTML = `
    <div class="payment-modal">

      <h2>Confirm Your Order</h2>
      <p class="muted">
        Review your order and select payment method.
      </p>

      <div class="payment-item">
        <strong>${escapeHtml(item.name)}</strong>
        <div class="muted">
          ₹${money(price)} per kg
        </div>
      </div>

      <div class="input-group">
        <label>Quantity (kg)</label>
        <input
          id="paymentQty"
          type="number"
          min="0.1"
          max="${Number(item.stock || 0)}"
          step="0.1"
          value="1"
        >
      </div>

      <h4>Payment Method</h4>

      <label class="payment-option">
        <input
          type="radio"
          name="paymentMethod"
          value="cod"
          checked
        >
        <span>
          <strong>💵 Cash on Delivery</strong><br>
          <small class="muted">
            Pay when your order arrives
          </small>
        </span>
      </label>

      <label class="payment-option">
        <input
          type="radio"
          name="paymentMethod"
          value="upi"
        >
        <span>
          <strong>📱 UPI Payment</strong><br>
          <small class="muted">
            Simulated payment for project demonstration
          </small>
        </span>
      </label>

      <div class="payment-total">
        <span>Total Amount</span>
        <span id="paymentTotal">
          ₹${money(price)}
        </span>
      </div>

      <div class="modal-actions">
        <button
          id="cancelPayment"
          class="btn secondary">
          Cancel
        </button>

        <button
          id="confirmPayment"
          class="btn primary">
          Confirm Order
        </button>
      </div>

    </div>
  `;

  document.body.appendChild(backdrop);

  const quantityInput = $("paymentQty");
  const totalElement = $("paymentTotal");

  function updateTotal() {

    const quantity = Number(quantityInput.value) || 0;

    totalElement.textContent =
      `₹${money(quantity * price)}`;
  }

  quantityInput.addEventListener(
    "input",
    updateTotal
  );

  $("cancelPayment")
    .addEventListener("click", () => {
      backdrop.remove();
    });

  $("confirmPayment")
    .addEventListener("click", async () => {

      const user = auth.currentUser;

      if (!user) {
        alert("Please login first.");
        return;
      }

      const quantity =
        Number(quantityInput.value);

      if (!quantity || quantity <= 0) {
        alert("Enter a valid quantity.");
        return;
      }

      if (quantity > Number(item.stock || 0)) {
        alert("Requested quantity is greater than available stock.");
        return;
      }

      const selectedPayment =
        backdrop.querySelector(
          'input[name="paymentMethod"]:checked'
        ).value;

      const total =
        Number((quantity * price).toFixed(2));

      try {

        const orderReference =
          await db.collection("orders").add({

            itemId,
            itemName: item.name,

            qty: quantity,
            amount: price,
            total,

            buyerId: user.uid,
            buyerName:
              currentProfile?.name || "Customer",

            vendorId: item.vendorId,
            vendorName:
              item.vendorName || "Vendor",

            paymentMethod: selectedPayment,

            paymentStatus:
              selectedPayment === "cod"
                ? "pending"
                : "paid",

            status: "confirmed",

            createdAt:
              firebase.firestore.FieldValue.serverTimestamp()
          });

        backdrop.remove();

        if (selectedPayment === "upi") {
          showUpiSuccess(orderReference.id, total);
        } else {
          alert("Order confirmed! Pay by cash on delivery.");
          openPage("orders");
        }

      } catch (error) {

        console.error(error);

        alert(
          "Could not place order: " +
          error.message
        );
      }
    });
}


// ---------------------
// UPI DEMO SUCCESS
// ---------------------

function showUpiSuccess(orderId, total) {

  const backdrop = document.createElement("div");

  backdrop.className = "modal-backdrop";

  backdrop.innerHTML = `
    <div class="payment-modal">

      <div style="text-align:center">

        <div style="font-size:55px">✅</div>

        <h2>Payment Successful</h2>

        <p class="muted">
          UPI payment simulation completed successfully.
        </p>

        <div class="payment-item">
          <strong>Amount Paid</strong>
          <div class="product-price">
            ₹${money(total)}
          </div>
        </div>

        <p class="muted">
          Order ID: ${escapeHtml(orderId)}
        </p>

        <button
          id="viewOrderBtn"
          class="btn primary full-btn">
          View My Order
        </button>

      </div>

    </div>
  `;

  document.body.appendChild(backdrop);

  backdrop.querySelector("#viewOrderBtn")
    .addEventListener("click", () => {

      backdrop.remove();
      openPage("orders");
    });
}


// ---------------------
// CUSTOMER ORDERS
// ---------------------

function loadMyOrders(userId) {

  if (unsubscribeMyOrders) {
    unsubscribeMyOrders();
  }

  myOrders.innerHTML =
    `<div class="empty-state">Loading orders...</div>`;

  unsubscribeMyOrders = db.collection("orders")
    .where("buyerId", "==", userId)
    .onSnapshot(snapshot => {

      myOrders.innerHTML = "";

      if (snapshot.empty) {
        myOrders.innerHTML =
          `<div class="empty-state">
            You have not placed any orders yet.
          </div>`;
        return;
      }

      const documents = snapshot.docs.sort(
        (a, b) => {

          const first =
            a.data().createdAt?.seconds || 0;

          const second =
            b.data().createdAt?.seconds || 0;

          return second - first;
        }
      );

      documents.forEach(documentSnapshot => {

        const order = documentSnapshot.data();

        const card = document.createElement("article");
        card.className = "order-card";

        card.innerHTML = `
          <div class="order-top">

            <div>
              <h3>${escapeHtml(order.itemName)}</h3>
              <div class="muted">
                ${escapeHtml(order.vendorName || "Local Vendor")}
              </div>
            </div>

            <span class="status-badge status-${escapeHtml(order.status)}">
              ${formatStatus(order.status)}
            </span>

          </div>

          <div class="order-info">
            Quantity: ${Number(order.qty || 0)} kg<br>
            Total: ₹${money(order.total)}<br>
            Payment:
            ${escapeHtml(
              String(order.paymentMethod || "")
                .toUpperCase()
            )}
            (${escapeHtml(order.paymentStatus || "")})
          </div>
        `;

        myOrders.appendChild(card);
      });

    }, error => {

      if (error?.code !== "permission-denied") {
        console.error(error);
      }

      myOrders.innerHTML =
        `<div class="empty-state">
          Could not load orders.
        </div>`;
    });
}


// ---------------------
// VENDOR ORDERS
// ---------------------

function loadVendorOrders(vendorId) {

  if (unsubscribeVendorOrders) {
    unsubscribeVendorOrders();
  }

  vendorOrders.innerHTML =
    `<div class="empty-state">Loading incoming orders...</div>`;

  unsubscribeVendorOrders =
    db.collection("orders")
      .where("vendorId", "==", vendorId)
      .onSnapshot(snapshot => {

        vendorOrders.innerHTML = "";

        if (snapshot.empty) {

          vendorOrders.innerHTML =
            `<div class="empty-state">
              No incoming orders yet.
            </div>`;

          return;
        }

        const documents = snapshot.docs.sort(
          (a, b) => {

            const first =
              a.data().createdAt?.seconds || 0;

            const second =
              b.data().createdAt?.seconds || 0;

            return second - first;
          }
        );

        documents.forEach(documentSnapshot => {

          const order = documentSnapshot.data();

          const card = document.createElement("article");
          card.className = "order-card";

          card.innerHTML = `
            <div class="order-top">

              <div>
                <h3>${escapeHtml(order.itemName)}</h3>
                <div class="muted">
                  Customer:
                  ${escapeHtml(
                    order.buyerName || "Customer"
                  )}
                </div>
              </div>

              <span class="status-badge status-${escapeHtml(order.status)}">
                ${formatStatus(order.status)}
              </span>

            </div>

            <div class="order-info">
              Quantity: ${Number(order.qty || 0)} kg<br>
              Total: ₹${money(order.total)}<br>
              Payment:
              ${escapeHtml(
                String(order.paymentMethod || "")
                  .toUpperCase()
              )}
              (${escapeHtml(order.paymentStatus || "")})
            </div>

            <div class="order-actions"></div>
          `;

          const actionContainer =
            card.querySelector(".order-actions");


          // CONFIRMED -> ACCEPT ORDER

          if (order.status === "confirmed") {

            const button =
              createOrderButton(
                "✓ Accept Order",
                "accept-btn",
                () => updateOrderStatus(
                  documentSnapshot.id,
                  "accepted"
                )
              );

            actionContainer.appendChild(button);
          }


          // ACCEPTED -> OUT FOR DELIVERY

          if (order.status === "accepted") {

            const button =
              createOrderButton(
                "🛵 Out for Delivery",
                "delivery-btn",
                () => updateOrderStatus(
                  documentSnapshot.id,
                  "out_for_delivery"
                )
              );

            actionContainer.appendChild(button);
          }


          // OUT FOR DELIVERY -> DELIVERED

          if (order.status === "out_for_delivery") {

            const button =
              createOrderButton(
                "✓ Mark Delivered",
                "delivered-btn",
                () => updateOrderStatus(
                  documentSnapshot.id,
                  "delivered"
                )
              );

            actionContainer.appendChild(button);
          }


          // DELIVERED

          if (order.status === "delivered") {

            actionContainer.innerHTML =
              `<div class="muted">
                ✓ Order successfully completed
              </div>`;
          }

          vendorOrders.appendChild(card);
        });

      }, error => {

        if (error?.code !== "permission-denied") {
          console.error(error);
        }

        vendorOrders.innerHTML =
          `<div class="empty-state">
            Could not load incoming orders.
          </div>`;
      });
}


// ---------------------
// ORDER BUTTON HELPER
// ---------------------

function createOrderButton(
  text,
  className,
  clickHandler
) {

  const button =
    document.createElement("button");

  button.className =
    `action-btn ${className}`;

  button.textContent = text;

  button.addEventListener(
    "click",
    clickHandler
  );

  return button;
}


// ---------------------
// UPDATE ORDER STATUS
// ---------------------

async function updateOrderStatus(
  orderId,
  newStatus
) {

  try {

    await db.collection("orders")
      .doc(orderId)
      .update({

        status: newStatus,

        updatedAt:
          firebase.firestore.FieldValue.serverTimestamp()
      });

  } catch (error) {

    console.error(error);

    alert(
      "Could not update order: " +
      error.message
    );
  }
}


// ---------------------
// FORMAT STATUS
// ---------------------

function formatStatus(status) {

  const labels = {
    confirmed: "Confirmed",
    accepted: "Accepted",
    out_for_delivery: "Out for Delivery",
    delivered: "Delivered",
    pending_payment: "Pending Payment"
  };

  return labels[status] || status || "Confirmed";
}


// ---------------------
// CLEAN REALTIME LISTENERS
// ---------------------

function stopListeners() {

  if (unsubscribeItems) {
    unsubscribeItems();
    unsubscribeItems = null;
  }

  if (unsubscribeMyOrders) {
    unsubscribeMyOrders();
    unsubscribeMyOrders = null;
  }

  if (unsubscribeVendorOrders) {
    unsubscribeVendorOrders();
    unsubscribeVendorOrders = null;
  }
}


// ---------------------
// AUTH STATE
// ---------------------

auth.onAuthStateChanged(async user => {

  if (user && pendingProfileSetup && user.uid === pendingProfileUid) {
    return;
  }

  stopListeners();
  closeMenu();

  if (!user) {

    currentRole = null;
    currentProfile = null;

    show(authCard);

    hideAllPages();

    hide(customerNav);
    hide(menuBtn);

    return;
  }

  try {

    const profileDocument =
      await db.collection("profiles")
        .doc(user.uid)
        .get();

    if (profileDocument.exists) {
      currentProfile = profileDocument.data();
    } else {
      const localProfile = localStorage.getItem(`zenmeat_profile_${user.uid}`);
      if (localProfile) {
        currentProfile = JSON.parse(localProfile);
      } else {
        alert(
          "User profile was not found. Please create an account again."
        );
        await auth.signOut();
        return;
      }
    }

    currentRole =
      currentProfile.role || "customer";

    hide(authCard);
    show(menuBtn);

    $("menuUserName").textContent =
      currentProfile.name || "Welcome";

    $("menuUserRole").textContent =
      currentRole === "vendor"
        ? "Vendor Account"
        : "Customer Account";


    // VENDOR LOGIN

    if (currentRole === "vendor") {

      hide(customerNav);

      hide(customerMenuOptions);
      show(vendorMenuOptions);

      hideAllPages();
      show(vendorPanel);

      loadVendorOrders(user.uid);
    }


    // CUSTOMER LOGIN

    else {

      show(customerNav);

      show(customerMenuOptions);
      hide(vendorMenuOptions);

      hideAllPages();
      show(browsePanel);

      setActiveNav("browse");

      loadItems();
      loadMyOrders(user.uid);
    }

  } catch (error) {

    if (error?.code === "permission-denied") {
      const localProfile = localStorage.getItem(`zenmeat_profile_${user.uid}`);
      if (localProfile) {
        currentProfile = JSON.parse(localProfile);
        currentRole = currentProfile.role || "customer";

        hide(authCard);
        show(menuBtn);

        $("menuUserName").textContent =
          currentProfile.name || "Welcome";

        $("menuUserRole").textContent =
          currentRole === "vendor"
            ? "Vendor Account"
            : "Customer Account";

        if (currentRole === "vendor") {
          hide(customerNav);
          hide(customerMenuOptions);
          show(vendorMenuOptions);
          hideAllPages();
          show(vendorPanel);
          loadVendorOrders(user.uid);
        } else {
          show(customerNav);
          show(customerMenuOptions);
          hide(vendorMenuOptions);
          hideAllPages();
          show(browsePanel);
          setActiveNav("browse");
          loadItems();
          loadMyOrders(user.uid);
        }

        console.warn("Using local profile (Firestore unavailable)");
        return;
      }

      await auth.signOut();
      show(authCard);
      hideAllPages();
      hide(customerNav);
      hide(menuBtn);
      alert(
        "Unable to access Firestore. Please check your Firebase permissions and try again."
      );
      return;
    }

    console.error(
      "Profile loading error:",
      error
    );

    alert(
      "Could not load your account: " +
      error.message
    );
  }
});