# Accounts Module — RACI Diagram

> **R** = Responsible (does the work) &nbsp;|&nbsp; **A** = Accountable (owns the outcome) &nbsp;|&nbsp; **C** = Consulted (input before) &nbsp;|&nbsp; **I** = Informed (notified after)

---

## 1. Roles & Definitions

```mermaid
graph LR
    subgraph ROLES["👥 Roles in Accounts Module"]
        CA["💵 Cashier\n──────────────\nHandles cash &\ncheque receipts"]
        AE["📋 Accounts Executive\n──────────────\nDay-to-day entries,\nvouchers, petty cash"]
        SA["📊 Senior Accountant\n──────────────\nComplex JVs, TDS,\nperiodic review"]
        BM["🏢 Branch Manager\n──────────────\nBranch-level approvals\n& oversight"]
        FC["💼 Finance Controller\n──────────────\nPolicy, high-value\napprovals, MIS"]
        AU["🔍 Auditor\n──────────────\nCompliance review,\nread-only access"]
        AD["⚙️ System Admin\n──────────────\nConfiguration,\nmaster data setup"]
    end
```

---

## 2. Approval Hierarchy

```mermaid
graph TD
    FC["💼 Finance Controller\n(Accountable — High Value)"]
    BM["🏢 Branch Manager\n(Accountable — Branch Level)"]
    SA["📊 Senior Accountant\n(Accountable — Day to Day)"]
    AE["📋 Accounts Executive\n(Responsible — Entry)"]
    CA["💵 Cashier\n(Responsible — Cash/Cheque)"]
    AU["🔍 Auditor\n(Reviews — Read Only)"]
    AD["⚙️ System Admin\n(Responsible — Config)"]

    FC -->|approves high-value & policy| BM
    BM -->|approves branch entries| SA
    SA -->|reviews & posts| AE
    SA -->|reviews & posts| CA
    AU -.->|audits all| SA
    AU -.->|audits all| AE
    AD -->|configures system for| SA
    AD -->|configures system for| AE
```

---

## 3. Configuration — RACI

```mermaid
graph TD
    subgraph CONFIG["⚙️ Accounts Config Screens"]
        BC["Bank Config\n(Setup bank accounts,\nUPI, debit cards)"]
        CM["Cheque Management\n(Cheque book ranges,\nbank assignment)"]
        CC["Company Config\n(Accounting period,\nglobal settings)"]
    end

    subgraph RACI_CONFIG["RACI"]
        BC -->|R — performs setup| AD1["System Admin"]
        BC -->|A — owns outcome| FC1["Finance Controller"]
        BC -->|C — consulted| SA1["Senior Accountant"]
        BC -->|I — informed| BM1["Branch Manager"]

        CM -->|R — manages books| AE1["Accounts Executive"]
        CM -->|A — approves range| SA2["Senior Accountant"]
        CM -->|I — informed| BM2["Branch Manager"]
        CM -->|I — informed| AU1["Auditor"]

        CC -->|R — configures| AD2["System Admin"]
        CC -->|A — owns policy| FC2["Finance Controller"]
        CC -->|C — consulted| SA3["Senior Accountant"]
        CC -->|C — consulted| BM3["Branch Manager"]
        CC -->|I — informed| AU2["Auditor"]
    end
```

---

## 4. Transactions — RACI Matrix

