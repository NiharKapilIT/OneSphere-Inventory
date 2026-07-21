# Accounts Module — Overview

> Angular standalone components · Lazy-loaded routes · Three service classes

---

## 1. Top-Level Structure

```mermaid
graph TD
    ACCOUNTS["🏦 Accounts Module<br/><i>features/accounts/</i>"]

    ACCOUNTS --> CFG["⚙️ Accounts Config<br/><i>Accounts_Config/</i>"]
    ACCOUNTS --> TXN["📝 Accounts Transactions<br/><i>Accounts_Transactions/</i>"]
    ACCOUNTS --> RPT["📊 Accounts Reports<br/><i>Accounts_Reports/</i>"]
    ACCOUNTS --> DSH["🏠 Dashboard<br/><i>accounts-dashboard/</i>"]

    CFG --> C1["Bank Config"]
    CFG --> C2["Bank Config View"]
    CFG --> C3["Cheque Management"]
    CFG --> C4["Company Config"]

    TXN --> T1["General Receipt"]
    TXN --> T2["General Receipt New"]
    TXN --> T3["General Receipt Cancel"]
    TXN --> T4["Payment Voucher"]
    TXN --> T5["Payment Voucher View"]
    TXN --> T6["Journal Voucher"]
    TXN --> T7["Journal Voucher View"]
    TXN --> T8["Cheques On Hand"]
    TXN --> T9["Cheques In Bank"]
    TXN --> T10["Cheques Issued"]
    TXN --> T11["Petty Cash"]
    TXN --> T12["Petty Cash View"]
    TXN --> T13["Petty Cash Cancel"]
    TXN --> T14["TDS JV"]
    TXN --> T15["Funds Transfer Out"]

    RPT --> R1["Account Ledger"]
    RPT --> R2["Account Summary"]
    RPT --> R3["Bank Book"]
    RPT --> R4["Bank Entries"]
    RPT --> R5["BRS / BRS Statements"]
    RPT --> R6["Cash Book"]
    RPT --> R7["Day Book"]
    RPT --> R8["Cheque Enquiry"]
    RPT --> R9["Cheque Cancel"]
    RPT --> R10["Cheque Return"]
    RPT --> R11["Issued Cheque"]
    RPT --> R12["JV List"]
    RPT --> R13["Ledger Extract"]
    RPT --> R14["Trial Balance"]
    RPT --> R15["Comparison TB"]
    RPT --> R16["Schedule TB / Report"]
    RPT --> R17["GST Report"]
    RPT --> R18["TDS Report"]
    RPT --> R19["Re-Print"]
    RPT --> R20["General Receipt<br/>(Report View)"]
    RPT --> R21["Payment Voucher<br/>(Report View)"]
    RPT --> R22["Journal Voucher<br/>(Report View)"]
```

---

## 2. Route Map

```mermaid
graph LR
    ROOT["/accounts"] -->|redirect| DASH["/accounts-dashboard/dashboard"]

    ROOT --> CFG_PATH["/accounts-config"]
    CFG_PATH --> bank-config
    CFG_PATH --> bank-config-view
    CFG_PATH --> cheque-management
    CFG_PATH --> cheque-managementnew
    CFG_PATH --> company-config

    ROOT --> TXN_PATH["/accounts-transactions"]
    TXN_PATH --> general-receipt
    TXN_PATH --> general-receipt-new
    TXN_PATH --> general-receipt-cancel
    TXN_PATH --> payment-voucher
    TXN_PATH --> payment-voucher-view
    TXN_PATH --> journal-voucher
    TXN_PATH --> journal-voucher-view
    TXN_PATH --> cheques-onhand
    TXN_PATH --> cheques-inbank
    TXN_PATH --> cheques-issued
    TXN_PATH --> petty-cash
    TXN_PATH --> petty-cash-view
    TXN_PATH --> pettycash-receipt-cancel
    TXN_PATH --> tds-jv
    TXN_PATH --> funds-transfer-out

    ROOT --> RPT_PATH["/accounts-reports"]
    RPT_PATH --> account-ledger
    RPT_PATH --> account-summary
    RPT_PATH --> bank-book
    RPT_PATH --> bank-entries
    RPT_PATH --> brs
    RPT_PATH --> brs-statements
    RPT_PATH --> cash-book
    RPT_PATH --> day-book
    RPT_PATH --> cheque-cancel
    RPT_PATH --> cheque-enquiry
    RPT_PATH --> cheque-return
    RPT_PATH --> issued-cheque
    RPT_PATH --> jv-list
    RPT_PATH --> ledger-extract
    RPT_PATH --> trial-balance
    RPT_PATH --> comparison-tb
    RPT_PATH --> schedule-tb
    RPT_PATH --> schedule-tb-report
    RPT_PATH --> gst-report
    RPT_PATH --> tds-report
    RPT_PATH --> re-print
```

