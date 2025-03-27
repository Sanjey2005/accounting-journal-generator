import flask
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import spacy
import re
from datetime import datetime
from dateutil import parser as date_parser  # For robust date parsing

app = Flask(__name__, 
            static_folder='static',
            template_folder='templates')
CORS(app)

# Load English language model
nlp = spacy.load("en_core_web_sm")

# Standard account name mapping
account_mapping = {
    "Rent Expense A/c": ["rent a/c", "shop rent a/c", "rental expense a/c", "rent", "shop rent", "lease a/c", "rent expense"],
    "Drawings A/c": ["drawings", "withdrawal", "personal withdrawal a/c", "owner's drawings a/c", "david's drawings a/c", "david", "david's capital a/c", "tom", "tom's drawings a/c"],
    "Cash A/c": ["cash", "cash in hand a/c", "cash account"],
    "Furniture A/c": ["furniture", "furniture a/c"],
    "Purchase A/c": ["purchase", "purchases", "goods", "stock"],
    "Revenue A/c": ["revenue", "sales", "income"],
    "Loan Payable A/c": ["loan payable", "loan", "borrowed"],
    "Capital A/c": ["capital", "owner's capital", "david's capital", "tom's capital"],
    "Creditors A/c": ["creditors", "accounts payable"],
    "Miscellaneous Expense A/c": ["expense a/c", "cash expense a/c", "general expense a/c", "expenses", "miscellaneous expense"]
}

def clean_date_string(date_str):
    """Remove ordinal suffixes (e.g., '30th' → '30') for easier parsing."""
    return re.sub(r'(\d+)(st|nd|rd|th)', r'\1', date_str)

def get_standard_account_name(input_name):
    """Maps an input account name to a standard account name."""
    input_name = input_name.lower().strip()
    for standard, variations in account_mapping.items():
        if input_name in variations:
            return standard
    print(f"Warning: Unrecognized account '{input_name}', defaulting to 'Miscellaneous Expense A/c'")
    return "Miscellaneous Expense A/c"

