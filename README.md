# ⚡ Webhook Mailer

> **Your Self-Hosted Webhook-to-Email Gateway.**  
> Effortlessly turn incoming JSON webhooks into beautifully formatted emails.

![Webhook Mailer Banner](https://via.placeholder.com/1200x400?text=Webhook+Mailer+Dashboard)

---

## 🚀 Overview

**Webhook Mailer** is a powerful, lightweight, and self-hosted tool designed to bridge the gap between modern applications and your inbox. Whether you're receiving alerts from monitoring tools, form submissions, or system notifications, Webhook Mailer captures the payload and forwards it via SMTP using your custom templates.

Stop relying on rigid third-party integrations. Take control of your notifications with a privacy-focused, customizable solution.

## ✨ Features

-   **🎯 Universal Webhook Endpoint:** Accept JSON payloads from any source (GitHub, Stripe, Typeform, Custom Apps).
-   **📧 Email Park (SMTP Manager):** Manage multiple SMTP profiles (Gmail, SendGrid, Mailgun, etc.) in one place.
-   **🎨 Dynamic Templates:** Use Handlebars-like syntax (`{{user.email}}`, `{{event.id}}`) to map webhook data directly into your email subject and body.
-   **📝 HTML & Plain Text Support:** Send rich HTML emails or simple text alerts.
-   **📊 Automation Logs:** detailed history of received webhooks and sent emails, complete with success/failure statuses and error logs.
-   **🔒 Secure Access:** Simple PIN-based authentication to protect your dashboard.
-   **🛠️ Built-in Testing:** Send test emails directly from the editor using captured payload data.

---

## 🛠️ Installation & Setup

### Prerequisites

-   Node.js (v18+ recommended)
-   NPM

### Quick Start

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/yourusername/webhook-mailer.git
    cd webhook-mailer
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment**
    Create a `.env` file in the root directory:
    ```env
    HOST=http://localhost:3000
    ```

4.  **Start the Server**
    ```bash
    npm start
    ```

    The application will run at [http://localhost:3000](http://localhost:3000).

---

## 🔐 Authentication

By default, the application is protected by a PIN.

-   **Default PIN:** `1234`

To change the PIN, run the initialization script:

```bash
npm run init-pin
# Follow the prompts to set a new 4-digit PIN
```

---

## 📖 Usage Guide

### 1. Configure "Email Park"
Navigate to the **Email Park** tab to add your SMTP senders.
-   Supports standard SMTP (Host, Port, User, Pass).
-   Secure connection options (StartTLS/SSL).
-   Test connection button ensures your credentials work before use.

### 2. Create a Webhook
1.  Go to the **Dashboard** and click **Create Webhook**.
2.  Give it a name (e.g., "Contact Form Submission").
3.  You will get a unique **Webhook URL** (e.g., `.../webhooks/uuid`).

### 3. Send Data & Map Variables
1.  Send a POST request to your new URL (or use the "Test Data" -> "Add Manual Payload" feature in the editor).
2.  The editor will automatically discover variables from the JSON payload.
3.  **Click to Copy** variables from the list and paste them into your **Subject** or **Body**.

    *Example:*
    > **Subject:** New Order #{{order.id}} from {{customer.name}}
    >
    > **Body:**
    > Hello,
    > You received a payment of {{payment.amount}} {{payment.currency}}.

### 4. Activate
Once your template is ready, switch the status from **Draft** to **Active**. Incoming webhooks will now automatically trigger emails!

---

## 📦 Tech Stack

-   **Backend:** Node.js, Express.js
-   **Database:** LowDB (Local JSON file storage)
-   **Frontend:** Vanilla JavaScript (ES Modules), CSS3 Variables
-   **Email:** Nodemailer

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📄 License

This project is licensed under the ISC License.
