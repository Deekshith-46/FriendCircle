# DELETE ACCOUNT API DOCUMENTATION

## Overview
These APIs allow users to permanently delete their accounts along with all associated data.

## ⚠️ IMPORTANT NOTES
- **Irreversible Action**: Account deletion is permanent and cannot be undone
- **Data Loss**: All user data, chat history, transactions, and images will be permanently deleted
- **Confirmation Required**: Frontend should implement confirmation dialogs before calling these APIs

---

## MALE USER DELETE ACCOUNT

### Endpoint
```
DELETE /male-user/account
```

### Headers
```
Authorization: Bearer <male_user_jwt_token>
```

### Response Success (200)
```json
{
  "success": true,
  "message": "Account permanently deleted",
  "data": {
    "chatRoomsDeleted": 5,
    "messagesDeleted": "All messages in user rooms",
    "transactionsDeleted": 12,
    "withdrawalsDeleted": 3,
    "imagesDeleted": "All user images"
  }
}
```

### Response Error (404)
```json
{
  "success": false,
  "message": "User not found"
}
```

---

## FEMALE USER DELETE ACCOUNT

### Endpoint
```
DELETE /female-user/account
```

### Headers
```
Authorization: Bearer <female_user_jwt_token>
```

### Response Success (200)
```json
{
  "success": true,
  "message": "Account permanently deleted",
  "data": {
    "chatRoomsDeleted": 3,
    "messagesDeleted": "All messages in user rooms",
    "transactionsDeleted": 8,
    "withdrawalsDeleted": 2,
    "imagesDeleted": "All user images"
  }
}
```

### Response Error (404)
```json
{
  "success": false,
  "message": "User not found"
}
```

---

## AGENCY USER DELETE ACCOUNT

### Endpoint
```
DELETE /agency/account
```

### Headers
```
Authorization: Bearer <agency_user_jwt_token>
```

### Response Success (200)
```json
{
  "success": true,
  "message": "Account permanently deleted",
  "data": {
    "chatRoomsDeleted": 7,
    "messagesDeleted": "All messages in user rooms",
    "transactionsDeleted": 15,
    "withdrawalsDeleted": 4,
    "imagesDeleted": "All user images"
  }
}
```

### Response Error (404)
```json
{
  "success": false,
  "message": "User not found"
}
```

---

## DATA DELETION SCOPE

When an account is deleted, the following data is permanently removed:

### Chat Data
- ✅ All chat rooms where user is a participant
- ✅ All messages in those chat rooms
- ✅ Chat room metadata and participant lists

### Financial Data
- ✅ All transaction records
- ✅ All withdrawal requests
- ✅ Balance and earnings history

### Media Data
- ✅ All uploaded images/profile pictures
- ✅ Image metadata and references

### User Data
- ✅ User profile information
- ✅ Preferences and settings
- ✅ Activity logs and statistics

---

## FRONTEND IMPLEMENTATION EXAMPLE

### JavaScript/React Example
```javascript
const deleteAccount = async () => {
  // Show confirmation dialog
  const confirmed = window.confirm(
    "⚠️ Are you sure you want to permanently delete your account?\n\n" +
    "This action cannot be undone and all your data will be lost."
  );
  
  if (!confirmed) return;
  
  try {
    const response = await fetch(`${BASE_URL}/male-user/account`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert('Account successfully deleted. Redirecting to homepage...');
      // Clear local storage and redirect
      localStorage.removeItem('token');
      window.location.href = '/';
    } else {
      alert(`Error: ${data.message}`);
    }
  } catch (error) {
    console.error('Delete account error:', error);
    alert('Failed to delete account. Please try again.');
  }
};
```

### Confirmation Dialog Best Practices
1. **Double Confirmation**: Use modal dialogs with explicit "Yes/No" buttons
2. **Clear Warning**: Explain consequences in simple terms
3. **Cancel Option**: Make it easy to abort the process
4. **Loading State**: Show progress during deletion
5. **Success Feedback**: Confirm completion and redirect appropriately

---

## SECURITY CONSIDERATIONS

### Authentication
- All endpoints require valid JWT tokens
- Tokens must match the user type (male/female/agency)
- Expired or invalid tokens will return 401 Unauthorized

### Rate Limiting
- Consider implementing rate limiting to prevent abuse
- Suggest: 1 deletion per user per account lifetime

### Audit Logging
- Deletion actions should be logged for security monitoring
- Log: timestamp, user ID, IP address, deletion summary

---

## TESTING

### Test with curl
```bash
# Male user deletion
curl -X DELETE \
  http://localhost:5000/male-user/account \
  -H "Authorization: Bearer YOUR_MALE_TOKEN"

# Female user deletion  
curl -X DELETE \
  http://localhost:5000/female-user/account \
  -H "Authorization: Bearer YOUR_FEMALE_TOKEN"

# Agency user deletion
curl -X DELETE \
  http://localhost:5000/agency/account \
  -H "Authorization: Bearer YOUR_AGENCY_TOKEN"
```

### Expected Test Results
1. **Valid token**: Should return success with deletion summary
2. **Invalid token**: Should return 401 Unauthorized
3. **Non-existent user**: Should return 404 Not Found
4. **Second deletion attempt**: Should return 404 (user no longer exists)

---

## ERROR HANDLING

### Common Error Responses

**401 Unauthorized**
```json
{
  "success": false,
  "message": "Not authorized to access this resource"
}
```

**404 Not Found**
```json
{
  "success": false,
  "message": "User not found"
}
```

**500 Internal Server Error**
```json
{
  "success": false,
  "message": "Error deleting account",
  "error": "Database connection failed"
}
```

---

## IMPLEMENTATION NOTES

### Backend Logic Flow
1. Authenticate user via JWT token
2. Verify user exists in database
3. Find all related chat rooms and messages
4. Delete messages, then chat rooms
5. Delete financial records (transactions, withdrawals)
6. Delete media files and metadata
7. Delete user profile
8. Return deletion summary

### Performance Considerations
- Large accounts with many chats may take longer to delete
- Consider implementing async deletion with job queues for very large datasets
- Monitor database performance during peak usage times

### GDPR Compliance
- These endpoints support Right to Erasure (Article 17)
- All personal data is permanently removed
- Consider adding data retention policies for legal compliance