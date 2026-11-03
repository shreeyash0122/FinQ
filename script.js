/* =========================================================
   FinQ — Personal Finance Dashboard
   Application logic
   ========================================================= */
(function () {
  "use strict";
  /* ---------------------------------------------------------
     CONFIG
     --------------------------------------------------------- */
  const STORAGE_KEY = "finq_transactions_v1";
  const THEME_KEY = "finq_theme";
  const SIDEBAR_KEY = "finq_sidebar_collapsed";
  const ACCOUNTS_KEY = "finq_accounts_v1";
  const ACTIVE_ACCOUNT_KEY = "finq_active_account_v1";
  const AVATAR_COLORS = ["#8FB5A8","#C9B38A","#B7A3AE","#9FB0C4","#A9B89A","#C4A398"];
  const CATEGORIES = {
    Food:          { color: "#C9A66B", icon: "🍔" },
    Shopping:      { color: "#B98A9B", icon: "🛍️" },
    Salary:        { color: "#7BA89B", icon: "💼" },
    Entertainment: { color: "#8E8FB8", icon: "🎬" },
    Travel:        { color: "#7FA3B5", icon: "✈️" },
    Health:        { color: "#C47A6E", icon: "🩺" },
    Education:     { color: "#7E93B8", icon: "🎓" },
    Investment:    { color: "#5F8F82", icon: "📈" },
    Others:        { color: "#9A9EA5", icon: "📦" }
  };
  const currencyFormatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  });
  const dateFormatter = new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
  /* ---------------------------------------------------------
     STATE
     --------------------------------------------------------- */
  let accounts = loadAccounts();
  let activeAccountId = localStorage.getItem(ACTIVE_ACCOUNT_KEY) || null;
  if (activeAccountId && !accounts.some((a) => a.id === activeAccountId)) {
    activeAccountId = null; // stale reference (e.g. account was removed elsewhere)
  }
  let transactions = loadTransactions();
  let goals = loadGoals();
  let fundingGoalId = null;
  let charts = { bar: null, pie: null, analyticsBar: null, analyticsPie: null };
  let currentModalType = "expense";
  let currentView = "dashboard";
  /* ---------------------------------------------------------
     DOM REFERENCES
     --------------------------------------------------------- */
  const $ = (sel) => document.querySelector(sel);
  const $all = (sel) => Array.from(document.querySelectorAll(sel));
  const el = {
    loader: $("#loader"),
    app: $("#app"),
    sidebar: $("#sidebar"),
    sidebarCollapseBtn: $("#sidebarCollapseBtn"),
    sidebarScrim: $("#sidebarScrim"),
    menuBtn: $("#menuBtn"),
    navItems: $all(".nav-item[data-view]"),
    pageTitle: $("#pageTitle"),
    pageSubtitle: $("#pageSubtitle"),
    exportBtn: $("#exportBtn"),
    importBtn: $("#importBtn"),
    importInput: $("#importInput"),
    addTransactionBtn: $("#addTransactionBtn"),
    emptyStateBtn: $("#emptyStateBtn"),
    openModalNavItem: $('.nav-item[data-action="open-modal"]'),
    modalOverlay: $("#modalOverlay"),
    modalCloseBtn: $("#modalCloseBtn"),
    modalCancelBtn: $("#modalCancelBtn"),
    saveTransactionBtn: $("#saveTransactionBtn"),
    txForm: $("#txForm"),
    typeExpenseBtn: $("#typeExpenseBtn"),
    typeIncomeBtn: $("#typeIncomeBtn"),
    amountInput: $("#amountInput"),
    categoryInput: $("#categoryInput"),
    dateInput: $("#dateInput"),
    notesInput: $("#notesInput"),
    amountError: $("#amountError"),
    categoryError: $("#categoryError"),
    dateError: $("#dateError"),
    statIncome: $("#statIncome"),
    statExpense: $("#statExpense"),
    statBalance: $("#statBalance"),
    statSavings: $("#statSavings"),
    incomeTrend: $("#incomeTrend"),
    expenseTrend: $("#expenseTrend"),
    balanceTrend: $("#balanceTrend"),
    savingsTag: $("#savingsTag"),
    savingsBar: $("#savingsBar"),
    donutTotal: $("#donutTotal"),
    donutLegend: $("#donutLegend"),
    recentActivity: $("#recentActivity"),
    monthlySummary: $("#monthlySummary"),
    analyticsSummary: $("#analyticsSummary"),
    txCount: $("#txCount"),
    txTableBody: $("#txTableBody"),
    emptyState: $("#emptyState"),
    topSearch: $("#topSearch"),
    tableSearch: $("#tableSearch"),
    filterType: $("#filterType"),
    filterCategory: $("#filterCategory"),
    sortField: $("#sortField"),
    toastStack: $("#toastStack"),
    userChip: $("#userChip"),
    userAvatarEl: $("#sidebarUserAvatar"),
    userNameEl: $("#sidebarUserName"),
    userEmailEl: $("#sidebarUserEmail"),
    accountPopover: $("#accountPopover"),
    accountPopoverAvatar: $("#accountPopoverAvatar"),
    accountPopoverName: $("#accountPopoverName"),
    accountPopoverEmail: $("#accountPopoverEmail"),
    accountSwitchList: $("#accountSwitchList"),
    addAccountBtn: $("#addAccountBtn"),
    logoutBtn: $("#logoutBtn"),
    accountModalOverlay: $("#accountModalOverlay"),
    accountModalCloseBtn: $("#accountModalCloseBtn"),
    accountModalCancelBtn: $("#accountModalCancelBtn"),
    saveAccountBtn: $("#saveAccountBtn"),
    accountNameInput: $("#accountNameInput"),
    accountEmailInput: $("#accountEmailInput"),
    accountNameError: $("#accountNameError"),
    authGate: $("#authGate"),
    authAccountList: $("#authAccountList"),
    authAddAccountBtn: $("#authAddAccountBtn"),
    goalsPreview: $("#goalsPreview"), goalsFull: $("#goalsFull"), bnAddBtn: $("#bnAddBtn"),
    goalModalOverlay: $("#goalModalOverlay"), goalModalCloseBtn: $("#goalModalCloseBtn"), goalModalCancelBtn: $("#goalModalCancelBtn"),
    saveGoalBtn: $("#saveGoalBtn"), goalNameInput: $("#goalNameInput"), goalTargetInput: $("#goalTargetInput"),
    goalSavedInput: $("#goalSavedInput"), goalIconInput: $("#goalIconInput"), goalError: $("#goalError"),
    fundModalOverlay: $("#fundModalOverlay"), fundModalCloseBtn: $("#fundModalCloseBtn"), fundModalCancelBtn: $("#fundModalCancelBtn"),
    saveFundBtn: $("#saveFundBtn"), fundAmountInput: $("#fundAmountInput"), fundTitle: $("#fundTitle"), fundError: $("#fundError")
  };
  /* ---------------------------------------------------------
     STORAGE HELPERS
     --------------------------------------------------------- */
  function txStorageKey(accountId) {
    return `${STORAGE_KEY}::${accountId}`;
  }
  function loadTransactions() {
    if (!activeAccountId) return [];
    try {
      const raw = localStorage.getItem(txStorageKey(activeAccountId));
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.error("Could not read saved transactions:", err);
      return [];
    }
  }
  function saveTransactions() {
    if (!activeAccountId) return;
    try {
      localStorage.setItem(txStorageKey(activeAccountId), JSON.stringify(transactions));
    } catch (err) {
      console.error("Could not save transactions:", err);
      showToast("error", "Storage is full — could not save transaction.");
    }
  }
  /* ---------------------------------------------------------
     ACCOUNTS
     Every account has its own isolated set of transactions.
     If this is the very first account ever created and there's
     data sitting under the old pre-multi-account storage key,
     it's carried over automatically so nothing gets lost.
     --------------------------------------------------------- */
  /* ---------------------------------------------------------
     GOALS (per account)
     --------------------------------------------------------- */
  function loadGoals() {
    if (!activeAccountId) return [];
    try {
      const p = JSON.parse(localStorage.getItem(`finq_goals_v1::${activeAccountId}`) || "[]");
      return Array.isArray(p) ? p : [];
    } catch (err) { return []; }
  }
  function saveGoals() {
    if (!activeAccountId) return;
    try { localStorage.setItem(`finq_goals_v1::${activeAccountId}`, JSON.stringify(goals)); }
    catch (err) { showToast("error", "Storage is full — could not save goal."); }
  }
  function goalCardHtml(g, full) {
    const pct = g.target > 0 ? Math.min(100, Math.round((g.saved / g.target) * 100)) : 0;
    return `<div class="goal-card">
      <div class="goal-top"><div class="goal-icon">${escapeHtml(g.icon || "🎯")}</div>
        <div class="goal-meta"><div class="goal-name">${escapeHtml(g.name)}</div><div class="goal-sub">${pct >= 100 ? "Goal reached 🎉" : `Target ${pct}% achieved`}</div></div>
        <div class="goal-amt">${currencyFormatter.format(g.saved)}</div></div>
      <div class="goal-bar"><i style="width:${pct}%"></i></div>
      ${full ? `<div class="goal-sub">of ${currencyFormatter.format(g.target)}</div>
        <div class="goal-actions"><button class="btn btn-ghost" type="button" data-fund-goal="${g.id}">+ Add funds</button>
        <button class="icon-btn" type="button" data-delete-goal="${g.id}" aria-label="Delete goal">✕</button></div>` : ""}
    </div>`;
  }
  function renderGoals() {
    if (el.goalsPreview) el.goalsPreview.innerHTML = goals.length ? goals.slice(0, 3).map((g) => goalCardHtml(g, false)).join("") : emptyBlock("No goals yet", "Add one to start saving for it.");
    if (el.goalsFull) el.goalsFull.innerHTML = goals.length ? goals.map((g) => goalCardHtml(g, true)).join("") : emptyBlock("No goals yet", "Tap “New goal” to start.");
    $all("[data-fund-goal]").forEach((b) => safeBind(b, "click", () => openFundModal(b.dataset.fundGoal)));
    $all("[data-delete-goal]").forEach((b) => safeBind(b, "click", () => {
      goals = goals.filter((g) => g.id !== b.dataset.deleteGoal);
      saveGoals(); renderGoals(); showToast("info", "Goal deleted.");
    }));
  }
  function openGoalModal() {
    el.goalNameInput.value = ""; el.goalTargetInput.value = ""; el.goalSavedInput.value = ""; el.goalError.textContent = "";
    el.goalModalOverlay.classList.add("is-open");
    setTimeout(() => el.goalNameInput.focus(), 150);
  }
  function closeGoalModal() { el.goalModalOverlay.classList.remove("is-open"); }
  function saveGoalFromForm() {
    const name = el.goalNameInput.value.trim();
    const target = parseFloat(el.goalTargetInput.value);
    const saved = Math.max(0, parseFloat(el.goalSavedInput.value) || 0);
    if (!name || isNaN(target) || target <= 0) { el.goalError.textContent = "Enter a name and a target above 0."; return; }
    goals.push({ id: `goal_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, name, target, saved, icon: el.goalIconInput.value, createdAt: Date.now() });
    saveGoals(); renderGoals(); closeGoalModal();
    showToast("success", `Goal "${name}" created.`);
  }
  function openFundModal(id) {
    const g = goals.find((x) => x.id === id);
    if (!g) return;
    fundingGoalId = id;
    el.fundTitle.textContent = `Add funds · ${g.name}`;
    el.fundAmountInput.value = ""; el.fundError.textContent = "";
    el.fundModalOverlay.classList.add("is-open");
    setTimeout(() => el.fundAmountInput.focus(), 150);
  }
  function closeFundModal() { el.fundModalOverlay.classList.remove("is-open"); }
  function saveFundFromForm() {
    const amt = parseFloat(el.fundAmountInput.value);
    const g = goals.find((x) => x.id === fundingGoalId);
    if (!g || isNaN(amt) || amt <= 0) { el.fundError.textContent = "Enter an amount above 0."; return; }
    g.saved += amt;
    saveGoals(); renderGoals(); closeFundModal();
    showToast("success", `Added ${currencyFormatter.format(amt)} to ${g.name}.`);
  }
  function loadAccounts() {
    try {
      const raw = localStorage.getItem(ACCOUNTS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.map((a, i) => ({ ...a, color: AVATAR_COLORS[i % AVATAR_COLORS.length] })) : [];
    } catch (err) {
      console.error("Could not read accounts:", err);
      return [];
    }
  }
  function saveAccounts() {
    try {
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
    } catch (err) {
      console.error("Could not save accounts:", err);
      showToast("error", "Storage is full — could not save account.");
    }
  }
  function getActiveAccount() {
    return accounts.find((a) => a.id === activeAccountId) || null;
  }
  function computeInitials(name) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  function createAccount(name, email) {
    const isFirstEver = accounts.length === 0;
    const account = {
      id: `acc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim() || "New user",
      email: (email || "").trim(),
      initials: computeInitials(name),
      color: AVATAR_COLORS[accounts.length % AVATAR_COLORS.length]
    };
    accounts.push(account);
    saveAccounts();
    if (isFirstEver) {
      // Bring over any transactions saved before multi-account support existed.
      try {
        const legacyRaw = localStorage.getItem(STORAGE_KEY);
        if (legacyRaw) {
          localStorage.setItem(txStorageKey(account.id), legacyRaw);
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch (err) {
        console.error("FinQ: could not migrate previous transactions:", err);
      }
    }
    return account;
  }
  function switchAccount(id) {
    if (!accounts.some((a) => a.id === id)) return;
    activeAccountId = id;
    localStorage.setItem(ACTIVE_ACCOUNT_KEY, id);
    transactions = loadTransactions();
    goals = loadGoals();
    hideAuthGate();
    renderAccountUI();
    renderAll();
    switchView("dashboard");
    showToast("info", `Switched to ${getActiveAccount().name}.`);
  }
  function logout() {
    activeAccountId = null;
    localStorage.removeItem(ACTIVE_ACCOUNT_KEY);
    closeAccountPopover();
    showAuthGate();
  }
  /* ---------------------------------------------------------
     ACCOUNT UI — sidebar chip, popover, switcher
     --------------------------------------------------------- */
  function renderAccountUI() {
    const acc = getActiveAccount();
    if (!acc) return; // the auth gate covers the screen in this case
    if (el.userAvatarEl) { el.userAvatarEl.textContent = acc.initials; el.userAvatarEl.style.background = acc.color; }
    if (el.userNameEl) el.userNameEl.textContent = acc.name;
    if (el.userEmailEl) el.userEmailEl.textContent = acc.email || "No email set";
    if (el.accountPopoverAvatar) { el.accountPopoverAvatar.textContent = acc.initials; el.accountPopoverAvatar.style.background = acc.color; }
    if (el.accountPopoverName) el.accountPopoverName.textContent = acc.name;
    if (el.accountPopoverEmail) el.accountPopoverEmail.textContent = acc.email || "No email set";
    renderAccountSwitchList();
    updateGreeting();
  }
  function renderAccountSwitchList() {
    if (!el.accountSwitchList) return;
    const others = accounts.filter((a) => a.id !== activeAccountId);
    if (others.length === 0) {
      el.accountSwitchList.innerHTML = `<div class="account-popover-empty">No other accounts yet</div>`;
      return;
    }
    el.accountSwitchList.innerHTML = others
      .map(
        (a) => `
        <button class="account-popover-item" data-switch-account="${a.id}">
          <span class="account-popover-avatar" style="background:${a.color}">${escapeHtml(a.initials)}</span>
          <span class="account-popover-meta">
            <span class="account-popover-name">${escapeHtml(a.name)}</span>
            <span class="account-popover-email">${escapeHtml(a.email || "No email set")}</span>
          </span>
        </button>`
      )
      .join("");
    Array.from(el.accountSwitchList.querySelectorAll("[data-switch-account]")).forEach((btn) => {
      safeBind(btn, "click", () => {
        switchAccount(btn.dataset.switchAccount);
        closeAccountPopover();
      });
    });
  }
  function openAccountPopover() {
    if (!el.accountPopover || !el.userChip) return;
    const rect = el.userChip.getBoundingClientRect();
    el.accountPopover.style.left = `${Math.round(rect.left)}px`;
    el.accountPopover.style.bottom = `${Math.round(window.innerHeight - rect.top + 10)}px`;
    el.accountPopover.classList.add("is-open");
    el.userChip.setAttribute("aria-expanded", "true");
    document.addEventListener("click", handleOutsideAccountClick, true);
  }
  function closeAccountPopover() {
    if (!el.accountPopover) return;
    el.accountPopover.classList.remove("is-open");
    if (el.userChip) el.userChip.setAttribute("aria-expanded", "false");
    document.removeEventListener("click", handleOutsideAccountClick, true);
  }
  function toggleAccountPopover(e) {
    e.stopPropagation();
    if (el.accountPopover.classList.contains("is-open")) closeAccountPopover();
    else openAccountPopover();
  }
  function handleOutsideAccountClick(e) {
    if (!el.accountPopover.contains(e.target) && !el.userChip.contains(e.target)) {
      closeAccountPopover();
    }
  }
  function updateGreeting() {
    const acc = getActiveAccount();
    const firstName = acc ? acc.name.trim().split(/\s+/)[0] : "there";
    viewCopy.dashboard.title = `Good to see you, ${firstName}`;
    if (currentView === "dashboard" && el.pageTitle) el.pageTitle.textContent = viewCopy.dashboard.title;
  }
  /* ---------------------------------------------------------
     AUTH GATE — shown when logged out or no account exists yet
     --------------------------------------------------------- */
  function showAuthGate() {
    renderAuthAccountList();
    if (el.authGate) el.authGate.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }
  function hideAuthGate() {
    if (el.authGate) el.authGate.classList.remove("is-open");
    document.body.style.overflow = "";
  }
  function renderAuthAccountList() {
    if (!el.authAccountList) return;
    if (accounts.length === 0) {
      el.authAccountList.innerHTML = `<p class="auth-gate-empty">No accounts yet — add one to get started.</p>`;
      return;
    }
    el.authAccountList.innerHTML = accounts
      .map(
        (a) => `
        <button class="account-popover-item auth-account-item" data-auth-switch="${a.id}">
          <span class="account-popover-avatar" style="background:${a.color}">${escapeHtml(a.initials)}</span>
          <span class="account-popover-meta">
            <span class="account-popover-name">${escapeHtml(a.name)}</span>
            <span class="account-popover-email">${escapeHtml(a.email || "No email set")}</span>
          </span>
        </button>`
      )
      .join("");
    Array.from(el.authAccountList.querySelectorAll("[data-auth-switch]")).forEach((btn) => {
      safeBind(btn, "click", () => switchAccount(btn.dataset.authSwitch));
    });
  }
  /* ---------------------------------------------------------
     ADD-ACCOUNT MODAL
     --------------------------------------------------------- */
  function openAccountModal() {
    clearAccountFormErrors();
    if (el.accountNameInput) el.accountNameInput.value = "";
    if (el.accountEmailInput) el.accountEmailInput.value = "";
    el.accountModalOverlay.classList.add("is-open");
    document.body.style.overflow = "hidden";
    setTimeout(() => el.accountNameInput && el.accountNameInput.focus(), 150);
  }
  function closeAccountModal() {
    el.accountModalOverlay.classList.remove("is-open");
    // Keep the page locked (overflow hidden) if the auth gate is still open behind it.
    document.body.style.overflow = el.authGate && el.authGate.classList.contains("is-open") ? "hidden" : "";
  }
  function clearAccountFormErrors() {
    el.accountNameInput?.closest(".field")?.classList.remove("has-error");
    if (el.accountNameError) el.accountNameError.textContent = "";
  }
  function saveAccountFromForm() {
    clearAccountFormErrors();
    const name = (el.accountNameInput?.value || "").trim();
    if (!name) {
      el.accountNameInput?.closest(".field")?.classList.add("has-error");
      if (el.accountNameError) el.accountNameError.textContent = "Enter a name.";
      return;
    }
    const email = (el.accountEmailInput?.value || "").trim();
    const account = createAccount(name, email);
    switchAccount(account.id);
    closeAccountModal();
    closeAccountPopover();
    showToast("success", `Account "${account.name}" created.`);
  }
  /* ---------------------------------------------------------
     FORM SETUP HELPERS
     (These two were missing entirely in the original file —
     init() called them but they were never defined, which
     threw a ReferenceError and silently broke the whole app:
     no styling classes got applied, categories never
     populated, loader never hid, charts never drew.)
     --------------------------------------------------------- */
  function populateCategorySelects() {
    const categoryNames = Object.keys(CATEGORIES);
    // Modal "Add transaction" category dropdown
    if (el.categoryInput) {
      categoryNames.forEach((name) => {
        const opt = document.createElement("option");
        opt.value = name;
        opt.textContent = `${CATEGORIES[name].icon} ${name}`;
        el.categoryInput.appendChild(opt);
      });
    }
    // Transactions table category filter dropdown
    if (el.filterCategory) {
      categoryNames.forEach((name) => {
        const opt = document.createElement("option");
        opt.value = name;
        opt.textContent = name;
        el.filterCategory.appendChild(opt);
      });
    }
  }
  function localToday() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  function setDefaultDate() {
    if (!el.dateInput) return;
    const today = localToday();
    el.dateInput.value = today;
    el.dateInput.max = today;
  }
  /* ---------------------------------------------------------
   INITIALISATION
--------------------------------------------------------- */
window.addEventListener("load", () => {
    init();
});
function init() {
    try {
        populateCategorySelects();
        restoreTheme();
        restoreSidebarState();
        bindEvents();
        setDefaultDate();
        renderAccountUI();
        renderAll();
        if (!activeAccountId || !getActiveAccount()) {
            showAuthGate();
        }
    } catch (err) {
        // Something failed (e.g. Chart.js not loaded from the CDN yet,
        // or blocked by network/antivirus). Log it so it's visible in
        // DevTools (F12 > Console), but don't let it leave the user
        // stuck behind the loading screen forever.
        console.error("FinQ failed to fully initialise:", err);
    } finally {
        hideLoader();
    }
}
/* ---------------------------------------------------------
   LOADER
--------------------------------------------------------- */
function hideLoader() {
    const loader = document.getElementById("loader");
    const app = document.getElementById("app");
    if (!loader) return;
    // Small delay so the animation is visible
    setTimeout(() => {
        loader.classList.add("is-hidden");
        if (app) {
            app.classList.add("is-ready");
        }
        // Remove loader after fade-out completes
        loader.addEventListener("transitionend", () => {
            loader.remove();
        }, { once: true });
    }, 700);
}
  /* ---------------------------------------------------------
     EVENT BINDING
     --------------------------------------------------------- */
  function safeBind(target, event, handler, options) {
    if (!target) {
      console.error(`FinQ: could not bind "${event}" — a required element was missing from the page.`);
      return;
    }
    try {
      target.addEventListener(event, handler, options);
    } catch (err) {
      console.error(`FinQ: failed to bind "${event}" listener:`, err);
    }
  }
  function bindEvents() {
    // ---- Critical path first: adding & saving a transaction must
    // always work even if something further down fails to bind.
    // The Save button is a plain click handler (not type="submit"),
    // so it never depends on native HTML form submission — which
    // some sandboxed/embedded preview contexts block entirely.
    safeBind(el.saveTransactionBtn, "click", saveTransactionFromForm);
    safeBind(el.txForm, "submit", handleFormSubmit); // Enter-key convenience where native submit is allowed
    [el.addTransactionBtn, el.emptyStateBtn, el.openModalNavItem].forEach((trigger) => {
      safeBind(trigger, "click", () => openModal());
    });
    safeBind(el.modalCloseBtn, "click", closeModal);
    safeBind(el.modalCancelBtn, "click", closeModal);
    safeBind(el.modalOverlay, "click", (e) => {
      if (e.target === el.modalOverlay) closeModal();
    });
    safeBind(el.typeExpenseBtn, "click", () => setModalType("expense"));
    safeBind(el.typeIncomeBtn, "click", () => setModalType("income"));
    safeBind(el.userChip, "click", toggleAccountPopover);
    safeBind(el.addAccountBtn, "click", () => { closeAccountPopover(); openAccountModal(); });
    safeBind(el.logoutBtn, "click", logout);
    safeBind(el.saveAccountBtn, "click", saveAccountFromForm);
    safeBind(el.accountModalCloseBtn, "click", closeAccountModal);
    safeBind(el.accountModalCancelBtn, "click", closeAccountModal);
    safeBind(el.accountModalOverlay, "click", (e) => {
      if (e.target === el.accountModalOverlay) closeAccountModal();
    });
    safeBind(el.authAddAccountBtn, "click", openAccountModal);
    safeBind(el.bnAddBtn, "click", () => openModal());
    safeBind(el.saveGoalBtn, "click", saveGoalFromForm);
    safeBind(el.goalModalCloseBtn, "click", closeGoalModal);
    safeBind(el.goalModalCancelBtn, "click", closeGoalModal);
    safeBind(el.goalModalOverlay, "click", (e) => { if (e.target === el.goalModalOverlay) closeGoalModal(); });
    safeBind(el.saveFundBtn, "click", saveFundFromForm);
    safeBind(el.fundModalCloseBtn, "click", closeFundModal);
    safeBind(el.fundModalCancelBtn, "click", closeFundModal);
    safeBind(el.fundModalOverlay, "click", (e) => { if (e.target === el.fundModalOverlay) closeFundModal(); });
    $all("[data-quick]").forEach((b) => safeBind(b, "click", () => {
      const q = b.dataset.quick;
      if (q === "goal") openGoalModal();
      else if (q === "export") exportData();
      else { openModal(); setModalType(q); }
    }));

    // ---- Everything else ----
    safeBind(el.sidebarCollapseBtn, "click", () => {
      const collapsed = el.app.classList.toggle("is-collapsed");
      localStorage.setItem(SIDEBAR_KEY, collapsed ? "1" : "0");
    });
    safeBind(el.menuBtn, "click", () => {
      el.app.classList.add("is-mobile-open");
      el.sidebarScrim.classList.add("is-visible");
    });
    safeBind(el.sidebarScrim, "click", closeMobileSidebar);
    el.navItems.forEach((item) => {
      safeBind(item, "click", () => switchView(item.dataset.view));
    });
    $all("[data-view-link]").forEach((btn) => {
      safeBind(btn, "click", () => switchView(btn.dataset.viewLink));
    });
    $all("[data-theme-pref]").forEach((b) => safeBind(b, "click", () => setThemePreference(b.dataset.themePref)));
    $all(".btn-ripple").forEach((btn) => safeBind(btn, "click", spawnRipple));
    safeBind(el.tableSearch, "input", renderTable);
    safeBind(el.filterType, "change", renderTable);
    safeBind(el.filterCategory, "change", renderTable);
    safeBind(el.sortField, "change", renderTable);
    safeBind(el.topSearch, "input", () => {
      el.tableSearch.value = el.topSearch.value;
      if (currentView !== "transactions") switchView("transactions");
      renderTable();
    });
    safeBind(el.exportBtn, "click", exportData);
    safeBind(el.importBtn, "click", () => el.importInput.click());
    safeBind(el.importInput, "change", importData);
    safeBind(document, "keydown", handleKeyboardShortcut);
  }
  function closeMobileSidebar() {
    el.app.classList.remove("is-mobile-open");
    el.sidebarScrim.classList.remove("is-visible");
  }
  function handleKeyboardShortcut(e) {
    const tag = document.activeElement.tagName;
    const isTyping = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
    const overlayOpen = $all(".modal-overlay.is-open").length > 0 || (el.authGate && el.authGate.classList.contains("is-open"));
    if (e.key === "/" && !isTyping && !overlayOpen) {
      e.preventDefault();
      if (currentView === "transactions") {
        el.tableSearch.focus();
      } else {
        el.topSearch.focus();
      }
    }
    if (e.key === "Escape" && el.modalOverlay.classList.contains("is-open")) {
      closeModal();
    }
    if (e.key === "Escape" && el.accountModalOverlay && el.accountModalOverlay.classList.contains("is-open")) {
      closeAccountModal();
    }
    if (e.key === "Escape" && el.accountPopover && el.accountPopover.classList.contains("is-open")) {
      closeAccountPopover();
    }
    if (e.key === "Escape") {
      if (el.goalModalOverlay) closeGoalModal();
      if (el.fundModalOverlay) closeFundModal();
    }
    if ((e.key === "n" || e.key === "N") && !isTyping && !overlayOpen && !e.ctrlKey && !e.metaKey && !e.altKey) {
      openModal();
    }
  }
  /* ---------------------------------------------------------
     VIEW SWITCHING
     --------------------------------------------------------- */
  const viewCopy = {
    dashboard: { title: "Good to see you, Aria", subtitle: "Here's what's happening with your money today." },
    transactions: { title: "Transactions", subtitle: "Every income and expense, in one place." },
    goals: { title: "My Goals", subtitle: "Track what you're saving for." },
    settings: { title: "Settings", subtitle: "Make FinQ yours." },
    analytics: { title: "Analytics", subtitle: "Trends and totals across your full history." }
  };
  function switchView(view) {
    if (!view) return;
    currentView = view;
    $all(".view").forEach((v) => v.classList.remove("is-active"));
    $(`#view-${view}`).classList.add("is-active");
    el.navItems.forEach((item) => {
      item.classList.toggle("is-active", item.dataset.view === view);
    });
    $all(".bn-item[data-view-link]").forEach((b) => b.classList.toggle("is-active", b.dataset.viewLink === view));
    el.pageTitle.textContent = viewCopy[view].title;
    el.pageSubtitle.textContent = viewCopy[view].subtitle;
    if (view === "analytics") renderAnalyticsCharts();
    closeMobileSidebar();
  }
  /* ---------------------------------------------------------
     THEME
     --------------------------------------------------------- */
  function getThemePref() {
    const s = localStorage.getItem(THEME_KEY);
    return s === "light" || s === "dark" ? s : "system";
  }
  function applyTheme(pref) {
    const mq = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");
    const dark = pref === "dark" || (pref === "system" && mq && mq.matches);
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }
  function updateThemeUI(pref) {
    $all("[data-theme-pref]").forEach((b) => b.classList.toggle("is-active", b.dataset.themePref === pref));
  }
  function restoreTheme() {
    const pref = getThemePref();
    applyTheme(pref);
    updateThemeUI(pref);
    const mq = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");
    if (mq && mq.addEventListener) {
      mq.addEventListener("change", () => {
        if (getThemePref() !== "system") return;
        applyTheme("system");
        renderCharts();
        if (currentView === "analytics") renderAnalyticsCharts();
      });
    }
  }
  function setThemePreference(pref) {
    localStorage.setItem(THEME_KEY, pref);
    applyTheme(pref);
    updateThemeUI(pref);
    renderCharts();
    if (currentView === "analytics") renderAnalyticsCharts();
  }
  function restoreSidebarState() {
    if (localStorage.getItem(SIDEBAR_KEY) === "1") {
      el.app.classList.add("is-collapsed");
    }
  }
  /* ---------------------------------------------------------
     MODAL / FORM
     --------------------------------------------------------- */
  function openModal() {
    clearFormErrors();
    el.txForm.reset();
    setDefaultDate();
    setModalType("expense");
    el.modalOverlay.classList.add("is-open");
    document.body.style.overflow = "hidden";
    setTimeout(() => el.amountInput.focus(), 150);
  }
  function closeModal() {
    el.modalOverlay.classList.remove("is-open");
    document.body.style.overflow = "";
  }
  function setModalType(type) {
    currentModalType = type;
    el.typeExpenseBtn.classList.toggle("is-active", type === "expense");
    el.typeIncomeBtn.classList.toggle("is-active", type === "income");
  }
  function clearFormErrors() {
    [el.amountInput, el.categoryInput, el.dateInput].forEach((input) => {
      input.closest(".field")?.classList.remove("has-error");
    });
    el.amountError.textContent = "";
    el.categoryError.textContent = "";
    el.dateError.textContent = "";
  }
  function setFieldError(input, errorEl, message) {
    input.closest(".field").classList.add("has-error");
    errorEl.textContent = message;
  }
  function validateForm() {
    clearFormErrors();
    let isValid = true;
    const amount = parseFloat(el.amountInput.value);
    if (isNaN(amount) || amount <= 0) {
      setFieldError(el.amountInput, el.amountError, "Enter an amount greater than 0.");
      isValid = false;
    }
    if (!el.categoryInput.value) {
      setFieldError(el.categoryInput, el.categoryError, "Choose a category.");
      isValid = false;
    }
    if (!el.dateInput.value) {
      setFieldError(el.dateInput, el.dateError, "Choose a date.");
      isValid = false;
    } else if (el.dateInput.value > localToday()) {
      setFieldError(el.dateInput, el.dateError, "Date can't be in the future.");
      isValid = false;
    }
    return isValid;
  }
  function saveTransactionFromForm() {
    if (!validateForm()) return;
    const transaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: currentModalType,
      amount: parseFloat(el.amountInput.value),
      category: el.categoryInput.value,
      date: el.dateInput.value,
      notes: el.notesInput.value.trim(),
      createdAt: Date.now()
    };
    transactions.push(transaction);
    saveTransactions();
    renderAll();
    closeModal();
    showToast("success", `${transaction.type === "income" ? "Income" : "Expense"} of ${currencyFormatter.format(transaction.amount)} added.`);
  }
  function handleFormSubmit(e) {
    e.preventDefault();
    saveTransactionFromForm();
  }
  function deleteTransaction(id) {
    transactions = transactions.filter((t) => t.id !== id);
    saveTransactions();
    renderAll();
    showToast("info", "Transaction deleted.");
  }
  /* ---------------------------------------------------------
     RIPPLE EFFECT
     --------------------------------------------------------- */
  function spawnRipple(e) {
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const ripple = document.createElement("span");
    const size = Math.max(rect.width, rect.height);
    ripple.classList.add("ripple");
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
    btn.appendChild(ripple);
    ripple.addEventListener("animationend", () => ripple.remove());
  }
  /* ---------------------------------------------------------
     TOASTS
     --------------------------------------------------------- */
  const toastIcons = {
    success: "✓",
    error: "!",
    info: "i"
  };
  function showToast(type, message) {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${toastIcons[type] || "i"}</span>
      <span>${escapeHtml(message)}</span>
    `;
    el.toastStack.appendChild(toast);
    setTimeout(() => {
      toast.classList.add("is-leaving");
      toast.addEventListener("animationend", () => toast.remove());
    }, 3200);
  }
  /* ---------------------------------------------------------
     DERIVED DATA HELPERS
     --------------------------------------------------------- */
  function getTotals(list) {
    return list.reduce(
      (acc, t) => {
        if (t.type === "income") acc.income += t.amount;
        else acc.expense += t.amount;
        return acc;
      },
      { income: 0, expense: 0 }
    );
  }
  function getExpenseByCategory(list) {
    const totals = {};
    list.filter((t) => t.type === "expense").forEach((t) => {
      totals[t.category] = (totals[t.category] || 0) + t.amount;
    });
    return totals;
  }
  function getMonthKey(dateStr) {
    return dateStr.slice(0, 7); // YYYY-MM
  }
  function getLastSixMonthsData() {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: d.toLocaleDateString("en-IN", { month: "short" })
      });
    }
    const income = months.map((m) =>
      transactions
        .filter((t) => t.type === "income" && getMonthKey(t.date) === m.key)
        .reduce((sum, t) => sum + t.amount, 0)
    );
    const expense = months.map((m) =>
      transactions
        .filter((t) => t.type === "expense" && getMonthKey(t.date) === m.key)
        .reduce((sum, t) => sum + t.amount, 0)
    );
    return { labels: months.map((m) => m.label), income, expense };
  }
  function getCurrentAndPreviousMonthTotals() {
    const now = new Date();
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
    const currentTx = transactions.filter((t) => getMonthKey(t.date) === currentKey);
    const prevTx = transactions.filter((t) => getMonthKey(t.date) === prevKey);
    return { current: getTotals(currentTx), previous: getTotals(prevTx) };
  }
  function percentChange(current, previous) {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }
  /* ---------------------------------------------------------
     RENDER: MASTER
     --------------------------------------------------------- */
  function renderAll() {
    renderStats();
    renderCharts();
    renderRecentActivity();
    renderMonthlySummary();
    renderTable();
    renderAnalyticsSummary();
    renderGoals();
    if (currentView === "analytics") renderAnalyticsCharts();
  }
  /* ---------------------------------------------------------
     RENDER: STAT CARDS (with animated counters)
     --------------------------------------------------------- */
  function animateCounter(node, endValue, formatter) {
    const startValue = 0;
    const duration = 900;
    const startTime = performance.now();
    function tick(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const value = startValue + (endValue - startValue) * eased;
      node.textContent = formatter(value);
      if (progress < 1) requestAnimationFrame(tick);
      else node.textContent = formatter(endValue);
    }
    requestAnimationFrame(tick);
  }
  function renderStats() {
    const { income, expense } = getTotals(transactions);
    const balance = income - expense;
    const savingsRate = income > 0 ? Math.max(0, Math.round((balance / income) * 100)) : 0;
    animateCounter(el.statIncome, income, (v) => currencyFormatter.format(v));
    animateCounter(el.statExpense, expense, (v) => currencyFormatter.format(v));
    animateCounter(el.statBalance, balance, (v) => currencyFormatter.format(v));
    animateCounter(el.statSavings, savingsRate, (v) => `${Math.round(v)}%`);
    el.savingsBar.style.width = `${Math.min(savingsRate, 100)}%`;
    el.savingsTag.textContent = savingsRate >= 20 ? "Healthy" : savingsRate > 0 ? "Tight" : "At risk";
    const { current, previous } = getCurrentAndPreviousMonthTotals();
    const incomeChange = percentChange(current.income, previous.income);
    const expenseChange = percentChange(current.expense, previous.expense);
    el.incomeTrend.textContent = `${incomeChange >= 0 ? "+" : ""}${incomeChange}%`;
    el.incomeTrend.className = `stat-pill ${incomeChange >= 0 ? "stat-pill-up" : "stat-pill-down"}`;
    el.expenseTrend.textContent = `${expenseChange >= 0 ? "+" : ""}${expenseChange}%`;
    el.expenseTrend.className = `stat-pill ${expenseChange <= 0 ? "stat-pill-up" : "stat-pill-down"}`;
    el.balanceTrend.textContent = balance >= 0 ? "Positive" : "Negative";
  }
  /* ---------------------------------------------------------
     RENDER: CHARTS (dashboard)
     --------------------------------------------------------- */
  function cssVar(name, fallback) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
  }
  function getChartTextColor() {
    return getComputedStyle(document.documentElement).getPropertyValue("--text-secondary").trim() || "#475569";
  }
  function getChartGridColor() {
    return getComputedStyle(document.documentElement).getPropertyValue("--border").trim() || "rgba(15,23,42,0.08)";
  }
  function renderCharts() {
    if (typeof Chart === "undefined") {
      console.error("Chart.js did not load (check your internet connection or ad-blocker) — charts will stay empty.");
      return;
    }
    renderBarChart("barChart", "bar");
    renderPieChart("pieChart", "pie", el.donutTotal, el.donutLegend, true);
  }
  function renderBarChart(canvasId, chartKey) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const { labels, income, expense } = getLastSixMonthsData();
    const textColor = getChartTextColor();
    const gridColor = getChartGridColor();
    if (charts[chartKey]) charts[chartKey].destroy();
    charts[chartKey] = new Chart(canvas.getContext("2d"), {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Income",
            data: income,
            backgroundColor: cssVar("--chart-income", "#7FA89B"),
            borderRadius: 6,
            maxBarThickness: 22
          },
          {
            label: "Expenses",
            data: expense,
            backgroundColor: cssVar("--chart-expense", "#3A3F46"),
            borderRadius: 6,
            maxBarThickness: 22
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 800, easing: "easeOutQuart" },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#23262B",
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${currencyFormatter.format(ctx.parsed.y)}`
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: textColor, font: { size: 11 } } },
          y: {
            grid: { color: gridColor },
            ticks: {
              color: textColor,
              font: { size: 11 },
              callback: (v) => (v >= 1000 ? `${v / 1000}k` : v)
            }
          }
        }
      }
    });
  }
  function renderPieChart(canvasId, chartKey, totalNode, legendNode, half) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const totals = getExpenseByCategory(transactions);
    const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    const totalSpent = entries.reduce((s, [, v]) => s + v, 0);
    if (totalNode) totalNode.textContent = currencyFormatter.format(totalSpent);
    if (charts[chartKey]) charts[chartKey].destroy();
    if (entries.length === 0) {
      if (legendNode) legendNode.innerHTML = `<span style="font-size:12px;color:var(--text-tertiary)">No expenses recorded yet</span>`;
      charts[chartKey] = new Chart(canvas.getContext("2d"), {
        type: "doughnut",
        data: { labels: ["No data"], datasets: [{ data: [1], backgroundColor: ["rgba(128,140,132,0.25)"], borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: "72%", rotation: half ? -90 : 0, circumference: half ? 180 : 360, plugins: { legend: { display: false }, tooltip: { enabled: false } } }
      });
      return;
    }
    const labels = entries.map(([name]) => name);
    const data = entries.map(([, value]) => value);
    const colors = entries.map(([name]) => CATEGORIES[name]?.color || "#64748B");
    charts[chartKey] = new Chart(canvas.getContext("2d"), {
      type: "doughnut",
      data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 3, borderColor: getComputedStyle(document.documentElement).getPropertyValue("--surface-solid").trim() || "#fff" }] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "72%", rotation: half ? -90 : 0, circumference: half ? 180 : 360,
        animation: { duration: 800, easing: "easeOutQuart" },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#23262B",
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${currencyFormatter.format(ctx.parsed)} (${Math.round((ctx.parsed / totalSpent) * 100)}%)`
            }
          }
        }
      }
    });
    if (legendNode) {
      legendNode.innerHTML = entries
        .map(
          ([name, value]) => `
          <span class="donut-legend-item">
            <i style="background:${CATEGORIES[name]?.color || "#64748B"}"></i>
            ${escapeHtml(name)} · ${Math.round((value / totalSpent) * 100)}%
          </span>`
        )
        .join("");
    }
  }
  /* ---------------------------------------------------------
     RENDER: ANALYTICS VIEW CHARTS
     --------------------------------------------------------- */
  function renderAnalyticsCharts() {
    if (typeof Chart === "undefined") {
      console.error("Chart.js did not load — analytics charts will stay empty.");
      return;
    }
    renderBarChart("analyticsBar", "analyticsBar");
    renderPieChart("analyticsPie", "analyticsPie", null, null);
  }
  /* ---------------------------------------------------------
     RENDER: RECENT ACTIVITY
     --------------------------------------------------------- */
  function renderRecentActivity() {
    const recent = [...transactions]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 6);
    if (recent.length === 0) {
      el.recentActivity.innerHTML = emptyBlock(
        "No activity yet",
        "Transactions you add will show up here."
      );
      return;
    }
    el.recentActivity.innerHTML = recent
      .map((t) => {
        const cat = CATEGORIES[t.category] || CATEGORIES.Others;
        const sign = t.type === "income" ? "+" : "−";
        const amountClass = t.type === "income" ? "amount-in" : "amount-out";
        return `
        <div class="activity-item">
          <div class="activity-icon" style="background:${hexToRgba(cat.color, 0.14)};color:${cat.color}">${cat.icon}</div>
          <div class="activity-info">
            <div class="activity-title">${escapeHtml(t.category)}${t.notes ? ` — ${escapeHtml(t.notes)}` : ""}</div>
            <div class="activity-sub">${formatDate(t.date)}</div>
          </div>
          <div class="activity-amount ${amountClass}">${sign} ${currencyFormatter.format(t.amount)}</div>
        </div>`;
      })
      .join("");
  }
  /* ---------------------------------------------------------
     RENDER: MONTHLY SUMMARY (current month, by category)
     --------------------------------------------------------- */
  function renderMonthlySummary() {
    const now = new Date();
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const monthTx = transactions.filter((t) => t.type === "expense" && getMonthKey(t.date) === currentKey);
    const totals = getExpenseByCategory(monthTx);
    const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    const maxValue = entries.length ? entries[0][1] : 0;
    if (entries.length === 0) {
      el.monthlySummary.innerHTML = emptyBlock("Nothing spent this month", "Your category breakdown will appear here.");
      return;
    }
    el.monthlySummary.innerHTML = entries
      .map(([name, value]) => {
        const cat = CATEGORIES[name] || CATEGORIES.Others;
        const width = maxValue ? Math.round((value / maxValue) * 100) : 0;
        return `
        <div class="summary-row">
          <div class="summary-row-top">
            <span class="cat-name"><span class="cat-dot" style="background:${cat.color}"></span>${escapeHtml(name)}</span>
            <span class="cat-amount">${currencyFormatter.format(value)}</span>
          </div>
          <div class="summary-bar-track"><div class="summary-bar-fill" style="width:${width}%;background:${cat.color}"></div></div>
        </div>`;
      })
      .join("");
  }
  /* ---------------------------------------------------------
     RENDER: ANALYTICS SUMMARY (all-time totals)
     --------------------------------------------------------- */
  function renderAnalyticsSummary() {
    const totals = getExpenseByCategory(transactions);
    const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    const maxValue = entries.length ? entries[0][1] : 0;
    if (entries.length === 0) {
      el.analyticsSummary.innerHTML = emptyBlock("No expenses yet", "Category totals will build up as you add transactions.");
      return;
    }
    el.analyticsSummary.innerHTML = entries
      .map(([name, value]) => {
        const cat = CATEGORIES[name] || CATEGORIES.Others;
        const width = maxValue ? Math.round((value / maxValue) * 100) : 0;
        return `
        <div class="summary-row">
          <div class="summary-row-top">
            <span class="cat-name"><span class="cat-dot" style="background:${cat.color}"></span>${escapeHtml(name)}</span>
            <span class="cat-amount">${currencyFormatter.format(value)}</span>
          </div>
          <div class="summary-bar-track"><div class="summary-bar-fill" style="width:${width}%;background:${cat.color}"></div></div>
        </div>`;
      })
      .join("");
  }
  /* ---------------------------------------------------------
     RENDER: TRANSACTIONS TABLE
     --------------------------------------------------------- */
  function renderTable() {
    const query = el.tableSearch.value.trim().toLowerCase();
    const typeFilter = el.filterType.value;
    const categoryFilter = el.filterCategory.value;
    const sort = el.sortField.value;
    let list = transactions.filter((t) => {
      const matchesQuery =
        !query ||
        t.category.toLowerCase().includes(query) ||
        (t.notes && t.notes.toLowerCase().includes(query));
      const matchesType = typeFilter === "all" || t.type === typeFilter;
      const matchesCategory = categoryFilter === "all" || t.category === categoryFilter;
      return matchesQuery && matchesType && matchesCategory;
    });
    list = sortTransactions(list, sort);
    el.txCount.textContent = `${transactions.length} transaction${transactions.length === 1 ? "" : "s"}`;
    if (list.length === 0) {
      el.txTableBody.innerHTML = "";
      el.emptyState.classList.toggle("is-visible", transactions.length === 0);
      if (transactions.length > 0) {
        el.txTableBody.innerHTML = `
          <tr><td colspan="5" style="text-align:center;padding:40px 10px;color:var(--text-tertiary);font-size:13px;">
            No transactions match your search or filters.
          </td></tr>`;
      }
      return;
    }
    el.emptyState.classList.remove("is-visible");
    el.txTableBody.innerHTML = list
      .map((t, i) => {
        const cat = CATEGORIES[t.category] || CATEGORIES.Others;
        const sign = t.type === "income" ? "+" : "−";
        const amountColor = t.type === "income" ? "var(--success)" : "var(--danger)";
        return `
        <tr style="animation-delay:${Math.min(i, 12) * 30}ms">
          <td><span class="cat-badge"><span class="cat-dot" style="background:${cat.color}"></span>${escapeHtml(t.category)}</span></td>
          <td class="tx-notes">${t.notes ? escapeHtml(t.notes) : "—"}</td>
          <td class="tx-date">${formatDate(t.date)}</td>
          <td class="tx-amount" style="color:${amountColor}">${sign} ${currencyFormatter.format(t.amount)}</td>
          <td>
            <div class="row-actions">
              <button class="icon-btn" data-delete-id="${t.id}" aria-label="Delete transaction">
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M4 6H16M8 6V4.5C8 4 8.4 3.5 9 3.5H11C11.6 3.5 12 4 12 4.5V6M15 6L14.3 15.5C14.3 16.3 13.6 17 12.8 17H7.2C6.4 17 5.7 16.3 5.7 15.5L5 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
            </div>
          </td>
        </tr>`;
      })
      .join("");
    $all("[data-delete-id]").forEach((btn) => {
      btn.addEventListener("click", () => deleteTransaction(btn.dataset.deleteId));
    });
  }
  function sortTransactions(list, sort) {
    const copy = [...list];
    switch (sort) {
      case "date-asc":
        return copy.sort((a, b) => a.date.localeCompare(b.date));
      case "amount-desc":
        return copy.sort((a, b) => b.amount - a.amount);
      case "amount-asc":
        return copy.sort((a, b) => a.amount - b.amount);
      case "date-desc":
      default:
        return copy.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
    }
  }
  function escapeCsvField(value) {
    const str = String(value ?? "");
    if (/[",\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }
  function transactionsToCsv(list) {
    const header = ["Type", "Category", "Amount (INR)", "Date", "Notes"];
    const rows = list.map((t) => [
      t.type === "income" ? "Income" : "Expense",
      t.category,
      t.amount,
      t.date,
      t.notes || ""
    ]);
    return [header, ...rows].map((row) => row.map(escapeCsvField).join(",")).join("\r\n");
  }
  function parseCsv(text) {
    // Minimal CSV parser that handles quoted fields containing commas/quotes/newlines.
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (inQuotes) {
        if (char === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else { inQuotes = false; }
        } else {
          field += char;
        }
      } else if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        row.push(field); field = "";
      } else if (char === "\n" || char === "\r") {
        if (char === "\r" && text[i + 1] === "\n") i++;
        row.push(field); field = "";
        if (row.length > 1 || row[0] !== "") rows.push(row);
        row = [];
      } else {
        field += char;
      }
    }
    if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
    return rows;
  }
  /* ---------------------------------------------------------
     EXPORT / IMPORT
     Exports as CSV — opens directly in Excel/Google Sheets/Numbers
     with plain column headers, unlike raw JSON which is meant for
     programs, not people. Import still accepts old .json exports
     too, so nothing you've already exported becomes unreadable.
     --------------------------------------------------------- */
  function exportData() {
    if (transactions.length === 0) {
      showToast("info", "There's nothing to export yet.");
      return;
    }
    const sorted = [...transactions].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
    const csv = transactionsToCsv(sorted);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finq-transactions-${localToday()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast("success", "Transactions exported as a CSV file — open it in Excel or Sheets.");
  }
  function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = String(event.target.result);
        const trimmed = text.trim();
        let valid;
        if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
          // Legacy .json export
          const parsed = JSON.parse(trimmed);
          const arr = Array.isArray(parsed) ? parsed : [parsed];
          valid = arr.filter(
            (t) => t && (t.type === "income" || t.type === "expense") && typeof t.amount === "number" && t.amount > 0 && t.category && /^\d{4}-\d{2}-\d{2}$/.test(String(t.date))
          );
        } else {
          // .csv export
          const rows = parseCsv(trimmed);
          if (rows.length < 2) throw new Error("No data rows found");
          const header = rows[0].map((h) => h.trim().toLowerCase());
          const idx = {
            type: header.findIndex((h) => h === "type"),
            category: header.findIndex((h) => h === "category"),
            amount: header.findIndex((h) => h.startsWith("amount")),
            date: header.findIndex((h) => h === "date"),
            notes: header.findIndex((h) => h === "notes")
          };
          valid = rows
            .slice(1)
            .map((r) => ({
              type: (r[idx.type] || "").trim().toLowerCase() === "income" ? "income" : "expense",
              category: (r[idx.category] || "Others").trim() || "Others",
              amount: parseFloat(r[idx.amount]),
              date: (r[idx.date] || "").trim(),
              notes: (r[idx.notes] || "").trim()
            }))
            .filter((t) => !isNaN(t.amount) && t.amount > 0 && /^\d{4}-\d{2}-\d{2}$/.test(t.date));
        }
        if (!valid || valid.length === 0) throw new Error("No valid transactions found in file");
        valid.forEach((t) => {
          t.category = String(t.category); t.notes = t.notes ? String(t.notes) : "";
          if (!t.id || !/^[\w-]+$/.test(String(t.id))) t.id = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          if (!t.createdAt) t.createdAt = Date.now();
        });
        transactions = [...transactions, ...valid];
        saveTransactions();
        renderAll();
        showToast("success", `Imported ${valid.length} transaction${valid.length === 1 ? "" : "s"}.`);
      } catch (err) {
        console.error(err);
        showToast("error", "That file couldn't be imported — check it's a valid CSV or JSON export.");
      } finally {
        el.importInput.value = "";
      }
    };
    reader.readAsText(file);
  }
  /* ---------------------------------------------------------
     UTILITIES
     --------------------------------------------------------- */
  function formatDate(dateStr) {
    const d = new Date(`${dateStr}T00:00:00`);
    return dateFormatter.format(d);
  }
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
  function hexToRgba(hex, alpha) {
    const clean = hex.replace("#", "");
    const bigint = parseInt(clean, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  function emptyBlock(title, sub) {
    return `
      <div class="activity-empty">
        <svg width="48" height="48" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="1.3"/><path d="M7 10.5L9 12.5L13.5 8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(sub)}</span>
      </div>`;
  }
  /* ---------------------------------------------------------
     CHART.JS LATE-LOAD HOOK
     The Chart.js <script> loader (in index.html) may still be
     fetching a fallback CDN when our own init() runs. Once it
     finishes — success or not — it calls this so charts draw
     immediately, with no page refresh needed.
     --------------------------------------------------------- */
  window.__finqRenderCharts = function () {
    renderCharts();
    if (currentView === "analytics") renderAnalyticsCharts();
  };
})();
