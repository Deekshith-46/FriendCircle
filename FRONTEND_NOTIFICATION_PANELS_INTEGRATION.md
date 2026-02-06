# Frontend Notification Panels Integration Guide - Admin vs User Panel

This guide provides detailed, step-by-step instructions for integrating notifications in both **Admin Panel** and **User Panel** separately. Each section is clearly labeled to avoid confusion.

## Table of Contents

1. [Admin Panel Integration](#admin-panel-integration)
2. [User Panel Integration](#user-panel-integration)
3. [API Usage Reference](#api-usage-reference)
4. [Implementation Checklist](#implementation-checklist)

---

## Admin Panel Integration

### 1. Admin Panel API Endpoints

**Get Admin Notifications**
```javascript
// GET /api/v1/notifications/admin
// Usage: Fetch all notifications for admin users
async function getAdminNotifications(page = 1, limit = 20, unreadOnly = false, type = null) {
  const params = new URLSearchParams({
    page,
    limit,
    unreadOnly
  });
  if (type) params.append('type', type);
  
  const response = await fetch(`${API_BASE_URL}/api/v1/notifications/admin?${params}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${adminJwtToken}`, // ADMIN TOKEN REQUIRED
      'Content-Type': 'application/json'
    }
  });
  
  return await response.json();
}

// Examples for Admin Panel:
const allNotifications = await getAdminNotifications(1, 20); // All admin notifications
const unreadOnly = await getAdminNotifications(1, 20, true); // Unread only
const registrationRequests = await getAdminNotifications(1, 20, true, 'ACCOUNT_APPROVAL_REQUEST'); // Registration requests
const kycRequests = await getAdminNotifications(1, 20, true, 'KYC_SUBMITTED'); // KYC requests
const withdrawalRequests = await getAdminNotifications(1, 20, true, 'WITHDRAWAL_REQUEST'); // Withdrawal requests
```

**Mark Admin Notification as Read**
```javascript
// PUT /api/v1/notifications/admin/{notificationId}/read
// Usage: Mark specific admin notification as read
async function markAdminNotificationAsRead(notificationId) {
  const response = await fetch(`${API_BASE_URL}/api/v1/notifications/admin/${notificationId}/read`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${adminJwtToken}`, // ADMIN TOKEN REQUIRED
      'Content-Type': 'application/json'
    }
  });
  
  return await response.json();
}
```

### 2. Admin Panel WebSocket Events

**Listen for Admin-Specific Notifications**
```javascript
// In Admin Panel JavaScript:
class AdminNotificationService {
  constructor(adminJwtToken) {
    this.adminJwtToken = adminJwtToken;
    this.socket = null;
  }

  async connect() {
    const io = (await import('socket.io-client')).default;
    this.socket = io(API_BASE_URL);
    
    // Authenticate as admin
    this.socket.emit('authenticate', this.adminJwtToken);

    this.socket.on('authenticated', () => {
      console.log('Admin socket authenticated');
      this.setupAdminListeners();
    });
  }

  setupAdminListeners() {
    // Listen for admin-specific events
    this.socket.on('notification', (data) => {
      // This handles admin-wide notifications (like KYC, registration, withdrawal)
      this.handleAdminWideNotification(data);
    });

    // Specific admin notification types
    this.socket.on('notification:account_approval_request', (data) => {
      // NEW USER REGISTRATION REQUEST - Admin should see this
      this.handleAccountApprovalRequest(data);
    });

    this.socket.on('notification:kyc_submitted', (data) => {
      // NEW KYC SUBMISSION - Admin should see this
      this.handleKYCSubmission(data);
    });

    this.socket.on('notification:withdrawal_request', (data) => {
      // NEW WITHDRAWAL REQUEST - Admin should see this
      this.handleWithdrawalRequest(data);
    });

    // Admin room specific notifications
    this.socket.on('admin:notification', (data) => {
      this.handleAdminNotification(data);
    });
  }

  handleAccountApprovalRequest(data) {
    // Add to admin dashboard
    this.addToAdminPendingList('registration', data);
    this.showAdminToast('New registration request!', data);
  }

