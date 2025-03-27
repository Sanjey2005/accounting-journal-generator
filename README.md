# Accounting Journal Generator

## Overview
The Accounting Journal Generator is a web application built with Flask (Python) that allows users to generate accounting journals and ledgers from initial balances and transaction entries. It features natural language processing (NLP) to parse transaction descriptions, supports Indian numbering formats (e.g., "2,00,000"), and provides options to download the journal as PDF or Excel files.

This project is designed for small businesses, accounting students, or professionals who need a simple tool to create and manage accounting records.

---

## Features
- **Initial Balances**: Add debit and credit balances for accounts.
- **Transaction Entry**:
  - Manually enter transactions with date, description, debit/credit accounts, and amounts.
  - Parse transactions using NLP (e.g., "Purchased goods for ₹5000 in cash").
- **Journal and Ledger Generation**:
  - Generate a journal with all transactions.
  - Create ledgers for each account with opening balances, transactions, and closing balances.
- **Download Options**:
  - Download the journal as a PDF or Excel file.
- **Responsive Design**: Works on both desktop and mobile devices.
- **Indian Numbering Support**: Handles amounts in the Indian format (e.g., "2,00,000" for 200,000).

---

## Project Structure
```
Accounting-Journal-Generator/
│
├── app.py                  # Flask backend with NLP transaction parsing
├── static/
│   ├── script.js           # JavaScript for frontend logic (journal/ledger generation, downloads)
│   └── styles.css          # CSS for styling the application
├── templates/
│   └── index.html          # HTML template for the frontend
└── README.md               # Project documentation (this file)
```

---

## Prerequisites
Before running the project, ensure you have the following installed:
- **Python 3.6+**
- **Git** (to clone the repository)
- **pip** (Python package manager)

---

## Setup Instructions

### 1. Clone the Repository
Clone the project from GitHub:
```bash
git clone https://github.com/Sanjey2005/accounting-journal-generator.git
cd accounting-journal-generator
```

### 2. Create a Virtual Environment (Optional but Recommended)
Set up a virtual environment to manage dependencies:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 3. Install Dependencies
Install the required Python packages listed in `app.py`:
```bash
pip install flask flask-cors spacy python-dateutil
```

Additionally, download the spaCy English language model:
```bash
python -m spacy download en_core_web_sm
```

### 4. Run the Application
Start the Flask server:
```bash
python app.py
```

The application will run on `http://localhost:5000`. Open this URL in your browser to access the Accounting Journal Generator.

---

## Usage

### 1. Add Initial Balances
- Under "Initial Balances," add debit and credit balances for accounts (e.g., Cash, Capital).
- Click "Add Debit Balance" or "Add Credit Balance" to add more entries.
- Enter the account name and amount (e.g., "Cash" with "10,00,000").

### 2. Add Transactions
- **Using NLP**:
  - In the "Transactions" section, enter a transaction description (e.g., "Purchased goods for ₹5000 in cash").
  - Click "Parse Transaction" to automatically fill in the transaction details.
- **Manually**:
  - Click "Add Transaction" to manually enter a transaction.
  - Fill in the date, description, debit account, debit amount, credit account, and credit amount.

### 3. Generate Journal and Ledgers
- Click "Generate Journal and Ledgers" to create the journal and ledgers based on your inputs.
- The journal will display all transactions with dates, account titles, and debit/credit amounts.
- Ledgers will be generated for each account, showing opening balances, transactions, and closing balances.

### 4. Download the Journal
- After generating, use the "Download Options" to:
  - Download the journal as a PDF (`Download Journal as PDF`).
  - Download the journal as an Excel file (`Download Journal as Excel`).

---

## Example
1. **Initial Balances**:
   - Debit: Cash A/c - ₹10,00,000
   - Credit: Capital A/c - ₹10,00,000
2. **Transaction**:
   - Enter: "Purchased goods for ₹2,00,000 in cash on 2025-03-27"
   - Parse or manually enter the transaction.
3. **Generate**:
   - Click "Generate Journal and Ledgers."
   - View the journal entry: "Purchase A/c Dr ₹2,00,000, To Cash A/c ₹2,00,000."
   - View ledgers for Purchase A/c and Cash A/c with updated balances.
4. **Download**:
   - Download the journal as a PDF or Excel file.

---

## Dependencies
- **Backend**:
  - Flask: Web framework for Python.
  - Flask-CORS: Handles Cross-Origin Resource Sharing.
  - spaCy: NLP library for transaction parsing.
  - python-dateutil: For robust date parsing.
- **Frontend**:
  - jsPDF: For generating PDF downloads.
  - SheetJS (xlsx): For generating Excel downloads.
  - jsPDF-AutoTable: For table formatting in PDFs.

These are included via CDN in `index.html`:
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.17.5/xlsx.full.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.15/jspdf.plugin.autotable.min.js"></script>
```

---

## Notes
- The application uses the Indian numbering system for amounts (e.g., "2,00,000" is parsed as 200,000).
- NLP parsing may not handle all transaction descriptions perfectly. Manual entry is available as a fallback.
- The application runs in debug mode (`app.run(debug=True)`). For production, consider using a WSGI server like Gunicorn and setting `debug=False`.

---

## Troubleshooting
- **"ModuleNotFoundError"**:
  - Ensure all dependencies are installed (`flask`, `flask-cors`, `spacy`, `python-dateutil`).
  - Verify the spaCy model is downloaded: `python -m spacy download en_core_web_sm`.
- **"Port 5000 in Use"**:
  - Change the port in `app.py` (e.g., `app.run(debug=True, port=5001)`).
- **Download Buttons Not Working**:
  - Ensure your browser allows popups and has an active internet connection (CDN scripts are used for downloads).
- **NLP Parsing Issues**:
  - Check the console logs in your browser (F12 > Console) for errors.
  - Use manual transaction entry if NLP fails.

---

## Contributing
Contributions are welcome! To contribute:
1. Fork the repository.
2. Create a new branch (`git checkout -b feature/your-feature`).
3. Make your changes and commit (`git commit -m "Add your feature"`).
4. Push to your branch (`git push origin feature/your-feature`).
5. Open a pull request on GitHub.

---

## Author
- **Sanjey2005** - [GitHub Profile](https://github.com/Sanjey2005)