---

## 3. Service Layer

```mermaid
graph TD
    SVC["Angular Services<br/><i>core/services/accounts/</i>"]

    SVC --> CS["AccountsConfig<br/><i>accounts-config.ts</i>"]
    SVC --> TS["AccountsTransactions<br/><i>accounts-transactions.ts</i>"]
    SVC --> RS["AccountsReports<br/><i>accounts-reports.ts</i>"]

    CS --> CS1["GetBankDetails / GetBankNames"]
    CS --> CS2["GetBankUPIDetails"]
    CS --> CS3["SaveBankInformation / viewbank"]
    CS --> CS4["GetChequeManagement / SaveChequeManagement"]
    CS --> CS5["GetAccountTree / GetAccountTreeSearch"]
    CS --> CS6["SaveAccountHeads"]
    CS --> CS7["GetSubLedgerdata"]
    CS --> CS8["SaveCompanyConfiguration"]
    CS --> CS9["GetCompanyBranchHierarchy"]

    TS --> TS1["GetGeneralReceiptsData / saveGeneralReceipt"]
    TS --> TS2["GetPaymentVoucherExistingData / savePaymentVoucher"]
    TS --> TS3["GetJournalVoucherData / saveJournalVoucher"]
    TS --> TS4["GetChequesOnHandData / SaveChequesOnHand"]
    TS --> TS5["GetChequesInBankData / SaveChequesInBank"]
    TS --> TS6["GetChequesIssued / SaveChequesIssued"]
    TS --> TS7["GetPettyCashExistingData / SavePettyCash"]
    TS --> TS8["savepettycashcancel / SaveGeneralReceiptCancel"]
    TS --> TS9["GettdsJVDetails / saveTDSjvdetails"]
    TS --> TS10["GetBankBalance / GetCashonhandBalance"]
    TS --> TS11["GetSubLedgerData / GetLedgerData1"]
    TS --> TS12["SaveBankTransferDetails / GetBankTransferTypes"]

    RS --> RS1["GetLedgerReport (Account Ledger)"]
    RS --> RS2["GetCashBookReportbyDates (Cash Book)"]
    RS --> RS3["GetDayBook (Day Book)"]
    RS --> RS4["GetLedgerSummary (Account Summary)"]
    RS --> RS5["GetTrialBalanceData (Trial Balance)"]
    RS --> RS6["GetComparisionTB (Comparison TB)"]
    RS --> RS7["GetJvListReport / GetJvListReportGroup"]
    RS --> RS8["GetGeneralReceiptbyId / GetPaymentVoucherbyId"]
    RS --> RS9["GetJvReport (JV Report)"]
    RS --> RS10["GetScheduleTBReport / GetScheduleTBNestedReport"]
    RS --> RS11["_CashBookReportsPdf / _BankBookReportsPdf (PDF gen)"]
```

---

## 4. Transaction Flows

### 4a. General Receipt Flow — All Modes