```mermaid
graph LR
    subgraph RECEIPTS["🟢 Receipts"]
        GR["General Receipt\nGeneral Receipt New"]
        GRC["General Receipt Cancel"]
        PC["Petty Cash\nPetty Cash View"]
        PCC["Petty Cash Cancel"]
    end

    subgraph PAYMENTS["🔴 Payments"]
        PV["Payment Voucher\nPayment Voucher View"]
        FT["Funds Transfer Out"]
    end

    subgraph VOUCHERS["🔵 Vouchers"]
        JV["Journal Voucher\nJV View"]
        TDS["TDS JV"]
    end

    subgraph CHEQUES["🟡 Cheque Operations"]
        COH["Cheques On Hand\n(collected)"]
        CIB["Cheques In Bank\n(deposited)"]
        CI["Cheques Issued\n(outgoing)"]
    end

    CA["💵 Cashier"] -->|R| GR
    CA -->|R| PC
    CA -->|R| COH

    AE["📋 Accts Executive"] -->|R| GR
    AE -->|R| PC
    AE -->|R| PV
    AE -->|R| COH
    AE -->|R| CIB
    AE -->|R| CI
    AE -->|R| FT
    AE -->|C| JV
    AE -->|C| GRC
    AE -->|C| PCC
    AE -->|C| TDS

    SA["📊 Sr. Accountant"] -->|A| GR
    SA -->|A| PC
    SA -->|A| PV
    SA -->|A| COH
    SA -->|A| CIB
    SA -->|A| CI
    SA -->|R| JV
    SA -->|R| GRC
    SA -->|R| PCC
    SA -->|R| TDS

    BM["🏢 Branch Mgr"] -->|A| JV
    BM -->|A| GRC
    BM -->|A| PCC
    BM -->|C| TDS
    BM -->|I| PV
    BM -->|I| FT

    FC["💼 Finance Ctrl"] -->|A| TDS
    FC -->|I| JV
    FC -->|I| GRC
```

---

## 5. Reports — RACI Matrix

```mermaid
graph LR
    subgraph LEDGER["📒 Ledger Reports"]
        AL["Account Ledger"]
        AS["Account Summary"]
        LE["Ledger Extract"]
    end

    subgraph BOOKS["📚 Books of Account"]
        CB["Cash Book"]
        BB["Bank Book"]
        DB["Day Book"]
    end

    subgraph BALANCE["⚖️ Balance Reports"]
        TB["Trial Balance"]
        CTB["Comparison TB"]
        STB["Schedule TB\nSchedule TB Report"]
    end

    subgraph CHEQUE_R["🧾 Cheque Reports"]
        IC["Issued Cheque"]
        CE["Cheque Enquiry"]
        CR["Cheque Return"]
        CCancel["Cheque Cancel"]
        BRS["BRS / BRS Statements\nBank Entries"]
    end

    subgraph TAX["📑 Tax Reports"]
        GST["GST Report"]
        TDS_R["TDS Report"]
    end

    subgraph REPRINT["🖨️ Re-Print"]
        RP["Re-Print\n(Receipts / PV / PC / JV)"]
        JVL["JV List"]
    end

    AE["📋 Accts Exec"] -->|R - generates| AL & AS & LE
    AE -->|R - generates| CB & BB & DB
    AE -->|C| TB & CTB & STB
    AE -->|R - generates| IC & CE & CR & CCancel & BRS
    AE -->|R - generates| GST
    AE -->|C| TDS_R
    AE -->|R - generates| RP & JVL

    SA["📊 Sr. Accountant"] -->|A| AL & AS & LE
    SA -->|A| CB & BB & DB
    SA -->|R - generates| TB & CTB & STB
    SA -->|A| IC & CE & CR & CCancel & BRS
    SA -->|A| GST
    SA -->|R - generates| TDS_R
    SA -->|A| RP & JVL

    BM["🏢 Branch Mgr"] -->|I| AL & CB & BB & DB
    BM -->|I| IC & BRS

    FC["💼 Finance Ctrl"] -->|A| TB & CTB & STB
    FC -->|A| TDS_R
    FC -->|I| GST

    AU["🔍 Auditor"] -->|R - reviews| AL & AS & LE
    AU -->|R - reviews| CB & BB & DB
    AU -->|R - reviews| TB & CTB & STB
    AU -->|R - reviews| IC & CE & CR & CCancel & BRS
    AU -->|R - reviews| GST & TDS_R
    AU -->|R - reviews| JVL
```

---

## 6. Full RACI Matrix (Reference Table)

### 6a. Configuration

| Screen / Activity | Cashier | Accts Executive | Sr. Accountant | Branch Manager | Finance Controller | System Admin | Auditor |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Bank Config Setup | — | C | C | I | **A** | **R** | I |
| Cheque Book Management | — | **R** | **A** | I | I | — | I |
| Company Configuration | — | — | C | C | **A** | **R** | I |