def extract_transaction_details(text):
    """
    Extract transaction details using spaCy NLP
    """
    doc = nlp(text.lower())
    
    transaction = {
        'date': None,
        'amount': None,
        'debit_account': None,
        'credit_account': None,
        'description': text
    }
    
    # Date extraction with spaCy and dateutil
    for ent in doc.ents:
        if ent.label_ == 'DATE':
            cleaned_date = clean_date_string(ent.text)
            try:
                transaction['date'] = date_parser.parse(cleaned_date).date()
                print(f"Successfully parsed date: {transaction['date']}")
                break
            except ValueError:
                print(f"Failed to parse date: {cleaned_date}")
    
    # Fallback: Use regex if spaCy misses the date
    if not transaction['date']:
        date_pattern = r'\b(\d{1,2})(st|nd|rd|th)? \w+ \d{4}\b|\w+ \d{1,2}, \d{4}'
        match = re.search(date_pattern, text)
        if match:
            date_str = match.group(0)
            cleaned_date = clean_date_string(date_str)
            try:
                transaction['date'] = date_parser.parse(cleaned_date).date()
                print(f"Fallback parsed date: {transaction['date']}")
            except ValueError:
                print(f"Failed fallback parsing: {cleaned_date}")
    
    # If still no date, default to today (but this should rarely happen now)
    if not transaction['date']:
        transaction['date'] = datetime.today().date()
        print(f"Date not found, defaulting to today: {transaction['date']}")

    # Amount extraction (fixed to handle Indian numbering system)
    amount_matches = re.findall(r'[$\£€₹]\s*(\d{1,3}(?:,\d{1,3})*(?:\.\d{1,2})?)', text)
    if amount_matches:
        amount = amount_matches[0].replace(',', '')  # Remove commas
        transaction['amount'] = float(amount)
        print(f"Parsed amount: {transaction['amount']}")
    else:
        all_numbers = re.findall(r'\b\d{1,3}(?:,\d{1,3})*(?:\.\d{1,2})?\b', text)
        date_text = ' '.join([ent.text for ent in doc.ents if ent.label_ == 'DATE']).lower()
        for num in all_numbers:
            if num.lower() not in date_text:
                num_cleaned = num.replace(',', '')  # Remove commas
                transaction['amount'] = float(num_cleaned)
                print(f"Parsed amount (fallback): {transaction['amount']}")
                break
    
    # Account and action inference
    accounts = []
    for ent in doc.ents:
        if ent.label_ in ['PERSON', 'ORG']:
            accounts.append(ent.text.title())  # Capitalize names
    
    # Comprehensive keyword-based account and action inference
    keywords = {
        'debit': [
            'paid', 'expense', 'spent', 'cost', 'charged', 
            'withdrew', 'deducted', 'used', 'donated', 'sent', 
            'transferred to', 'disbursed', 'expended', 'lost', 'owed'
        ],
        'credit': [
            'received', 'sale', 'sold', 'income', 'revenue', 'earned', 'gained', 
            'deposited', 'collected', 'credited', 'refunded', 'returned', 
            'reimbursed', 'transferred from', 'acquired', 'won', 'got'
        ],
        'borrowed': [
            'borrowed', 'loan from', 'lent by', 'took loan', 'financed by', 
            'advanced by', 'funded by', 'borrowed from'
        ],
        'invested': [
            'invested', 'capital', 'started business', 'contributed'
        ],
        'purchased': [
            'purchased', 'bought', 'acquired'
        ],
        'rent': [
            'rent', 'paid as rent', 'rental', 'lease'
        ],
        'withdrawn': [
            'withdrawn', 'withdrawal', 'drew', 'taken out', 'for his own use', 'for personal use'
        ]
    }
    
    # Context keywords for rent
    personal_rent_indicators = ['home', 'house', 'residence', 'personal', 'family']
    business_rent_indicators = ['shop', 'office', 'business', 'store', 'warehouse']
    
    for keyword_type, keyword_list in keywords.items():
        for keyword in keyword_list:
            if keyword in text.lower():
                if keyword_type == 'debit':
                    if 'paid' in text.lower() and accounts:
                        paid_index = text.lower().find('paid')
                        for account in accounts:
                            account_lower = account.lower()
                            if account_lower in text.lower()[paid_index:]:
                                transaction['debit_account'] = get_standard_account_name(account)
                                transaction['credit_account'] = get_standard_account_name('Cash')
                                transaction['description'] = f"Being amount paid to {account} for expenses"
                                break
                        if not transaction['debit_account']:
                            transaction['debit_account'] = get_standard_account_name(accounts[0] if accounts else 'Cash Expense')
                            transaction['credit_account'] = get_standard_account_name('Cash')
                            transaction['description'] = f"Being amount paid for expenses"
                    else:
                        transaction['debit_account'] = get_standard_account_name(accounts[0] if accounts else 'Cash Expense')
                        transaction['credit_account'] = get_standard_account_name('Cash')
                        transaction['description'] = f"Being amount paid for expenses"
                elif keyword_type == 'credit':
                    transaction['debit_account'] = get_standard_account_name('Cash')
                    transaction['credit_account'] = get_standard_account_name(accounts[0] if accounts else 'Revenue')
                    transaction['description'] = f"Being amount received from {accounts[0] if accounts else 'revenue'}"
                elif keyword_type == 'borrowed':
                    transaction['debit_account'] = get_standard_account_name('Cash')
                    transaction['credit_account'] = get_standard_account_name(accounts[0] if accounts else 'Loan Payable')
                    transaction['description'] = f"Being amount borrowed from {accounts[0] if accounts else 'loan payable'}"
                elif keyword_type == 'invested':
                    if accounts:
                        transaction['debit_account'] = get_standard_account_name('Cash')
                        transaction['credit_account'] = get_standard_account_name(f"{accounts[0]}'s Capital")
                        transaction['description'] = f"Being amount invested by {accounts[0]} as capital in the business"
                    else:
                        transaction['debit_account'] = get_standard_account_name('Cash')
                        transaction['credit_account'] = get_standard_account_name('Capital')
                        transaction['description'] = "Being amount invested as capital in the business"
                elif keyword_type == 'purchased':
                    purchased_item = None
                    for token in doc:
                        if token.text in ['furniture', 'goods', 'equipment', 'stock'] and token.pos_ == 'NOUN':
                            purchased_item = token.text.title()
                            break
                    if purchased_item:
                        transaction['debit_account'] = get_standard_account_name(purchased_item)
                    else:
                        transaction['debit_account'] = get_standard_account_name('Purchase')
                    
                    if 'cash' in text.lower():
                        transaction['credit_account'] = get_standard_account_name('Cash')
                        transaction['description'] = f"Being {purchased_item.lower() if purchased_item else 'goods'} purchased for cash"
                    elif 'credit' in text.lower():
                        transaction['credit_account'] = get_standard_account_name(accounts[0] if accounts else 'Creditors')
                        transaction['description'] = f"Being {purchased_item.lower() if purchased_item else 'goods'} purchased on credit"
                    else:
                        transaction['credit_account'] = get_standard_account_name('Cash')
                        transaction['description'] = f"Being {purchased_item.lower() if purchased_item else 'goods'} purchased"
                elif keyword_type == 'rent':
                    # Determine if rent is personal or business
                    is_personal_rent = any(indicator in text.lower() for indicator in personal_rent_indicators)
                    is_business_rent = any(indicator in text.lower() for indicator in business_rent_indicators)
                    
                    if is_personal_rent:
                        # Treat as personal expense (Drawings)
                        transaction['debit_account'] = get_standard_account_name(accounts[0] if accounts else 'Drawings')
                        transaction['credit_account'] = get_standard_account_name('Cash')
                        transaction['description'] = f"Being rent paid for the home, treated as personal expense"
                    elif is_business_rent:
                        # Treat as business expense (Rent Expense)
                        transaction['debit_account'] = get_standard_account_name('Rent')
                        transaction['credit_account'] = get_standard_account_name('Cash')
                        transaction['description'] = "Being rent paid for the shop"
                    else:
                        # Default to business rent if ambiguous
                        transaction['debit_account'] = get_standard_account_name('Rent')
                        transaction['credit_account'] = get_standard_account_name('Cash')
                        transaction['description'] = "Being rent paid (unspecified purpose)"
                elif keyword_type == 'withdrawn':
                    if accounts:
                        transaction['debit_account'] = get_standard_account_name(accounts[0])  # Maps "Tom" to "Drawings A/c"
                        transaction['credit_account'] = get_standard_account_name('Cash')
                        transaction['description'] = f"Being cash withdrawn by {accounts[0]} for personal use"
                    else:
                        transaction['debit_account'] = get_standard_account_name('Drawings')
                        transaction['credit_account'] = get_standard_account_name('Cash')
                        transaction['description'] = "Being cash withdrawn for personal use"
                break
    
    # Fallback account assignment if not determined
    if not transaction['debit_account'] or not transaction['credit_account']:
        if accounts:
            transaction['debit_account'] = get_standard_account_name(accounts[0])
            transaction['credit_account'] = get_standard_account_name('General Account')
            transaction['description'] = f"Being transaction with {accounts[0]}"
        else:
            transaction['debit_account'] = get_standard_account_name('Cash')
            transaction['credit_account'] = get_standard_account_name('General Account')
            transaction['description'] = "Being general transaction"
    
    return transaction

@app.route('/')
def serve_frontend():
    return render_template('index.html')

@app.route('/process_transaction', methods=['POST'])
def process_transaction():
    """
    API endpoint to process transaction text
    """
    data = request.json
    if not data or 'text' not in data:
        return jsonify({'error': 'Invalid request format - text field required'}), 400
    
    text = data.get('text', '').strip()
    if not text:
        return jsonify({'error': 'Empty transaction text'}), 400
    
    try:
        transaction_details = extract_transaction_details(text)
        return jsonify(transaction_details)
    except ValueError as ve:
        return jsonify({'error': f'Invalid data format: {str(ve)}'}), 400
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)