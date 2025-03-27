// Add new balance entry field
function addBalanceEntry(containerId) {
    const container = document.getElementById(containerId);
    const entry = document.createElement("div");
    entry.classList.add("balanceEntry");
    entry.innerHTML = `
        <input type="text" placeholder="Account Name (e.g., Cash)" class="accountName">
        <input type="number" placeholder="Amount (₹)" class="amount">
        <button onclick="removeEntry(this)">Remove</button>
    `;
    container.appendChild(entry);
}

// Add new transaction entry field (manual)
function addTransactionEntry() {
    const container = document.getElementById("transactionsForm");
    const entry = document.createElement("div");
    entry.classList.add("transactionEntry");
    entry.innerHTML = `
        <input type="date" class="transactionDate">
        <textarea placeholder="Description (e.g., Purchased goods on credit)" class="description"></textarea>
        <input type="text" placeholder="Debit Account" class="debitAccount">
        <input type="number" placeholder="Debit Amount (₹)" class="debitAmount">
        <input type="text" placeholder="Credit Account" class="creditAccount">
        <input type="number" placeholder="Credit Amount (₹)" class="creditAmount">
        <button onclick="removeEntry(this)">Remove</button>
    `;
    container.appendChild(entry);
}

// Process transaction text via NLP
async function processTransactionText(text) {
    const button = document.querySelector('#parseButton');
    button.disabled = true;
    button.textContent = 'Processing...';
    
    try {
        const response = await fetch('/process_transaction', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text: text })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Transaction Processing Error:', error);
        alert(`Error: ${error.message}`);
        return null;
    } finally {
        button.disabled = false;
        button.textContent = 'Parse Transaction';
    }
}

// Add transaction entry from NLP-parsed text
function addTransactionEntryFromText() {
    const textInput = document.getElementById('transactionTextInput');
    const text = textInput.value.trim();
    
    if (!text) {
        alert('Please enter a transaction description');
        return;
    }
    
    if (text.length < 5) {
        alert('Transaction description is too short');
        return;
    }

    processTransactionText(text).then(transaction => {
        if (transaction && !transaction.error) {
            const container = document.getElementById("transactionsForm");
            const entry = document.createElement("div");
            entry.classList.add("transactionEntry");
            
            const formatDate = (date) => {
                if (!date) {
                    console.log('No date parsed, leaving blank for manual entry');
                    return '';
                }
                const d = new Date(date);
                const formattedDate = d.toISOString().split('T')[0]; // Format as YYYY-MM-DD
                console.log('Parsed date:', formattedDate);
                return formattedDate;
            };

            entry.innerHTML = `
                <input type="date" class="transactionDate" value="${formatDate(transaction.date)}">
                <textarea placeholder="Description" class="description">${transaction.description}</textarea>
                <input type="text" placeholder="Debit Account" class="debitAccount" value="${transaction.debit_account || ''}">
                <input type="number" placeholder="Debit Amount (₹)" class="debitAmount" value="${transaction.amount || ''}">
                <input type="text" placeholder="Credit Account" class="creditAccount" value="${transaction.credit_account || ''}">
                <input type="number" placeholder="Credit Amount (₹)" class="creditAmount" value="${transaction.amount || ''}">
                <button onclick="removeEntry(this)">Remove</button>
            `;
            container.appendChild(entry);
            textInput.value = '';
        } else {
            alert(transaction?.error || 'Could not process transaction text. Please enter details manually.');
        }
    });
}

// Remove an entry
function removeEntry(button) {
    button.parentElement.remove();
}