  handleKYCSubmission(data) {
    // Add to admin KYC queue
    this.addToAdminPendingList('kyc', data);
    this.showAdminToast('New KYC submission!', data);
  }

  handleWithdrawalRequest(data) {
    // Add to admin withdrawal queue
    this.addToAdminPendingList('withdrawal', data);
    this.showAdminToast('New withdrawal request!', data);
  }
}
```

### 3. Admin Panel UI Components

**Admin Notification Dashboard**
```html
<!-- Admin Panel HTML - admin-dashboard.html -->
<div class="admin-dashboard">
  <div class="admin-notifications-section">
    <h2>Admin Notifications</h2>
    
    <!-- Quick Stats -->
    <div class="admin-stats">
      <div class="stat-card">
        <h3>Pending Registrations</h3>
        <span id="pending-registrations-count">0</span>
        <button onclick="navigateTo('/admin/users/pending')">View</button>
      </div>
      <div class="stat-card">
        <h3>Pending KYC</h3>
        <span id="pending-kyc-count">0</span>
        <button onclick="navigateTo('/admin/kyc/pending')">View</button>
      </div>
      <div class="stat-card">
        <h3>Pending Withdrawals</h3>
        <span id="pending-withdrawals-count">0</span>
        <button onclick="navigateTo('/admin/withdrawals/pending')">View</button>
      </div>
    </div>

    <!-- Admin Notification List -->
    <div class="admin-notifications-list" id="adminNotificationsList">
      <!-- Admin notifications will be populated here -->
    </div>
  </div>
</div>
```

**Admin Panel JavaScript**
```javascript
// admin-panel-notifications.js
class AdminPanel {
  constructor() {
    this.notificationService = new AdminNotificationService(adminJwtToken);
    this.notifications = [];
  }

  async initialize() {
    await this.notificationService.connect();
    await this.loadAdminNotifications();
  }

  async loadAdminNotifications() {
    try {
      // Load admin-specific notifications
      const response = await getAdminNotifications(1, 50);
      this.notifications = response.data.notifications;
      this.updateAdminUI();
    } catch (error) {
      console.error('Error loading admin notifications:', error);
    }
  }

  updateAdminUI() {
    const container = document.getElementById('adminNotificationsList');
    
    container.innerHTML = this.notifications.map(notification => `
      <div class="admin-notification-item ${notification.isRead ? 'read' : 'unread'}" 
           data-id="${notification._id}">
        <div class="notification-header">
          <span class="notification-type ${this.getNotificationTypeClass(notification.type)}">
            ${this.getNotificationTypeLabel(notification.type)}
          </span>
          <span class="notification-time">${this.formatTime(notification.createdAt)}</span>
        </div>
        <div class="notification-content">
          <h4>${notification.title}</h4>
          <p>${notification.message}</p>
          
          <!-- Admin Actions based on notification type -->
          <div class="admin-actions">
            ${this.renderAdminActions(notification)}
          </div>
        </div>
        <button class="mark-read-btn" onclick="markAdminNotificationAsRead('${notification._id}')">
          ${notification.isRead ? 'Mark as Unread' : 'Mark as Read'}
        </button>
      </div>
    `).join('');
  }

  renderAdminActions(notification) {
    switch (notification.type) {
      case 'ACCOUNT_APPROVAL_REQUEST':
        return `
          <button class="btn approve-btn" onclick="approveUser('${notification.data.userId}', '${notification.data.userType}')">
            Approve Registration
          </button>
          <button class="btn reject-btn" onclick="rejectUser('${notification.data.userId}', '${notification.data.userType}')">
            Reject Registration
          </button>
        `;
      case 'KYC_SUBMITTED':
        return `
          <button class="btn approve-btn" onclick="approveKYC('${notification.data.userId}', '${notification.data.userType}', '${notification.data.kycType}')">
            Approve KYC
          </button>
          <button class="btn reject-btn" onclick="rejectKYC('${notification.data.userId}', '${notification.data.userType}', '${notification.data.kycType}')">
            Reject KYC
          </button>
        `;
      case 'WITHDRAWAL_REQUEST':
        return `
          <button class="btn approve-btn" onclick="approveWithdrawal('${notification.data.withdrawalId}')">
            Approve Withdrawal
          </button>
          <button class="btn reject-btn" onclick="rejectWithdrawal('${notification.data.withdrawalId}')">
            Reject Withdrawal
          </button>
        `;
      default:
        return '<span>No action required</span>';
    }
  }