```mermaid
flowchart TD
    A([User opens General Receipt]) --> B[Load Existing Data\nGetGeneralReceiptsData]
    B --> C[Select Party / Mode of Receipt\nGetModeoftransactions]
    C --> D{Mode of Receipt?}

    D -->|Cash| E[Validate Cash Limit\nGetCashRestrictAmountpercontact]
    D -->|Cheque| F[Select Bank\nGetBankNames]
    D -->|NEFT · RTGS · UPI · Online| BP[Bank Payment Path\nsee section 4d below]

    E --> G[Save Receipt\nsaveGeneralReceipt]
    F --> G
    BP --> G

    G --> H[Print Receipt\nGetGeneralReceiptbyId]
    H --> I([Done])

    G --> J{Cancel needed?}
    J -->|Yes| K[Open General Receipt Cancel]
    K --> L[SaveGeneralReceiptCancel]
    L --> I
```

### 4b. Cheque Lifecycle

```mermaid
flowchart LR
    subgraph Issue
        A([Payment Voucher]) -->|savePaymentVoucher| B["Cheque Issued\n(cheques-issued)"]
    end

    subgraph Deposit
        B -->|SaveChequesOnHand| C["Cheques On Hand\n(collected cheques)"]
        C -->|SaveChequesInBank| D["Cheques In Bank\n(deposited)"]
    end

    subgraph Reconcile
        D --> E{Bank Statement}
        E -->|Cleared| F["BRS Statements\n(Reconciled ✓)"]
        E -->|Returned| G["Cheque Return\nGetChequeReturnDetails"]
    end

    subgraph Cancel
        B -->|UnusedhequeCancel| H["Cheque Cancel\n(unused)"]
    end
```

### 4c. Journal Voucher & TDS Flow

```mermaid
flowchart TD
    A([Open Journal Voucher]) --> B[GetJournalVoucherData]
    B --> C[Select Dr/Cr Ledger Accounts\nGetLedgerData1]
    C --> D[saveJournalVoucher]
    D --> E[Print JV\nGetJvReport]

    F([TDS JV]) --> G[GetCalendarYear / GetTDSJVCalendarYearMonth]
    G --> H[GettdsJVDetails]
    H --> I[Check Duplicate\nGetTDSJVDetailsDuplicateCheck]
    I --> J[saveTDSjvdetails]
```

### 4d. General Receipt — Bank Process Flow (NEFT · RTGS · UPI · Online)

> This flow is introduced when payment is **received directly into the bank account** — not by physical cash or cheque hand-over.

