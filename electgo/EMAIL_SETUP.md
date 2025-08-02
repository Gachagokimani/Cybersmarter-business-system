# Email Functionality Setup Guide

## Overview
CyberSmater includes comprehensive email functionality for sending reports, alerts, and notifications.

## Features
- ✅ **Sales Reports** - Email sales data and revenue reports
- ✅ **Expense Reports** - Email expense summaries and breakdowns
- ✅ **Inventory Alerts** - Low stock and out-of-stock notifications
- ✅ **Daily Summaries** - Automated daily business summaries
- ✅ **Test Emails** - Verify email configuration

## Setup Instructions

### 1. Gmail Configuration
To use Gmail for sending emails:

1. **Enable 2-Factor Authentication**
   - Go to your Google Account settings
   - Enable 2-factor authentication

2. **Generate App Password**
   - Go to Google Account → Security
   - Find "App passwords" under 2-Step Verification
   - Generate a new app password for "Mail"
   - Copy the 16-character password

3. **Create Environment File**
   Create a `.env.local` file in the root directory:
   ```
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-16-character-app-password
   ```

### 2. Email API Endpoints

#### Send Report (`/api/send-report`)
```javascript
POST /api/send-report
{
  "email": "recipient@example.com",
  "reportData": [...],
  "reportType": "sales" | "expenses" | "inventory" | "revenue",
  "dateRange": {
    "start": "2024-01-01",
    "end": "2024-01-31"
  }
}
```

#### Send Email (`/api/email`)
```javascript
POST /api/email
{
  "to": "recipient@example.com",
  "subject": "Email Subject",
  "type": "notification" | "alert" | "report" | "summary",
  "data": {
    "title": "Title",
    "message": "Message content"
  }
}
```

#### Inventory Alert (`/api/email/inventory-alert`)
```javascript
POST /api/email/inventory-alert
{
  "email": "recipient@example.com",
  "alerts": [
    {
      "itemName": "Product Name",
      "currentQuantity": 2,
      "threshold": 5,
      "category": "Electronics"
    }
  ]
}
```

### 3. Email Templates

#### Sales Report Template
- Professional HTML formatting
- Brand colors (Sea Blue & Burgundy)
- Revenue calculations
- Date range support

#### Inventory Alert Template
- Urgent styling for alerts
- Stock level indicators
- Action recommendations
- Color-coded status

#### Notification Template
- Clean, professional design
- Responsive layout
- Brand consistency

### 4. Frontend Integration

#### Email Settings Component
```jsx
import EmailSettings from './components/EmailSettings';

// Usage
<EmailSettings />
```

#### Send Report from Sales Page
```javascript
const sendReport = async () => {
  const response = await fetch('/api/send-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: emailAddress,
      reportData: salesData,
      reportType: 'sales'
    })
  });
};
```

### 5. Error Handling

The email system includes comprehensive error handling:

- **Invalid Email Format** - Validates email addresses
- **Missing Credentials** - Checks for environment variables
- **Network Timeouts** - 30-second timeout protection
- **Authentication Errors** - Gmail-specific error messages
- **Rate Limiting** - Handles Gmail sending limits

### 6. Security Considerations

- ✅ **App Passwords** - Uses Gmail app passwords, not regular passwords
- ✅ **Environment Variables** - Credentials stored in environment files
- ✅ **Input Validation** - Email format and content validation
- ✅ **Error Logging** - Comprehensive error logging without exposing credentials

### 7. Testing

#### Test Email Function
```javascript
// Send a test email to verify configuration
const testEmail = async () => {
  const response = await fetch('/api/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: 'test@example.com',
      subject: 'Test Email',
      type: 'notification',
      data: {
        title: 'Test',
        message: 'This is a test email'
      }
    })
  });
};
```

### 8. Troubleshooting

#### Common Issues:

1. **"Email service not configured"**
   - Check that `.env.local` file exists
   - Verify `EMAIL_USER` and `EMAIL_PASSWORD` are set

2. **"Authentication failed"**
   - Ensure 2-factor authentication is enabled
   - Use app password, not regular password
   - Check that app password is correct

3. **"Email timeout"**
   - Check internet connection
   - Verify Gmail service is accessible
   - Try again in a few minutes

4. **"Failed to send email"**
   - Check Gmail sending limits
   - Verify recipient email is valid
   - Check spam folder

### 9. Advanced Configuration

#### Custom Email Templates
You can create custom email templates by modifying the `generateEmailContent` function in `/api/email/route.ts`.

#### Multiple Email Providers
To use other email providers (SendGrid, Mailgun, etc.), modify the transporter configuration in the email API files.

#### Automated Scheduling
For automated emails, you can set up cron jobs or use services like Vercel Cron to trigger email sending at scheduled intervals.

## Support

For email functionality support:
1. Check the troubleshooting section above
2. Verify your Gmail configuration
3. Test with the test email function
4. Check server logs for detailed error messages 