  getNotificationTypeClass(type) {
    const classes = {
      'ACCOUNT_APPROVAL_REQUEST': 'registration',
      'KYC_SUBMITTED': 'kyc',
      'WITHDRAWAL_REQUEST': 'withdrawal'
    };
    return classes[type] || 'default';
  }

  getNotificationTypeLabel(type) {
    const labels = {
      'ACCOUNT_APPROVAL_REQUEST': 'Registration Request',
      'KYC_SUBMITTED': 'KYC Submission',
      'WITHDRAWAL_REQUEST': 'Withdrawal Request'
    };
    return labels[type] || type;
  }
}

// Initialize admin panel
const adminPanel = new AdminPanel();
adminPanel.initialize();
```

---

## User Panel Integration

### 1. User Panel API Endpoints

**Get User Notifications**
```javascript
// GET /api/v1/notifications/user
// Usage: Fetch notifications for logged-in user (male/female/agency)
async function getUserNotifications(page = 1, limit = 20, unreadOnly = false) {
  const params = new URLSearchParams({
    page,
    limit,
    unreadOnly
  });
  
  const response = await fetch(`${API_BASE_URL}/api/v1/notifications/user?${params}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${userJwtToken}`, // USER TOKEN REQUIRED (male/female/agency)
      'Content-Type': 'application/json'
    }
  });
  
  return await response.json();
}

// Examples for User Panel:
const userNotifications = await getUserNotifications(1, 20); // All user notifications
const userUnreadOnly = await getUserNotifications(1, 20, true); // Unread only
```

**Mark User Notification as Read**
```javascript
// PUT /api/v1/notifications/{notificationId}/read
// Usage: Mark specific user notification as read
async function markUserNotificationAsRead(notificationId) {
  const response = await fetch(`${API_BASE_URL}/api/v1/notifications/${notificationId}/read`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${userJwtToken}`, // USER TOKEN REQUIRED (male/female/agency)
      'Content-Type': 'application/json'
    }
  });
  
  return await response.json();
}

// Mark all user notifications as read
async function markAllUserNotificationsAsRead() {
  const response = await fetch(`${API_BASE_URL}/api/v1/notifications/read-all`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${userJwtToken}`, // USER TOKEN REQUIRED (male/female/agency)
      'Content-Type': 'application/json'
    }
  });
  
  return await response.json();
}
```

### 2. User Panel WebSocket Events

**Listen for User-Specific Notifications**
```javascript
// In User Panel JavaScript:
class UserNotificationService {
  constructor(userJwtToken) {
    this.userJwtToken = userJwtToken;
    this.socket = null;
  }

  async connect() {
    const io = (await import('socket.io-client')).default;
    this.socket = io(API_BASE_URL);
    
    // Authenticate as user
    this.socket.emit('authenticate', this.userJwtToken);

    this.socket.on('authenticated', () => {
      console.log('User socket authenticated');
      this.setupUserListeners();
    });
  }

