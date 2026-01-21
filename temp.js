<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Privacy & Security</title>
  <link rel="stylesheet" href="/css/privacy-security.css">
</head>
<body>

<div class="profile-container">
  <aside class="profile-sidebar">

    <div class="profile-user">
      <% if (user && user.profileImage) { %>
        <img
          src="<%= user.profileImage %>"
          alt="Profile Image"
          class="profile-avatar"
        />
      <% } else { %>
        <div class="avatar-circle">👤</div>
      <% } %>

      <h4>Hello 👋 <%= user?.name || "User" %></h4>
    </div>
    <ul class="profile-menu">
      <li>
        <a href="/userprofile">Profile Information</a>
      </li>
      <li>
        <a href="/orders">My Orders</a>
      </li>
      <li>
        <a href="/manage-address">Manage Addresses</a>
      </li>
      <li class="active">
        <a href="/userprofile/privacy-security">Privacy & Security</a>
      </li>
      <li>
        <a href="/logout">Logout</a>
      </li>
    </ul>

  </aside>
  <main class="profile-content">

    <div class="page-header">
      <h2>🔒 Privacy & Security</h2>
      <p>Manage your account security settings and change your password or email address</p>
    </div>

    <% if (isGoogleUser) { %>
      <div class="security-card google-card">
        <div class="lock-icon">🔒</div>
        <h3>Google Account Linked</h3>

        <p>
          Your account is connected to your Google account. For security reasons, 
          <strong>you cannot change your password and email address through this portal</strong>.
        </p>

        <p>
          All security settings including password and email changes must be managed through your 
          <strong>Google Account settings</strong>.
        </p>

        <a href="https://myaccount.google.com/security" target="_blank" class="security-btn">
          🔐 Go to Google Account Security
        </a>
      </div>
    <% } else { %>
      <div class="security-options">
        <div class="security-card option-card">
          <div class="card-icon">🔑</div>
          <div class="card-content">
            <h3>Change Password</h3>
            <p>Update your password to keep your account secure</p>
          </div>
          <button class="action-btn" onclick="openPasswordModal()">Change</button>
        </div>
        <div class="security-card option-card">
          <div class="card-icon">📧</div>
          <div class="card-content">
            <h3>Change Email Address</h3>
            <p>Update your email for account recovery and notifications</p>
          </div>
          <button class="action-btn" onclick="openEmailModal()">Change</button>
        </div>

      </div>
    <% } %>

  </main>

</div>
<div id="passwordModal" class="modal-overlay">
  <div class="modal-content-box">
    
    <button class="modal-close" onclick="closePasswordModal()">✕</button>
       
    <div class="modal-header">
      <h2>🔒 Privacy & Security</h2>
      <p>Manage your account security settings and change your password or email address</p>
    </div>

    <div id="passwordSuccessMessage" class="success-message">
      ✅ Password updated successfully
    </div>
    <div class="password-section">
      <div class="section-header">
        <h3>Change Password</h3>
        <p>Create a strong password to keep your account secure</p>
      </div>

      <form id="passwordForm">
        
        <div class="input-group">
          <label>🔑 Current Password</label>
          <input 
            type="password" 
            name="currentPassword" 
            placeholder="Enter your current password"
            required
          />
        </div>

        <div class="input-row">
          <div class="input-group">
            <label>✨ New Password</label>
            <input 
              type="password" 
              name="newPassword" 
              placeholder="Create a new password"
              required
            />
          </div>

          <div class="input-group">
            <label>✓ Confirm Password</label>
            <input 
              type="password" 
              name="confirmPassword" 
              placeholder="Confirm your new password"
              required
            />
          </div>
        </div>

        <div class="form-actions">
          <button type="button" class="cancel-btn" onclick="closePasswordModal()">Cancel</button>
          <button type="submit" class="update-btn">Update Password</button>
        </div>

      </form>
    </div>

  </div>