```mermaid
flowchart TD
    BANK_IN(["🏦 Payment Arrives at Bank\nNEFT / RTGS / UPI / Online Transfer"])

    BANK_IN --> NOTIFY["Bank Notification\nor Statement Received"]

    NOTIFY --> ROUTE{How is it\nidentified?}

    ROUTE -->|Bank Statement Upload| AUTO["Auto BRS Path\nSaveAutoBrsdataupload"]
    ROUTE -->|Accountant views\nBank Entries screen| MANUAL["Manual Bank Entries\nbank-entries screen"]
    ROUTE -->|UPI reference known| UPI_LOOK["Lookup UPI Reference\nGetChitReceiptUPIDetails"]

    %% Auto BRS path
    AUTO --> PENDING["Match Pending BRS Items\nGetPendingautoBRSDetails"]
    PENDING --> MATCHED{Match\nfound?}
    MATCHED -->|Yes — auto reconciled| RECONCILED["Entry Marked Cleared\nin Bank Book"]
    MATCHED -->|No — unmatched| MANUAL

    %% Manual path
    MANUAL --> VIEW_ENTRIES["View Bank Credit Entries\nGetBankEntries / GetBankBalance"]
    VIEW_ENTRIES --> OPEN_GR

    %% UPI path
    UPI_LOOK --> UPI_VALID{Reference\nvalid?}
    UPI_VALID -->|Valid| OPEN_GR
    UPI_VALID -->|Invalid / Not found| ERR(["❌ Stop — Reference mismatch\nInform party"])

    %% General Receipt creation
    OPEN_GR["Open General Receipt\nGeneral Receipt New"]
    OPEN_GR --> SEL_MODE["Set Mode = NEFT / RTGS / UPI / Online\nGetModeoftransactions"]
    SEL_MODE --> SEL_BANK["Select Bank Account\nGetBankUPIDetails / GetBankNames"]
    SEL_BANK --> SEL_PARTY["Select Party\ngetPartyDetailsbyid"]
    SEL_PARTY --> ENTER_REF["Enter Transaction Reference No.\n(UTR / UPI Ref / NEFT Ref)"]
    ENTER_REF --> VALIDATE["Validate Amount &\nCash Restrict Rules\nGetCashRestrictAmountpercontact"]
    VALIDATE --> SAVE["Save Receipt\nsaveGeneralReceipt\nor SaveOnLineCollection_JV"]

    %% After save
    SAVE --> LEDGER["Ledger Credited\nBank Account Dr · Party Cr"]
    LEDGER --> RECONCILED
    RECONCILED --> BRS_CONFIRM["BRS / BRS Statements\nConfirm Reconciliation"]
    BRS_CONFIRM --> BANK_BOOK["Appears in Bank Book\n_BankBookReportsPdf"]
    BANK_BOOK --> PRINT["Print / Re-Print Receipt\nGetGeneralReceiptbyId"]
    PRINT --> DONE(["✅ Done"])

    %% Cancel path
    SAVE --> CANCEL{Cancel\nneeded?}
    CANCEL -->|Yes| GRC["General Receipt Cancel\nSaveGeneralReceiptCancel"]
    GRC --> REVERSE["Ledger Reversed\nBRS entry unmatched"]
    REVERSE --> DONE

    %% Settlement Report
    RECONCILED --> SETTLE["UPI Settlement Report\nGetUPIClearedData_SettlementReport"]
```

#### Bank Payment — Key API Reference

| Step | Screen | API Method | Purpose |
|---|---|---|---|
| Identify payment | Bank Entries | `GetBankEntries` | View inbound credits |
| UPI validation | General Receipt | `GetChitReceiptUPIDetails` | Verify UPI reference |
| Bank selection | General Receipt | `GetBankUPIDetails` / `GetBankNames` | Load bank accounts |
| UPI bank list | General Receipt | `GetPayTmBanksList` | UPI-enabled banks |
| Party lookup | General Receipt | `getPartyDetailsbyid` | Fetch party ledger |
| Save (regular) | General Receipt | `saveGeneralReceipt` | Post receipt entry |
| Save (online JV) | General Receipt | `SaveOnLineCollection_JV` | Online collection as JV |
| Auto BRS match | BRS Statements | `GetPendingautoBRSDetails` | Pending BRS items |
| Auto BRS upload | BRS Statements | `SaveAutoBrsdataupload` | Upload bank statement |
| Balance check | Bank Book | `GetBankBalance` | Verify bank balance |
| Settlement | Bank Entries | `GetUPIClearedData_SettlementReport` | UPI cleared summary |
| Reconciliation | BRS Statements | `DataFromBrsDatesChequesInBank` | Cleared entries |
| Print receipt | Re-Print | `GetGeneralReceiptbyId` | Receipt document |

#### Comparison: Cash vs Cheque vs Bank Payment

```mermaid
flowchart LR
    subgraph CASH["💵 Cash Receipt"]
        C1["Party pays cash"] --> C2["Cashier counts\n& validates limit"]
        C2 --> C3["General Receipt\nsaved"]
        C3 --> C4["Cash Book updated"]
    end

    subgraph CHEQUE["🧾 Cheque Receipt"]
        Q1["Party gives cheque"] --> Q2["Cheques On Hand\n(collected)"]
        Q2 --> Q3["General Receipt\nsaved"]
        Q3 --> Q4["Deposit to bank\nCheques In Bank"]
        Q4 --> Q5["BRS — Cleared\nor Returned"]
    end

    subgraph BANK["🏦 Bank Transfer Receipt\nNEFT · RTGS · UPI · Online"]
        B1["Payment arrives\ndirectly in bank"] --> B2["Bank Entries /\nAuto BRS match"]
        B2 --> B3["General Receipt\nsaved with UTR ref"]
        B3 --> B4["Bank Book credited\nautomatically"]
        B4 --> B5["BRS Statements\nconfirm reconciliation"]
    end

    CASH -.->|No BRS needed| DONE1(["✅"])
    CHEQUE -.->|BRS required| DONE2(["✅"])
    BANK -.->|Auto/Manual BRS| DONE3(["✅"])
```