### 6b. Transactions

| Screen / Activity | Cashier | Accts Executive | Sr. Accountant | Branch Manager | Finance Controller | System Admin | Auditor |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| General Receipt Entry | **R** | **R** | **A** | I | I | — | I |
| General Receipt Cancel | — | C | **R** | **A** | I | — | I |
| Payment Voucher | — | **R** | **A** | I | I | — | I |
| Funds Transfer Out | — | **R** | **A** | C | I | — | I |
| Journal Voucher | — | C | **R** | **A** | I | — | I |
| TDS JV | — | C | **R** | C | **A** | — | I |
| Cheques On Hand | **R** | **R** | **A** | I | I | — | I |
| Cheques In Bank | — | **R** | **A** | I | I | — | I |
| Cheques Issued | — | **R** | **A** | I | I | — | I |
| Petty Cash Entry | **R** | **R** | **A** | I | I | — | I |
| Petty Cash Cancel | — | C | **R** | **A** | I | — | I |

### 6c. Reports

| Report | Cashier | Accts Executive | Sr. Accountant | Branch Manager | Finance Controller | Auditor |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Account Ledger | I | **R** | **A** | I | I | **R** |
| Account Summary | — | **R** | **A** | I | I | **R** |
| Ledger Extract | — | **R** | **A** | I | I | **R** |
| Cash Book | I | **R** | **A** | I | I | **R** |
| Bank Book | — | **R** | **A** | I | I | **R** |
| Day Book | I | **R** | **A** | I | I | **R** |
| Trial Balance | — | C | **R** | I | **A** | **R** |
| Comparison TB | — | C | **R** | I | **A** | **R** |
| Schedule TB / Report | — | C | **R** | I | **A** | **R** |
| BRS / BRS Statements | — | **R** | **A** | I | I | **R** |
| Bank Entries | — | **R** | **A** | I | I | **R** |
| Issued Cheque | I | **R** | **A** | I | I | **R** |
| Cheque Enquiry | I | **R** | **A** | I | I | **R** |
| Cheque Return | — | **R** | **A** | I | I | **R** |
| Cheque Cancel | — | **R** | **A** | I | I | **R** |
| GST Report | — | **R** | **A** | C | I | **R** |
| TDS Report | — | C | **R** | C | **A** | **R** |
| JV List | — | **R** | **A** | I | I | **R** |
| Re-Print | I | **R** | **A** | I | I | — |

---

## 7. RACI Summary by Role

```mermaid
pie title Responsibility Distribution (R count per role)
    "Accounts Executive" : 18
    "Senior Accountant" : 16
    "Cashier" : 5
    "System Admin" : 2
    "Auditor" : 14
    "Finance Controller" : 4
    "Branch Manager" : 2
```

```mermaid
pie title Accountability Distribution (A count per role)
    "Senior Accountant" : 18
    "Branch Manager" : 4
    "Finance Controller" : 7
    "System Admin" : 2
```

---

## 8. Key Rules

```mermaid
flowchart TD
    RULE1["📌 Rule 1: Segregation of Duty\nThe person who enters a transaction\ncannot be the one who approves it"]
    RULE2["📌 Rule 2: Dual Control on Cancellations\nAny cancellation (Receipt / Petty Cash)\nrequires Sr. Accountant + Branch Manager"]
    RULE3["📌 Rule 3: TDS needs Finance Sign-off\nTDS JV is the only transaction where\nFinance Controller is Accountable"]
    RULE4["📌 Rule 4: Auditor is Read-Only\nAuditor has R on all reports\nbut no write access to transactions"]
    RULE5["📌 Rule 5: Config changes need Finance approval\nBank Config and Company Config\nalways go through Finance Controller (A)"]
    RULE6["📌 Rule 6: One A per activity\nEvery activity has exactly ONE\nAccountable role — no shared accountability"]

    RULE1 --- RULE2
    RULE2 --- RULE3
    RULE3 --- RULE4
    RULE4 --- RULE5
    RULE5 --- RULE6
```