  setupUserListeners() {
    // Listen for user-specific notifications
    this.socket.on('notification', (data) => {
      // This handles individual user notifications (approval/rejection status updates)
      this.handleUserNotification(data);
    });

    // Specific user notification types
    this.socket.on('notification:account_approved', (data) => {
      // YOUR REGISTRATION APPROVED - User should see this
      this.handleAccountApproved(data);
    });

    this.socket.on('notification:account_rejected', (data) => {
      // YOUR REGISTRATION REJECTED - User should see this
      this.handleAccountRejected(data);
    });

    this.socket.on('notification:kyc_approved', (data) => {
      // YOUR KYC APPROVED - User should see this
      this.handleKYCApproved(data);
    });

    this.socket.on('notification:kyc_rejected', (data) => {
      // YOUR KYC REJECTED - User should see this
      this.handleKYCRejected(data);
    });

    this.socket.on('notification:withdrawal_approved', (data) => {
      // YOUR WITHDRAWAL APPROVED - User should see this
      this.handleWithdrawalApproved(data);
    });

    this.socket.on('notification:withdrawal_rejected', (data) => {
      // YOUR WITHDRAWAL REJECTED - User should see this
      this.handleWithdrawalRejected(data);
    });
  }

  handleAccountApproved(data) {
    // Show success message to user
    this.showUserToast('Registration Approved!', data.message);
    // Update user status to 'accepted'
    this.updateUserStatus('accepted');
  }

  handleAccountRejected(data) {
    // Show rejection message with reason to user
    this.showUserToast('Registration Rejected', `Reason: ${data.reason}`);
    // Update user status to 'rejected'
    this.updateUserStatus('rejected');
  }

  handleKYCApproved(data) {
    // Show KYC approved message
    this.showUserToast('KYC Approved!', data.message);
  }

  handleKYCRejected(data) {
    // Show KYC rejected message with reason
    this.showUserToast('KYC Rejected', `Reason: ${data.reason}`);
  }
}
```

### 3. User Panel UI Components

**User Notification Bell**
```html
<!-- User Panel HTML - user-dashboard.html -->
<div class="user-dashboard">
  <div class="user-notifications-section">
    <!-- Notification Bell Component -->
    <div class="notification-bell">
      <button class="bell-button" id="userNotificationBell">
        <i class="bell-icon">🔔</i>
        <span class="badge" id="userNotificationBadge">0</span>
      </button>
      <div class="notification-dropdown" id="userNotificationDropdown">
        <div class="dropdown-header">
          <h3>Your Notifications</h3>
          <button class="mark-all-read" onclick="markAllUserNotificationsAsRead()">Mark all as read</button>
        </div>
        <div class="notifications-list" id="userNotificationsList">
          <!-- User notifications will be populated here -->
        </div>
      </div>
    </div>
  </div>
</div>
```

**User Panel JavaScript**
```javascript
// user-panel-notifications.js
class UserPanel {
  constructor() {
    this.notificationService = new UserNotificationService(userJwtToken);
    this.notifications = [];
    this.unreadCount = 0;
  }

  async initialize() {
    await this.notificationService.connect();
    await this.loadUserNotifications();
  }

  async loadUserNotifications() {
    try {
      // Load user-specific notifications
      const response = await getUserNotifications(1, 10);
      this.notifications = response.data.notifications;
      this.unreadCount = response.data.unreadCount;
      this.updateUserUI();
    } catch (error) {
      console.error('Error loading user notifications:', error);
    }
  }

  updateUserUI() {
    // Update notification badge
    const badge = document.getElementById('userNotificationBadge');
    badge.textContent = this.unreadCount > 0 ? this.unreadCount : '';
    badge.style.display = this.unreadCount > 0 ? 'block' : 'none';

    // Update notifications list
    const container = document.getElementById('userNotificationsList');
    
    if (this.notifications.length === 0) {
      container.innerHTML = '<div class="no-notifications">No notifications</div>';
      return;
    }

    container.innerHTML = this.notifications.map(notification => `
      <div class="notification-item ${notification.isRead ? 'read' : 'unread'}" 
           data-id="${notification._id}">
        <div class="notification-header">
          <span class="notification-type ${this.getNotificationTypeClass(notification.type)}">
            ${this.getNotificationTypeLabel(notification.type)}
          </span>
          <span class="notification-time">${this.formatTime(notification.createdAt)}</span>
        </div>
        <div class="notification-content">
          <h4>${notification.title}</h4>
          <p>${notification.message}</p>
          ${notification.data.reason ? `<p class="rejection-reason"><strong>Reason:</strong> ${notification.data.reason}</p>` : ''}
        </div>
        <button class="mark-read-btn" onclick="markUserNotificationAsRead('${notification._id}')">
          ${notification.isRead ? 'Mark as Unread' : 'Mark as Read'}
        </button>
      </div>
    `).join('');
  }