</div>
<div id="emailModal" class="modal-overlay">
  <div class="modal-content-box">
    
    <button class="modal-close" onclick="closeEmailModal()">✕</button>
       
    <div class="modal-header">
      <h2>🔒 Privacy & Security</h2>
      <p>Manage your account security settings and change your password or email address</p>
    </div>

    <div id="emailSuccessMessage" class="success-message">
      ✅ Verification code sent to your new email address
    </div>

    <div class="password-section">
      <div class="section-header">
        <h3>Change Email Address</h3>
        <p>Update your email address for account recovery and notifications</p>
      </div>

      <form id="emailForm">
        
        <div class="input-group">
          <label>📧 Current Email</label>
          <input 
            type="email" 
            value="<%= user?.email || '' %>" 
            disabled
            class="disabled-input"
          />
        </div>
        <div class="input-group">
          <label>📮 New Email Address</label>
          <input 
            type="email" 
            name="newEmail" 
            placeholder="Enter your new email address"
            required
          />
        </div>

        <div class="input-group">
          <label>🔑 Confirm Password</label>
          <input 
            type="password" 
            name="password" 
            placeholder="Enter your password for verification"
            required
          />
        </div>

        <div class="form-actions">
          <button type="button" class="cancel-btn" onclick="closeEmailModal()">Cancel</button>
          <button type="submit" class="update-btn">Send Verification Code</button>
        </div>

      </form>
    </div>

  </div>
</div>

<script>
  function openPasswordModal() {
    document.getElementById("passwordModal").style.display = "flex";
    document.getElementById("passwordSuccessMessage").style.display = "none";
  }

  function closePasswordModal() {
    document.getElementById("passwordModal").style.display = "none";
    document.getElementById("passwordForm").reset();
    document.getElementById("passwordSuccessMessage").style.display = "none";
  }

 document.getElementById("emailForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const formData = new FormData(this);
  let password = formData.get("password")?.trim();
  let newEmail = formData.get("newEmail")?.trim();

  console.log("Submitting email change:", { 
    newEmail, 
    passwordLength: password?.length,
    hasPassword: !!password 
  });
  if (!password || password === "") {
    alert("Please enter your password");
    return;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(newEmail)) {
    alert("Please enter a valid email address");
    return;
  }

  try {
    const res = await fetch("/userprofile/change-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        newEmail: newEmail,
        password: password,
      }),
    });

    const data = await res.json();
    console.log("Response:", data);

    if (data.success) {
      const successMsg = document.getElementById("emailSuccessMessage");
      successMsg.textContent = "✅ " + data.message;
      successMsg.style.display = "block";
      this.reset();
      setTimeout(() => {
        closeEmailModal();
      }, 2000);
    } else {
      alert(data.message || "Failed to send verification code");
    }
  } catch (error) {
    console.error("Error:", error);
    alert("An error occurred. Please try again.");
  }
});
  function openEmailModal() {
    document.getElementById("emailModal").style.display = "flex";
    document.getElementById("emailSuccessMessage").style.display = "none";
  }

  function closeEmailModal() {
    document.getElementById("emailModal").style.display = "none";
    document.getElementById("emailForm").reset();
    document.getElementById("emailSuccessMessage").style.display = "none";
  }

  document.getElementById("emailForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const formData = new FormData(this);

    try {
      const res = await fetch("/userprofile/change-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newEmail: formData.get("newEmail"),
          password: formData.get("password"),
        }),
      });

      const data = await res.json();

      if (data.success) {
        const successMsg = document.getElementById("emailSuccessMessage");
        successMsg.textContent = "✅ " + data.message;
        successMsg.style.display = "block";
        this.reset();
        setTimeout(() => {
          closeEmailModal();
        }, 2000);
      } else {
        alert(data.message || "Failed to send verification code");
      }
    } catch (error) {
      alert("An error occurred. Please try again.");
    }
  });
  window.onclick = function (event) {
    const passwordModal = document.getElementById("passwordModal");
    const emailModal = document.getElementById("emailModal");
    
    if (event.target === passwordModal) {
      closePasswordModal();
    }
    if (event.target === emailModal) {
      closeEmailModal();
    }
  };
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closePasswordModal();
      closeEmailModal();
    }
  });
</script>

</body>
