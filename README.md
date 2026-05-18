# HireTrack

## Email configuration

Local development can use Gmail SMTP:

```env
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password
EMAIL_FROM=HireTrack <your_email@gmail.com>
```

For Render or other hosts that block SMTP ports, use an HTTPS provider instead:

```env
EMAIL_PROVIDER=resend
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=HireTrack <your_verified_sender@yourdomain.com>
```
