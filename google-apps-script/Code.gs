/* =============================================================
   LATAWA REAL ESTATE — Contact Form → Google Sheet + Auto-Reply

   SETUP:
   1. Create a new Google Sheet (sheets.new).
   2. Extensions -> Apps Script. Delete the sample code and paste
      this entire file in.
   3. Update NOTIFY_EMAIL below to the inbox that should receive
      new-lead notifications.
   4. Deploy -> New deployment -> type "Web app".
        Execute as:      Me
        Who has access:  Anyone
   5. Authorize when prompted (Advanced -> Go to project -> Allow).
   6. Copy the Web App URL (ends in /exec) and paste it into
      GOOGLE_SHEETS_ENDPOINT near the top of components/loader.js
      on the website.

   Every submission from either contact form on the site (homepage
   or /contact-us/) lands here, gets a row in the "Leads" tab, and
   triggers two emails: an auto-reply to the visitor (if they gave
   an email) and a notification to NOTIFY_EMAIL.
   ============================================================= */

const NOTIFY_EMAIL = 'info@latawarealestate.com'; // <- where new-lead alerts go
const SHEET_NAME = 'Leads';                        // <- tab name in the spreadsheet

function doPost(e) {
  try {
    const data = e.parameter;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Timestamp', 'Name', 'Phone', 'Email', 'Source Page', 'Interest / Type', 'Budget', 'Location', 'Message']);
    }

    sheet.appendRow([
      new Date(),
      data.name || '',
      data.phone || '',
      data.email || '',
      data.source_page || '',
      data.interest || data.enquiry_type || '',
      data.budget || '',
      data.location_pref || '',
      data.message || ''
    ]);

    if (data.email) {
      MailApp.sendEmail({
        to: data.email,
        subject: 'Thanks for reaching out — Latawa Real Estate',
        body: 'Hi ' + (data.name || 'there') + ',\n\n'
          + "Thank you for contacting Latawa Real Estate. We've received your enquiry and "
          + 'Inder or Vivek Latawa will get back to you personally within a few hours.\n\n'
          + 'Your message:\n"' + (data.message || '(no message provided)') + '"\n\n'
          + 'In the meantime, feel free to call us directly:\n'
          + '+91 98885 00421 (Inder)\n'
          + '+91 98149 78768 (Vivek)\n\n'
          + 'Warm regards,\n'
          + 'Latawa Real Estate\n'
          + 'www.latawarealestate.com'
      });
    }

    MailApp.sendEmail({
      to: NOTIFY_EMAIL,
      subject: 'New Website Enquiry — ' + (data.name || 'Unknown'),
      body: 'New enquiry received:\n\n'
        + 'Name: ' + (data.name || '') + '\n'
        + 'Phone: ' + (data.phone || '') + '\n'
        + 'Email: ' + (data.email || '') + '\n'
        + 'Source Page: ' + (data.source_page || '') + '\n'
        + 'Interest / Type: ' + (data.interest || data.enquiry_type || '') + '\n'
        + 'Budget: ' + (data.budget || '') + '\n'
        + 'Location: ' + (data.location_pref || '') + '\n'
        + 'Message: ' + (data.message || '') + '\n\n'
        + 'Submitted: ' + new Date()
    });

    return ContentService.createTextOutput(JSON.stringify({ result: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ result: 'error', error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
