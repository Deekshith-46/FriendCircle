# Friend Circle - Complete Project Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [User Roles & Authentication](#user-roles--authentication)
5. [Admin & Staff System](#admin--staff-system)
6. [Female User System](#female-user-system)
7. [Male User System](#male-user-system)
8. [Agency User System](#agency-user-system)
9. [API Endpoints Reference](#api-endpoints-reference)
10. [Workflow & Business Logic](#workflow--business-logic)
11. [Database Models](#database-models)
12. [Security & Middleware](#security--middleware)

## Project Overview

Friend Circle is a comprehensive dating and social networking platform with multiple user types and sophisticated business logic. The platform supports interactions between male users, female users, agencies, and administrative staff with complex economic models including coins, wallet balances, and various transaction systems.

### Key Features:
- Multi-role authentication system (Admin, Staff, Male User, Female User, Agency)
- OTP-based registration and login system
- KYC verification for female and agency users
- Economic system with coins and wallet balances
- Gift and call earning systems
- Referral bonus system
- Reward and ranking systems
- Content management for interests, languages, gifts, etc.

## Technology Stack

- **Backend**: Node.js with Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT-based with role-based access control
- **File Upload**: Multer with Cloudinary integration
- **Environment**: Dotenv for configuration management
- **Payment**: Razorpay integration
- **Validation**: Built-in validation and middleware

## Project Structure

```
src/
├── config/           # Configuration files (DB, Cloudinary, Multer, Razorpay)
├── controllers/      # Business logic controllers
│   ├── adminControllers/      # Admin and staff management
│   ├── agencyControllers/     # Agency user management
│   ├── common/               # Shared controllers (interests, languages)
│   ├── femaleUserControllers/ # Female user specific logic
│   └── maleUserControllers/   # Male user specific logic
├── jobs/             # Cron jobs and scheduled tasks
├── middlewares/      # Authentication and authorization middleware
├── models/           # Database models organized by user type
│   ├── admin/        # Admin, Staff, Config, Interest, Language, etc.
│   ├── agency/       # Agency user models
│   ├── common/       # Shared models (Transaction, CallHistory, etc.)
│   ├── femaleUser/   # Female user models
│   └── maleUser/     # Male user models
├── routes/           # API route definitions
│   ├── adminRoutes/      # Admin routes
│   ├── agencyRoutes/     # Agency routes
│   ├── femaleUserRoutes/ # Female user routes
│   └── maleUserRoutes/   # Male user routes
├── utils/            # Utility functions (token generation, audit logs, etc.)
├── app.js           # Main Express application
└── server.js        # Server startup and configuration
```

## User Roles & Authentication

The system implements a sophisticated multi-role authentication system with different access patterns and permissions.

### Authentication Flow
1. **JWT Token Generation**: All users receive JWT tokens upon successful authentication
2. **Route-Based Authentication**: Middleware identifies user type based on URL path
3. **Role-Based Access Control**: Different permissions for admin, staff, and user types

### User Types
- **Admin**: Super user with full system access
- **Staff**: Limited admin access with specific module permissions
- **Female User**: Premium content creators with earning capabilities
- **Male User**: Content consumers with spending capabilities
- **Agency**: Business entities managing multiple female users

## Common Chat System

The platform includes a sophisticated real-time chat system with advanced features and security.

### Chat Features
- **Mutual Follow Validation**: Chat initiation requires accepted follow requests
- **Real-time Messaging**: WebSocket-based real-time message delivery
- **Media Support**: Image, video, and audio message support with Cloudinary integration
- **Message Management**: Individual and group message deletion
- **Read Receipts**: Real-time read status with bulk marking capability
- **Disappearing Messages**: Automatic message deletion after configurable time
- **Privacy Controls**: Two-tier deletion system (clear vs delete chat)

### Privacy & Deletion Options
- **Clear Chat**: `DELETE /chat/room/:roomId/clear` - Remove all messages for user while keeping chat visible
- **Delete Chat**: `DELETE /chat/room/:roomId` - Hide chat from user's list (soft delete)
- **Delete Message**: Remove individual messages for specific users
- **Delete for Everyone**: Sender-only feature to remove messages for all participants

### Security Features
- **Access Control**: Only chat participants can send/read messages
- **User Verification**: Database verification of user type against JWT claims
- **Follow Validation**: Enforces accepted follow requests for chat initiation
- **Block List Enforcement**: Prevents communication between blocked users
- **Rate Limiting**: Protection against message spamming

## Admin & Staff System

### Admin Authentication
- **Endpoint**: `POST /admin/login`
- **Request Body**: `{ "email": "admin@example.com", "password": "password", "userType": "admin" }`
- **Response**: JWT token and user details

### Staff Authentication
- **Endpoint**: `POST /admin/login`
- **Request Body**: `{ "email": "staff@example.com", "password": "password", "userType": "staff" }`
- **Response**: JWT token and user details with permissions

### Admin/Staff Features

#### User Management
- **List Users**: `GET /admin/users?type=male|female|agency` - Retrieve users filtered by type
- **Toggle User Status**: `POST /admin/users/toggle-status` - Activate/deactivate users
- **Operate Balance**: `POST /admin/users/operate-balance` - Credit/debit user balances
- **Delete User**: `DELETE /admin/users/:userType/:userId` - Remove user account

#### Content Management
- **Interests**: CRUD operations for user interests
- **Languages**: CRUD operations for user languages
- **Religions**: CRUD operations for user religions
- **Relation Goals**: CRUD operations for relationship goals
- **Gifts**: Manage gift items with coin values
- **Pages**: Static content management
- **FAQs**: Frequently asked questions
- **Plans**: Subscription plans
- **Packages**: Coin packages

#### Registration Review
- **List Pending Registrations**: `GET /admin/users/pending-registrations` - Review new user registrations
- **Approve/Reject Registration**: `POST /admin/users/review-registration` - Approve or reject user registrations

#### KYC Management
- **List Pending KYCs**: `GET /admin/users/pending-kycs` - Review pending KYC verifications
- **Approve/Reject KYC**: `POST /admin/users/review-kyc` - Approve or reject KYC documents

#### Staff Management
- **Create Staff**: `POST /admin/staff` - Add new staff members
- **Update Staff**: `PUT /admin/staff/:id` - Modify staff permissions
- **List Staff**: `GET /admin/staff` - View all staff members
- **Delete Staff**: `DELETE /admin/staff/:id` - Remove staff access

#### Rewards & Payouts
- **Daily Rewards**: Configure daily earning thresholds
- **Weekly Rewards**: Configure weekly ranking rewards
- **Payout Management**: Process withdrawal requests

## Female User System

### Registration Process
1. **Initial Registration**: `POST /female-user/register`
   - Provide email and mobile number
   - Receive OTP via email
   - Optional referral code support

2. **OTP Verification**: `POST /female-user/verify-otp`
   - Verify the OTP to activate account
   - Receive JWT token upon success

3. **Complete Profile**: `POST /female-user/complete-profile`
   - Add personal information (name, age, bio, etc.)
   - Upload images and video
   - Select interests and languages
   - Profile goes for admin review after completion

### Profile Management
- **Get Profile**: `GET /female-user/me` - Retrieve current user profile
- **Update Profile**: `PUT /female-user/update` - Update user information
- **Update Interests**: `PUT /female-user/interests` - Update selected interests
- **Update Languages**: `PUT /female-user/languages` - Update selected languages
- **Update Preferences**: Various endpoints for hobbies, sports, film, music, travel

### Media Management
- **Upload Images**: `POST /female-user/upload-image` (multipart form-data)
- **Upload Video**: `POST /female-user/upload-video` (multipart form-data)
- **Delete Image**: `DELETE /female-user/images/:imageId` - Remove specific image

### Social Features
- **Follow/Unfollow**: Manage connections with male users
- **Block/Unblock**: Manage blocked users
- **Favorites**: Manage favorite users
- **Chat**: Real-time messaging with male users
- **Follow Requests**: Handle follow requests from male users

### Earnings & Finance
- **Get Balance**: `GET /female-user/me/balance` - View wallet and coin balances
- **Earnings History**: `GET /female-user/earnings` - View earning history
- **Call Earnings**: `GET /female-user/calls/earnings` - View call-based earnings
- **Gift Earnings**: `GET /female-user/gifts/received` - View received gifts
- **Withdrawals**: `GET /female-user/me/withdrawals` - View withdrawal history
- **Request Withdrawal**: `POST /female-user/withdrawals/request` - Request money withdrawal

### Statistics & Performance
- **User Statistics**: `GET /female-user/stats` - View personal statistics
- **Online Status**: `POST /female-user/toggle-online-status` - Update online presence
- **Increment Missed Calls**: Track missed call statistics

### KYC Process
- **Submit KYC**: `POST /female-user/submit-kyc` - Submit KYC documents
- **Verify KYC**: `POST /female-user/verify-kyc` - Confirm KYC submission

## Male User System

### Registration Process
1. **Initial Registration**: `POST /male-user/register`
   - Provide email and mobile number
   - Receive OTP via email

2. **OTP Verification**: `POST /male-user/verify-otp`
   - Verify OTP to activate account
   - Receive JWT token

3. **Complete Profile**: `POST /male-user/complete-profile`
   - Add personal information
   - Profile activation after admin approval

### Profile Management
- **Get Profile**: `GET /male-user/me` - Retrieve current profile
- **Update Profile**: `PUT /male-user/update` - Update user information
- **Update Interests**: `PUT /male-user/interests` - Update interests
- **Update Languages**: `PUT /male-user/languages` - Update languages

### Social Features
- **Browse Female Users**: `GET /male-user/browse-females` - Discover female users
- **Follow/Unfollow**: Manage connections with female users
- **Block/Unblock**: Manage blocked users
- **Favorites**: Manage favorite users
- **Chat**: Real-time messaging with female users

### Payment & Balance
- **Get Balance**: `GET /male-user/me/balance` - View wallet and coin balances
- **Add Balance**: Various payment methods to add coins
- **Transaction History**: `GET /male-user/me/transactions` - View payment history

### Calling System
- **Initiate Call**: `POST /male-user/call/:femaleUserId` - Start video call
- **End Call**: `POST /male-user/end-call/:callId` - End active call
- **Call History**: `GET /male-user/calls/history` - View call history

### Gifting System
- **Send Gift**: `POST /male-user/gifts/send` - Send gift to female user
- **Gift History**: `GET /male-user/gifts/sent` - View sent gifts

## Agency User System

### Registration Process
1. **Initial Registration**: `POST /agency/register`
   - Provide email and mobile number
   - Receive OTP via email

2. **OTP Verification**: `POST /agency/verify-otp`
   - Verify OTP to activate account
   - Receive JWT token

3. **Complete Profile**: `PUT /agency/details`
   - Add business information
   - Upload business documents

### Profile Management
- **Get Profile**: `GET /agency/me` - Retrieve agency profile
- **Update Details**: `PUT /agency/details` - Update business information
- **Upload Image**: `POST /agency/upload-image` - Upload business image

### Agency Features
- **Manage Female Users**: Agencies can manage associated female users
- **KYC Process**: `POST /agency/kyc/submit` - Submit business KYC
- **Withdrawals**: Process withdrawal requests for managed users
- **Earnings Overview**: View overall agency performance

## API Endpoints Reference

### Admin Routes
```
/admin/
├── POST /login                    # Admin/Staff login
├── GET /profile                   # Get current admin profile
├── PUT /update                    # Update admin profile
├── POST /change-password          # Change admin password

/admin/interests/
├── GET /                          # Get all interests
├── POST /                         # Create interest
├── PUT /:id                       # Update interest
├── DELETE /:id                    # Delete interest

/admin/languages/
├── GET /                          # Get all languages
├── POST /                         # Create language
├── PUT /:id                       # Update language
├── DELETE /:id                    # Delete language

/admin/users/
├── GET /                          # List all users
├── GET /?type=female              # List female users
├── GET /?type=male                # List male users
├── GET /?type=agency              # List agency users
├── POST /toggle-status            # Toggle user status
├── POST /operate-balance          # Operate user balance
├── GET /:userType/:userId/transactions # Get user transactions
├── POST /review-registration      # Review registration
├── POST /review-kyc               # Review KYC
├── GET /pending-registrations     # Get pending registrations
├── GET /pending-kycs              # Get pending KYCs
├── DELETE /:userType/:userId      # Delete user
├── POST /set-call-rate            # Set female call rate
└── POST /:userType/:userId/cleanup-references # Cleanup user references

/admin/staff/
├── POST /                         # Create staff
├── GET /                          # List all staff
├── PUT /:id                       # Update staff
└── DELETE /:id                    # Delete staff

/admin/rewards/
├── GET /daily-rewards             # Get daily reward thresholds
├── POST /daily-rewards            # Create daily reward threshold
├── PUT /daily-rewards/:id         # Update daily reward threshold
├── DELETE /daily-rewards/:id      # Delete daily reward threshold
├── GET /weekly-rewards            # Get weekly reward structure
├── POST /weekly-rewards           # Create weekly reward
├── PUT /weekly-rewards/:id        # Update weekly reward
├── DELETE /weekly-rewards/:id     # Delete weekly reward
├── GET /pending-rewards           # Get pending rewards
└── POST /trigger-daily            # Trigger daily reward calculation

/admin/payouts/
├── GET /                          # Get all payout requests
├── POST /approve/:id              # Approve payout request
├── POST /reject/:id               # Reject payout request
└── GET /:userId                   # Get user's payout history
```

### Female User Routes
```
/female-user/
├── POST /register                 # Register new female user
├── POST /login                    # Login (sends OTP)
├── POST /verify-login-otp         # Verify login OTP
├── POST /verify-otp               # Verify registration OTP
├── POST /complete-profile         # Complete user profile
├── POST /add-info                 # Add user information
├── GET /me                        # Get current user profile
├── PUT /update                    # Update user profile
├── PUT /interests                 # Update interests
├── PUT /languages                 # Update languages
├── PUT /hobbies                   # Update hobbies
├── PUT /sports                    # Update sports
├── PUT /film                      # Update film preferences
├── PUT /music                     # Update music preferences
├── PUT /travel                    # Update travel preferences
├── POST /toggle-online-status     # Toggle online status
├── POST /upload-image             # Upload user images
├── POST /upload-video             # Upload user video
├── DELETE /images/:imageId        # Delete user image
├── GET /browse-males              # Browse male users
├── DELETE /delete                 # Delete user account
├── GET /me/balance                # Get balance information
└── GET /me/withdrawals            # Get withdrawal history

/common/
├── POST /chat/start               # Start chat with another user
├── GET /chat/rooms                # Get user's chat rooms
├── GET /chat/:roomId/messages     # Get messages for a chat room
├── POST /chat/send                # Send a message
├── DELETE /chat/message/:messageId # Delete message for user
├── DELETE /chat/message/:messageId/delete-for-everyone # Delete message for everyone
├── POST /chat/:roomId/disappearing # Enable disappearing messages
└── POST /chat/upload              # Upload media file
└── POST /chat/upload              # Upload media file

/female-user/chat/
├── POST /send-message             # Send chat message
└── GET /chat-history              # Get chat history

/female-user/earnings/
├── GET /                          # Get earnings
└── GET /stats                     # Get earnings stats

/female-user/gifts/
├── GET /received                  # Get received gifts
└── GET /stats                     # Get gift statistics

/female-user/kyc/
├── POST /submit                   # Submit KYC
└── POST /verify                   # Verify KYC

/female-user/withdrawals/
├── GET /                          # Get withdrawal requests
└── POST /request                  # Request withdrawal

/female-user/blocklist/
├── POST /block                    # Block user
├── POST /unblock                  # Unblock user
└── GET /block-list                # Get block list

/female-user/favourites/
├── POST /add/:userId              # Add to favourites
├── POST /remove/:userId           # Remove from favourites
└── GET /                          # Get favourites list

/female-user/follow-requests/
├── GET /received                  # Get received follow requests
├── GET /sent                      # Get sent follow requests
├── POST /send/:userId             # Send follow request
├── POST /accept/:requestId        # Accept follow request
└── POST /reject/:requestId        # Reject follow request
```

### Male User Routes
```
/male-user/
├── POST /register                 # Register new male user
├── POST /login                    # Login (sends OTP)
├── POST /verify-login-otp         # Verify login OTP
├── POST /verify-otp               # Verify registration OTP
├── POST /complete-profile         # Complete user profile
├── GET /me                        # Get current user profile
├── PUT /update                    # Update user profile
├── PUT /interests                 # Update interests
├── PUT /languages                 # Update languages
├── GET /browse-females            # Browse female users
├── GET /me/balance                # Get balance information
├── GET /me/transactions           # Get transaction history
├── POST /call/:femaleUserId       # Initiate call
├── POST /end-call/:callId         # End call
├── DELETE /delete                 # Delete user account

/male-user/chat/
├── POST /send-message             # Send chat message
└── GET /chat-history              # Get chat history

/male-user/gifts/
├── POST /send                     # Send gift
└── GET /sent                      # Get sent gifts

/male-user/payment/
├── POST /add-coins                # Add coins via payment
├── GET /payment-history           # Get payment history
└── POST /validate                 # Validate payment

/male-user/profile/
├── GET /:userId                   # Get specific user profile
├── GET /search                    # Search users
└── PUT /settings                  # Update profile settings

/male-user/favourites/
├── POST /add/:userId              # Add to favourites
├── POST /remove/:userId           # Remove from favourites
└── GET /                          # Get favourites list

/male-user/blocklist/
├── POST /block/:userId            # Block user
├── POST /unblock/:userId          # Unblock user
└── GET /                          # Get block list

/common/
├── POST /chat/start               # Start chat with another user
├── GET /chat/rooms                # Get user's chat rooms
├── GET /chat/:roomId/messages     # Get messages for a chat room
├── POST /chat/send                # Send a message
├── DELETE /chat/message/:messageId # Delete message for user
├── DELETE /chat/message/:messageId/delete-for-everyone # Delete message for everyone
├── POST /chat/mark-as-read        # Mark message(s) as read
├── DELETE /chat/room/:roomId      # Delete chat for user
├── DELETE /chat/room/:roomId/clear # Clear chat messages
├── POST /chat/:roomId/disappearing # Toggle disappearing messages
├── GET /chat/uploads              # Get user's uploaded media files
└── POST /chat/upload              # Upload media file
```

### Agency Routes
```
/agency/
├── POST /register                 # Register new agency
├── POST /verify-otp               # Verify registration OTP
├── POST /login                    # Login (sends OTP)
├── POST /verify-login-otp         # Verify login OTP
├── GET /me                        # Get current agency profile
├── PUT /details                   # Update agency details
├── POST /upload-image             # Upload agency image

/agency/kyc/
├── POST /submit                   # Submit agency KYC
├── GET /status                    # Get KYC status
└── PUT /update                    # Update KYC information

/agency/withdrawals/
├── GET /                          # Get withdrawal requests
├── POST /request                  # Request withdrawal
└── GET /history                   # Get withdrawal history
```

## Workflow & Business Logic

### Registration Workflow
1. **User Registration**: User provides email/mobile and receives OTP
2. **OTP Verification**: User verifies OTP to activate account
3. **Profile Completion**: User completes profile with personal information
4. **Admin Review**: Profile goes under admin review (pending status)
5. **Approval Process**: Admin approves/rejects the registration
6. **Account Activation**: Approved users can access full features

### Chat Workflow
1. **Follow Request**: Male user sends follow request to female user
2. **Follow Acceptance**: Female user accepts the follow request
3. **Chat Initiation**: Male user initiates chat after follow acceptance
4. **Real-time Messaging**: Messages sent with WebSocket delivery
5. **Media Sharing**: Files uploaded to Cloudinary with URL references
6. **Read Receipts**: Messages marked as read with bulk processing
7. **Message Deletion**: Options for individual or group deletion
8. **Privacy Controls**: Clear chat or delete entire conversation

### Economic System
- **Coins vs Wallet Balance**:
  - **CoinBalance**: Virtual coins for spending (calls, gifts, premium features) - not withdrawable
  - **WalletBalance**: Real money earnings for female users - fully withdrawable
- **Conversion Rate**: Configurable admin setting for coin-to-rupee conversion
- **Minimum Withdrawal**: Configurable minimum amount for withdrawals
- **Male Users**: Buy coins and spend them, rarely earn in wallet
- **Female Users**: Earn money in wallet from calls/gifts, can withdraw earnings

### Referral System
- **Referral Codes**: Auto-generated unique codes for each user
- **Bonus Distribution**: Both referrer and new user receive bonus upon registration completion
- **Admin Configurable**: Bonus amount managed by admin (default: 100 coins)
- **Destination Logic**: 
  - Male referrers: Bonus goes to `coinBalance` (spending coins)
  - Female referrers: Bonus goes to `walletBalance` (withdrawable coins)
  - Agency referrers: Bonus goes to `walletBalance` (withdrawable coins)
- **Transaction Logging**: All referral bonuses are recorded as transactions

### Reward System
- **Daily Rewards**: Based on wallet balance thresholds set by admin
- **Weekly Rankings**: Performance-based rewards for top-earning female users
- **Automatic Calculation**: Scheduled jobs calculate rewards based on earnings
- **Admin Approval**: Rewards require admin verification before distribution
- **Rank-based Rewards**: Different rewards for different ranking positions

### KYC Process
- **Multiple Verification Methods**: Bank account details, UPI ID, etc.
- **Staff Review**: Admin/staff review of submitted documents
- **Status Tracking**: Multiple status levels (pending, approved, rejected)
- **Document Security**: Secure storage of sensitive information
- **Structured Data**: KYC details stored with verification timestamps

### Call System
- **Coin Deduction**: Real-time coin deduction during calls at configurable rate
- **Rate Configuration**: Admin-configurable coins-per-second rate per female user
- **Earning Distribution**: Money earned goes to female user's wallet balance
- **Call Statistics**: Detailed tracking of call duration, earnings, and missed calls
- **Minimum Call Coins**: Configurable minimum coin requirement to start a call
- **Male Spending**: Coins deducted from male user's coin balance
- **Female Earning**: Equivalent rupee amount added to female user's wallet balance

### Gifting System
- **Gift Store**: Admin-managed gift catalog with coin values and images
- **Real-time Deduction**: Coins deducted immediately when gift sent
- **Earning Distribution**: Gift value credited to receiver's wallet balance
- **History Tracking**: Complete transaction history for both sender and receiver
- **Gift Categories**: Different gift types with varying coin values
- **Transaction Logging**: All gift transactions recorded with sender/receiver details

### Withdrawal System
- **KYC Requirement**: Users must have approved KYC to withdraw
- **Minimum Threshold**: Configurable minimum withdrawal amount
- **Conversion Rate**: Coin-to-rupee conversion applied automatically
- **Multiple Methods**: Support for bank transfers and UPI
- **Admin Review**: Withdrawal requests require admin approval
- **Transaction History**: Complete withdrawal history tracking

## Database Models

### Admin Models
- **AdminUser**: Super admin accounts with full access
- **Staff**: Staff members with limited permissions
- **Interest**: User interests with titles and images
- **Language**: User languages with titles
- **Gift**: Gift items with coin values and images
- **FAQ**: Frequently asked questions
- **Plan**: Subscription plans
- **Package**: Coin packages
- **Page**: Static content pages
- **Religion**: Religious preferences
- **RelationGoal**: Relationship goals
- **AdminConfig**: System configuration settings
- **AuditLog**: System activity logs

### Female User Models
- **FemaleUser**: Core female user data with balances and preferences
- **FemaleImage**: User-uploaded images
- **Chat**: Chat messages between users
- **Earnings**: Earning history and statistics
- **Favourites**: Favorite user relationships
- **Followers/Following**: Social connection tracking
- **GiftReceived**: Received gift history
- **KYC**: KYC verification documents and status
- **Reward**: Reward history and statistics
- **BlockList**: Blocked user relationships

### Male User Models
- **MaleUser**: Core male user data with balances
- **MaleImage**: User-uploaded profile images
- **Chat**: Chat messages between users
- **Favourites**: Favorite user relationships
- **Followers/Following**: Social connection tracking
- **Payment**: Payment transaction history
- **Package**: Purchased coin packages
- **BlockList**: Blocked user relationships

### Agency Models
- **AgencyUser**: Agency business accounts
- **KYC**: Agency KYC verification
- **Image**: Agency profile images

### Common Models
- **CallHistory**: Call session records
- **Transaction**: Financial transaction history
- **WithdrawalRequest**: Withdrawal request tracking
- **FollowRequest**: Follow request management
- **PendingReward**: Pending reward calculations
- **ChatRoom**: Chat room with participants and metadata
- **Message**: Individual chat messages with read receipts and deletion status

## Security & Middleware

### Authentication Middleware
- **JWT-based**: Secure token-based authentication
- **Route-based Detection**: Automatically detects user type from URL
- **Token Validation**: Verifies token validity and expiration
- **User Loading**: Loads user data into request object

### Authorization Middleware
- **Role-based Permissions**: Different access levels for admin/staff
- **Dynamic Permissions**: Configurable module-level permissions
- **Permission Checking**: Validates user permissions for specific actions

### Security Features
- **OTP Verification**: Multi-step authentication process
- **Password Hashing**: Bcrypt for secure password storage
- **Input Validation**: Request validation and sanitization
- **Rate Limiting**: Protection against abuse
- **CORS Configuration**: Secure cross-origin requests

### Error Handling
- **Centralized Error Middleware**: Global error handling
- **Validation Errors**: Proper error responses for invalid inputs
- **Database Errors**: Handling of database-related issues
- **Authentication Errors**: Proper handling of auth failures