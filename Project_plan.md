Got it 👍
Below is a **clean, non-technical Project Plan** that focuses **only on the user flow and product behavior**, not implementation, code, or tech stack.

---

# Project Plan — Webhook to Email Notification App

*(Flow-Focused, Non-Technical)*

---

## 1. Purpose

This application allows users to:

* Create custom webhook URLs
* Send test data to those webhooks
* Use real webhook data to build email content
* Automatically send emails when the webhook receives data

The system ensures every webhook is **tested, verified, and functional before activation**.

---

## 2. User Journey Overview

```
Login
  ↓
Dashboard
  ↓
Create Webhook
  ↓
Send Test Payload
  ↓
Build Email Using Test Data
  ↓
Test Email Sending
  ↓
Save & Activate Webhook
```

---

## 3. Login Flow

1. User opens the app
2. User logs in using a PIN
3. Successful login redirects to the dashboard

---

## 4. Dashboard Structure

The dashboard contains two main menus:

* **Webhooks**
* **Email Park**

---

## 5. Email Park Flow (Preparation Step)

Before activating a webhook, the user must have at least one email sender.

**Email Park allows users to:**

* Add sender email information
* Give the sender a recognizable name
* Select which sender will be used for outgoing emails

If no Email Park exists, the system will prompt the user to create one before continuing.

---

## 6. Webhook Creation Flow

### Step 1: Create Webhook (Draft)

User provides:

* Webhook name
* Custom webhook URL (or auto-generated)

Webhook is created in **Draft** status
No email will be sent yet.

---

### Step 2: Test Webhook URL

The system shows the webhook endpoint and waits for incoming data.

User sends a **test webhook request** containing a JSON payload.

Once received:

* The payload is captured
* The payload becomes the **test data**
* The system allows the user to proceed

Webhook cannot continue without receiving test data.

---

## 7. Payload Inspection & Variable Discovery

After test data is received:

* The system analyzes the payload
* All available fields are listed as usable variables
* Nested data is shown using dot notation (example: `invoice.name`)
* Fields that are arrays are clearly marked

This allows users to understand **what data can be used in emails**.

---

Here is a **deeper, clearer explanation of Section 8 only**, written in **product / flow language**, not technical.

---

## 8. Email Construction Flow (Detailed Explanation)

This step allows the user to **design the email exactly as it will be sent**, using real data from the webhook test payload.

The email is built **after** test data is received, so users never guess variable names — they use confirmed data.

---

### 8.1 Purpose of This Step

The Email Construction step ensures that:

* Email content matches the webhook data structure
* Variables are valid and available
* The final email is predictable and correct
* Multiple recipients can be handled safely

This step transforms **raw webhook data** into a **human-readable email**.

---

### 8.2 Email Configuration Sections

#### 1. Email Park (Sender Selection)

The user selects **which sender identity** will be used:

* Sender name
* Sender email address

If no Email Park is selected:

* The system blocks progress
* The user is instructed to create or select one

This guarantees every email has a valid sender.

---

#### 2. Email Format Selection

The user chooses how the email content is rendered:

* **Plain Text**

  * Simple text only
  * Variables are replaced with text values
  * Best for system notifications

* **HTML**

  * Supports formatting (bold, links, layout)
  * Variables are injected into HTML
  * Best for branded or structured emails

This choice affects **how the body is written**, not the data itself.

---

### 8.3 Using Variables in Email Content

#### What Are Variables?

Variables represent values from the webhook test payload.

Each variable:

* Comes directly from received test data
* Has a known structure and type
* Is safe to use because it was already validated

---

#### Variable Syntax

Variables are written using double curly braces:

```
{{variable}}
```

Examples:

* `{{name}}`
* `{{email}}`
* `{{invoice.name}}`

---

#### Variable Types and Meaning

##### Simple Values

```json
{
  "name": "John"
}
```

Usage:

```
Hello {{name}}
```

Result:

```
Hello John
```

---

##### Nested Values

```json
{
  "invoice": {
    "name": "INV-001"
  }
}
```

Usage:

```
Invoice Number: {{invoice.name}}
```

Result:

```
Invoice Number: INV-001
```

---

##### Array Values (Important)

```json
{
  "email": ["a@mail.com", "b@mail.com"]
}
```

Usage:

```
To: {{email}}
```

Behavior:

* All emails in the array are used
* The message is sent to every address
* No manual duplication needed

This allows **one webhook to notify many recipients**.

---

### 8.4 Subject Line Construction

The subject field supports variables just like the body.

Example:

```
New Booking from {{name}}
```

Using test data ensures:

* Subject is always populated
* No empty or broken subjects

---

### 8.5 Body Construction

The email body is where most variables are used.

Users can:

* Mix static text with variables
* Use multiple variables in one message
* Write content exactly how recipients will see it

Example:

```
Hello Admin,

You have received a new booking.

Customer: {{name}}
Invoice: {{invoice.name}}
```

---

### 8.6 Variable Validation Rules

Before allowing the user to continue:

* All variables used must exist in test payload
* Invalid or unknown variables are highlighted
* Missing required values trigger warnings

This prevents:

* Broken emails
* Empty content
* Runtime failures

---

### 8.7 Preview & Confidence

While editing, the system:

* Shows a live preview using test data
* Displays final resolved values
* Makes it clear how the email will look when sent

By the end of this step, the user should feel:

> “This email will be sent exactly like this.”

---

### 8.8 Exit Criteria for This Step

The user can only proceed if:

* Email Park is selected
* Subject is valid
* Body is valid
* All variables are resolvable

Only then can the user move to **Test Email Sending**.

---

### Summary

The Email Construction Flow is where:

* Data becomes communication
* Raw JSON turns into readable email
* Errors are caught early
* Confidence is built before activation

This step ensures **every active webhook sends meaningful, correct emails**.


---

## 9. Recipient Handling Rules

* If a variable contains a single email → send to one recipient
* If a variable contains multiple emails (array) → send to all
* If recipient data is missing or empty → system blocks sending and shows an error

---

## 10. Test Email Sending

Before saving the webhook:

1. The system uses the test payload
2. The email is rendered exactly as it would be in real usage
3. A test email is sent

Results:

* **Success** → user may continue
* **Failure** → user must fix errors before saving

Webhook cannot be saved without a successful test email.

---

## 11. Save & Activate Webhook

After successful testing:

* Webhook is saved
* Status changes from **Draft** to **Active**
* Configuration is locked unless edited

The webhook is now live.

---

## 12. Live Webhook Behavior

Once active:

* Every incoming webhook request:

  * Uses the saved email template
  * Extracts required fields from payload
  * Sends email automatically
  * Handles multiple recipients if present

No further user interaction is required.

---

## 13. Logging & Visibility

The system records:

* Webhook test attempts
* Test email results
* Live webhook executions
* Email delivery success or failure

Logs are viewable from the dashboard.

---

## 14. Key Product Rules

* Webhooks must be tested before activation
* Emails must be test-sent successfully
* Real payload data is used for template creation
* Array data is supported for multiple recipients
* No active webhook exists without verification

---

## 15. Outcome

This flow ensures:

* Reliability
* Predictable behavior
* No broken webhooks
* No failed emails in production

The user always knows:

> “If it saved, it works.”

---

If you want, next I can:

* Turn this into a **product spec**
* Create **UX wireframe flow**
* Write **user-facing documentation**
* Or help define **v1 / v2 features**

Just tell me which one.
