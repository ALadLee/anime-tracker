// =========================================================
// auth.js — handles the login form on index.html
// =========================================================

const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const rememberMeInput = document.getElementById("rememberMe");
const loginBtn = document.getElementById("loginBtn");
const formError = document.getElementById("formError");
const togglePwBtn = document.getElementById("togglePw");

// Show/hide password text
togglePwBtn.addEventListener("click", () => {
  const isHidden = passwordInput.type === "password";
  passwordInput.type = isHidden ? "text" : "password";
});

function showError(message) {
  formError.textContent = message;
  formError.classList.add("show");
}

function clearError() {
  formError.textContent = "";
  formError.classList.remove("show");
}

// If the user already has a valid session, skip straight to the dashboard.
async function redirectIfLoggedIn() {
  const { data } = await supabaseClient.auth.getSession();
  if (data.session) {
    window.location.href = "dashboard.html";
  }
}
redirectIfLoggedIn();

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showError("Please enter both your email and password.");
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = "Logging in...";

  // "Remember me" controls whether Supabase persists the session in
  // localStorage (stays logged in after closing the tab) or only keeps
  // it in memory for the current tab session.
  try {
    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      showError(error.message || "Invalid email or password.");
      loginBtn.disabled = false;
      loginBtn.textContent = "Login";
      return;
    }

    localStorage.setItem("animeTracker_rememberMe", rememberMeInput.checked ? "1" : "0");
    window.location.href = "dashboard.html";
  } catch (err) {
    console.error(err);
    showError("Something went wrong. Please try again.");
    loginBtn.disabled = false;
    loginBtn.textContent = "Login";
  }
});