---

## 5. Reports & Output

```mermaid
graph LR
    subgraph Ledger_Reports["Ledger & Summary"]
        R1["Account Ledger\nGetLedgerReport"]
        R2["Account Summary\nGetLedgerSummary"]
        R3["Ledger Extract\nGetLedgerExtractReport"]
    end

    subgraph Book_Reports["Books of Account"]
        R4["Cash Book\nGetCashBookReportbyDates"]
        R5["Bank Book\nBankBook component"]
        R6["Day Book\nGetDayBook"]
    end

    subgraph Balance_Reports["Balance & Trial"]
        R7["Trial Balance\nGetTrialBalanceData"]
        R8["Comparison TB\nGetComparisionTB"]
        R9["Schedule TB\nGetScheduleTBReport"]
        R10["Schedule TB Report\nGetScheduleTBNestedReport"]
    end

    subgraph Cheque_Reports["Cheque Reports"]
        R11["Issued Cheque\nGetBankChequeDetails"]
        R12["Cheque Enquiry\nGetChequeEnquiryData"]
        R13["Cheque Return\nGetChequeReturnDetails"]
        R14["Cheque Cancel\nGetChequeCancelDetails"]
        R15["BRS / BRS Statements\nBank Reconciliation"]
        R16["Bank Entries"]
    end

    subgraph Voucher_Reprints["Voucher / Re-Print"]
        R17["JV List\nGetJvListReport"]
        R18["Re-Print\nGeneral Receipt / PV / PC"]
        R19["GST Report"]
        R20["TDS Report"]
    end

    subgraph OUTPUT["Output Format"]
        PDF["PDF via jsPDF + autoTable"]
        GRID["On-screen grid"]
    end

    Ledger_Reports --> PDF
    Ledger_Reports --> GRID
    Book_Reports --> PDF
    Balance_Reports --> GRID
    Cheque_Reports --> PDF
    Cheque_Reports --> GRID
    Voucher_Reprints --> PDF
```

---

## 6. Key Data Context

```mermaid
graph TD
    SESSION["Session / Auth Context"]
    SESSION --> SC["CompanyCode"]
    SESSION --> SB["BranchCode"]
    SESSION --> SGS["GlobalSchema  (global DB)"]
    SESSION --> SBS["BranchSchema  (accounts DB)"]
    SESSION --> STS["TaxSchema     (taxes DB)"]

    EVERY_CALL["Every API Call requires"] --> SC & SB & SGS & SBS
    SOME_CALLS["Tax-related calls also need"] --> STS

    COMMON["CommonService\n<i>getschemaname / getbranchname\ngetCompanyCode / getBranchCode</i>"]
    SGS --> COMMON
    SBS --> COMMON
    SC --> COMMON
    SB --> COMMON
```

---

## Summary Table

| Sub-Module | Screens | Service Class | Key Operations |
|---|---|---|---|
| **Config** | 4 | `AccountsConfig` | Bank setup, Cheque books, Account Tree, Company config |
| **Transactions** | 15 | `AccountsTransactions` | Receipts, Payments, JVs, Cheque lifecycle, Petty Cash, TDS |
| **Reports** | 22 | `AccountsReports` | Ledger, Cash/Bank Book, Trial Balance, BRS, Cheque reports, PDF export |
| **Dashboard** | 1 | — | Summary view |

> All components are **standalone** and **lazy-loaded**. Routes are defined in [accounts_routs.ts](src/app/features/accounts/accounts_routs.ts). Services are `providedIn: 'root'` and shared via `CommonService` for schema/auth context.