  getNotificationTypeClass(type) {
    const classes = {
      'ACCOUNT_APPROVED': 'success',
      'ACCOUNT_REJECTED': 'error',
      'KYC_APPROVED': 'success',
      'KYC_REJECTED': 'error',
      'WITHDRAWAL_APPROVED': 'success',
      'WITHDRAWAL_REJECTED': 'error'
    };
    return classes[type] || 'info';
  }

  getNotificationTypeLabel(type) {
    const labels = {
      'ACCOUNT_APPROVED': 'Approved',
      'ACCOUNT_REJECTED': 'Rejected',
      'KYC_APPROVED': 'KYC Approved',
      'KYC_REJECTED': 'KYC Rejected',
      'WITHDRAWAL_APPROVED': 'Withdrawal Approved',
      'WITHDRAWAL_REJECTED': 'Withdrawal Rejected'
    };
    return labels[type] || type;
  }
}

// Initialize user panel
const userPanel = new UserPanel();
userPanel.initialize();
```

---

## API Usage Reference

### Admin Panel APIs (Use Admin JWT Token)
| Endpoint | Method | Purpose | Token Required |
|----------|--------|---------|----------------|
| `/api/v1/notifications/admin` | GET | Get admin notifications | Admin Token |
| `/api/v1/notifications/admin/{id}/read` | PUT | Mark admin notification as read | Admin Token |

### User Panel APIs (Use User JWT Token)
| Endpoint | Method | Purpose | Token Required |
|----------|--------|---------|----------------|
| `/api/v1/notifications/user` | GET | Get user notifications | User Token (male/female/agency) |
| `/api/v1/notifications/{id}/read` | PUT | Mark user notification as read | User Token |
| `/api/v1/notifications/read-all` | PUT | Mark all user notifications as read | User Token |

### WebSocket Event Differences

**Admin Panel Events:**
- `notification:account_approval_request` - New registration requests
- `notification:kyc_submitted` - New KYC submissions  
- `notification:withdrawal_request` - New withdrawal requests

**User Panel Events:**
- `notification:account_approved` - User's registration approved
- `notification:account_rejected` - User's registration rejected
- `notification:kyc_approved` - User's KYC approved
- `notification:kyc_rejected` - User's KYC rejected
- `notification:withdrawal_approved` - User's withdrawal approved
- `notification:withdrawal_rejected` - User's withdrawal rejected

---

## Implementation Checklist

### For Admin Panel:
- [ ] Use admin JWT token for API calls
- [ ] Call `/api/v1/notifications/admin` endpoint
- [ ] Listen for admin-specific WebSocket events
- [ ] Implement approval/rejection actions
- [ ] Show pending request counts (registrations, KYC, withdrawals)
- [ ] Use admin-specific UI components

### For User Panel:
- [ ] Use user JWT token (male/female/agency) for API calls
- [ ] Call `/api/v1/notifications/user` endpoint
- [ ] Listen for user-specific WebSocket events
- [ ] Show status updates to user
- [ ] Handle rejection reasons display
- [ ] Use user-specific UI components

### Common Requirements:
- [ ] Initialize WebSocket connection with appropriate token
- [ ] Handle authentication errors
- [ ] Implement proper error handling
- [ ] Add loading states
- [ ] Update UI when notifications change
- [ ] Handle notification click actions appropriately

## Summary

**ADMIN PANEL** receives:
- Registration requests (to approve/reject)
- KYC submissions (to approve/reject)
- Withdrawal requests (to approve/reject)

**USER PANEL** receives:
- Status updates (approved/rejected)
- Rejection reasons
- Process completion notifications

Each panel uses different API endpoints, different JWT tokens, and different WebSocket events!