// Generate Journal and Ledgers
function generateJournalAndLedgers() {
    // Clear previous results
    document.getElementById("journalBody").innerHTML = "";
    document.getElementById("ledgers").innerHTML = "";

    // Step 1: Collect Initial Balances
    const initialBalances = {
        debit: [],
        credit: []
    };

    const debitEntries = document.querySelectorAll("#debitBalances .balanceEntry");
    debitEntries.forEach(entry => {
        const accountName = entry.querySelector(".accountName").value.trim();
        const amount = parseFloat(entry.querySelector(".amount").value.replace(/,/g, '')) || 0;
        if (accountName && amount > 0) {
            initialBalances.debit.push({ account: accountName, amount });
        }
    });

    const creditEntries = document.querySelectorAll("#creditBalances .balanceEntry");
    creditEntries.forEach(entry => {
        const accountName = entry.querySelector(".accountName").value.trim();
        const amount = parseFloat(entry.querySelector(".amount").value.replace(/,/g, '')) || 0;
        if (accountName && amount > 0) {
            initialBalances.credit.push({ account: accountName, amount });
        }
    });

    // Step 2: Collect Transactions and Create Journal
    const journalEntries = [];
    const transactionEntries = document.querySelectorAll(".transactionEntry");
    transactionEntries.forEach(entry => {
        const date = entry.querySelector(".transactionDate").value;
        let description = entry.querySelector(".description").value.trim();
        const debitAccount = entry.querySelector(".debitAccount").value.trim();
        const debitAmount = parseFloat(entry.querySelector(".debitAmount").value.replace(/,/g, '')) || 0;
        const creditAccount = entry.querySelector(".creditAccount").value.trim();
        const creditAmount = parseFloat(entry.querySelector(".creditAmount").value.replace(/,/g, '')) || 0;

        if (date && description && debitAccount && creditAccount && debitAmount > 0 && creditAmount > 0) {
            if (debitAmount !== creditAmount) {
                alert(`Debit and Credit amounts must match for transaction on ${date}`);
                return;
            }

            journalEntries.push({
                date: date,
                particulars: `${debitAccount}<br>To ${creditAccount}<br>(${description})`,
                dr: debitAmount,
                cr: creditAmount,
                debitAccount,
                creditAccount
            });
        }
    });

    // Step 3: Display Journal
    const journalBody = document.getElementById("journalBody");
    journalEntries.forEach(entry => {
        const row = document.createElement("tr");
        const formattedDr = entry.dr ? entry.dr.toLocaleString('en-IN', { minimumFractionDigits: 0 }) : "";
        const formattedCr = entry.cr ? entry.cr.toLocaleString('en-IN', { minimumFractionDigits: 0 }) : "";
        row.innerHTML = `
            <td>${entry.date}</td>
            <td>${entry.particulars}</td>
            <td class="amount">${formattedDr}</td>
            <td class="amount">${formattedCr}</td>
        `;
        journalBody.appendChild(row);
    });

    // Step 4: Generate Ledgers
    const accounts = {};

    initialBalances.debit.forEach(balance => {
        if (!accounts[balance.account]) {
            accounts[balance.account] = {
                name: balance.account,
                entries: [{ date: "", particulars: "Balance b/d", jf: "", amount: balance.amount, type: "Dr" }]
            };
        } else {
            accounts[balance.account].entries.push({ date: "", particulars: "Balance b/d", jf: "", amount: balance.amount, type: "Dr" });
        }
    });

    initialBalances.credit.forEach(balance => {
        if (!accounts[balance.account]) {
            accounts[balance.account] = {
                name: balance.account,
                entries: [{ date: "", particulars: "Balance b/d", jf: "", amount: balance.amount, type: "Cr" }]
            };
        } else {
            accounts[balance.account].entries.push({ date: "", particulars: "Balance b/d", jf: "", amount: balance.amount, type: "Cr" });
        }
    });

    journalEntries.forEach(entry => {
        if (!accounts[entry.debitAccount]) {
            accounts[entry.debitAccount] = { name: entry.debitAccount, entries: [] };
        }
        accounts[entry.debitAccount].entries.push({
            date: entry.date,
            particulars: entry.creditAccount,
            jf: "",
            amount: entry.dr,
            type: "Dr"
        });

        if (!accounts[entry.creditAccount]) {
            accounts[entry.creditAccount] = { name: entry.creditAccount, entries: [] };
        }
        accounts[entry.creditAccount].entries.push({
            date: entry.date,
            particulars: entry.debitAccount,
            jf: "",
            amount: entry.cr,
            type: "Cr"
        });
    });

    // Step 5: Calculate closing balances and display ledgers
    const ledgersDiv = document.getElementById("ledgers");
    Object.values(accounts).forEach(ledger => {
        const ledgerDiv = document.createElement("div");
        ledgerDiv.classList.add("ledger");
        ledgerDiv.innerHTML = `<h3>${ledger.name}</h3>`;

        let debitTotal = 0;
        let creditTotal = 0;
        ledger.entries.forEach(entry => {
            if (entry.type === "Dr") debitTotal += entry.amount;
            else creditTotal += entry.amount;
        });

        if (debitTotal > creditTotal) {
            ledger.entries.push({
                date: "",
                particulars: "Balance c/d",
                jf: "",
                amount: debitTotal - creditTotal,
                type: "Cr"
            });
            creditTotal = debitTotal;
        } else if (creditTotal > debitTotal) {
            ledger.entries.push({
                date: "",
                particulars: "Balance c/d",
                jf: "",
                amount: creditTotal - debitTotal,
                type: "Dr"
            });
            debitTotal = creditTotal;
        }

        const table = document.createElement("table");
        table.innerHTML = `
            <thead>
                <tr>
                    <th colspan="4">Debit</th>
                    <th colspan="4">Credit</th>
                </tr>
                <tr>
                    <th>Date</th>
                    <th>Particulars</th>
                    <th>J.F.</th>
                    <th>₹</th>
                    <th>Date</th>
                    <th>Particulars</th>
                    <th>J.F.</th>
                    <th>₹</th>
                </tr>
            </thead>
            <tbody>
        `;

        const debitEntries = ledger.entries.filter(entry => entry.type === "Dr");
        const creditEntries = ledger.entries.filter(entry => entry.type === "Cr");
        const maxRows = Math.max(debitEntries.length, creditEntries.length);

        for (let i = 0; i < maxRows; i++) {
            const debitEntry = debitEntries[i] || {};
            const creditEntry = creditEntries[i] || {};
            const formattedDebitAmount = debitEntry.amount ? debitEntry.amount.toLocaleString('en-IN', { minimumFractionDigits: 0 }) : "";
            const formattedCreditAmount = creditEntry.amount ? creditEntry.amount.toLocaleString('en-IN', { minimumFractionDigits: 0 }) : "";
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${debitEntry.date || ""}</td>
                <td>${debitEntry.particulars || ""}</td>
                <td>${debitEntry.jf || ""}</td>
                <td class="amount">${formattedDebitAmount}</td>
                <td>${creditEntry.date || ""}</td>
                <td>${creditEntry.particulars || ""}</td>
                <td>${creditEntry.jf || ""}</td>
                <td class="amount">${formattedCreditAmount}</td>
            `;
            table.querySelector("tbody").appendChild(row);
        }

        const formattedDebitTotal = debitTotal.toLocaleString('en-IN', { minimumFractionDigits: 0 });
        const formattedCreditTotal = creditTotal.toLocaleString('en-IN', { minimumFractionDigits: 0 });
        const totalRow = document.createElement("tr");
        totalRow.innerHTML = `
            <td colspan="3"><strong>Total</strong></td>
            <td class="amount"><strong>${formattedDebitTotal}</strong></td>
            <td colspan="3"><strong>Total</strong></td>
            <td class="amount"><strong>${formattedCreditTotal}</strong></td>
        `;
        table.querySelector("tbody").appendChild(totalRow);

        ledgerDiv.appendChild(table);
        ledgersDiv.appendChild(ledgerDiv);
    });

    // Add download buttons after generation (only for Journal)
    const downloadDiv = document.createElement('div');
    downloadDiv.innerHTML = `
        <h2>Download Options</h2>
        <button onclick="downloadJournalAsPDF()">Download Journal as PDF</button>
        <button onclick="downloadJournalAsExcel()">Download Journal as Excel</button>
    `;
    
    // Remove any existing download buttons first
    const existingDownloadDiv = document.querySelector('#downloadOptions');
    if (existingDownloadDiv) {
        existingDownloadDiv.remove();
    }
    
    downloadDiv.id = 'downloadOptions';
    
    // Insert download buttons after the ledgers section
    const ledgersSection = document.getElementById('ledgers');
    ledgersSection.parentNode.insertBefore(downloadDiv, ledgersSection.nextSibling);
}

// Add new functions for downloading (only Journal options remain)

function convertTableToExcel(table, sheetName) {
    const wb = XLSX.utils.table_to_book(table, { sheet: sheetName });
    XLSX.writeFile(wb, `${sheetName}.xlsx`);
}

function downloadJournalAsPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Set up document
    doc.setFontSize(12);
    doc.text("Accounting Journal", 10, 10);
    
    // Get journal table
    const journalTable = document.getElementById('journalTable');
    
    // Use autoTable for better PDF table rendering
    doc.autoTable({
        html: '#journalTable',
        startY: 20,
        theme: 'striped',
        styles: { 
            fontSize: 9,
            cellPadding: 3,
            overflow: 'linebreak'
        },
        columnStyles: { 
            3: { halign: 'right' },
            2: { halign: 'right' }
        }
    });
    
    doc.save('journal.pdf');
}

function downloadJournalAsExcel() {
    const journalTable = document.getElementById('journalTable');
    convertTableToExcel(journalTable, 'Journal');
}