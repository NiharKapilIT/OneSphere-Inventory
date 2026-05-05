import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, NgZone, OnDestroy, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  Module,
  NavigationService,
  Screen,
  SubModule
} from '../../core/services/Navigation/navigation.service';

type SpeechRecognitionCtor = new () => any;

interface VoiceCommandTarget {
  label: string;
  route?: string;
  module?: Module;
  subModule?: SubModule;
  screen?: Screen;
  aliases: string[];
}

@Component({
  selector: 'app-voice-assistant',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './voice-assistant.component.html',
  styleUrl: './voice-assistant.component.scss'
})
export class VoiceAssistantComponent implements OnInit, OnDestroy {
  readonly open         = signal(false);
  readonly listening    = signal(false);
  readonly speaking     = signal(false);
  readonly transcript   = signal('');
  readonly reply        = signal('');
  readonly status       = signal('Ready');
  readonly matchedLabel = signal('');
  readonly supported    = signal(true);

  private recognition: any;
  private commands: VoiceCommandTarget[] = [];
  private recognitionRestartTimer: ReturnType<typeof setTimeout> | null = null;

  // true = keep restarting recognition automatically after each utterance
  private keepListening   = false;
  // Chrome TTS watchdog — Chrome pauses speechSynthesis when tab loses focus
  private synthResumeTimer: ReturnType<typeof setInterval> | null = null;

  // 'cap' / 'cop' / 'cup' are common speech-recognition outputs for spoken "Kap"
  private readonly wakePhrases = ['kap', 'cap', 'cop', 'cup', 'కాప్', 'క్యాప్'];

  // Explanation trigger phrases — longest first so specific ones match before short ones
  private readonly explanationTriggers = [
    'what is the purpose of',
    'what is the use of',
    'help me understand',
    'అంటే ఏమిటి',
    'ఏమిటి',
    'వివరించు',
    'వివరించండి',
    'ఎలా వాడాలి',
    'ఎలా ఉపయోగించాలి',
    'ఎందుకు వాడాలి',
    'ఎందుకు ఉపయోగించాలి',
    'what should i do next',
    'what should be done next',
    'what is next',
    'what next',
    'next step after',
    'next step',
    'tell me about',
    'how do i use',
    'how to use',
    'why should we use',
    'why do we use',
    'why use',
    'what does',
    'what are',
    'what is',
    'describe',
    'explain',
    'about'
  ];

  private readonly dependencyTriggers = [
    'సంబంధిత స్క్రీన్లు',
    'సంబంధిత స్క్రీన్',
    'డిపెండెన్సీ స్క్రీన్లు',
    'డిపెండెన్సీ స్క్రీన్',
    'ఆధారపడే స్క్రీన్లు',
    'dependency screens for',
    'dependency screen for',
    'dependent screens for',
    'dependent screen for',
    'related screens for',
    'related screen for',
    'connected screens for',
    'connected screen for',
    'screens related to',
    'screens connected to',
    'dependencies of',
    'dependency of',
    'depends on'
  ];

  private readonly screenDependencies: Record<string, string> = {
    'general receipt':
      'General Receipt depends on Party or ledger selection, payment mode, and bank or cash details. ' +
      'For cheque receipts, the next related screen is Cheques On Hand. After deposit, use Cheques In Bank. ' +
      'For review, use Account Ledger, Day Book, Bank Book, and Cheque Enquiry.',

    'receipt cheque':
      'For receipt by cheque, the dependency flow is: General Receipt first, then Cheques On Hand, then Cheques In Bank after deposit. ' +
      'For status checking, use Cheque Enquiry. For accounting verification, use Account Ledger or Bank Book.',

    'cheque receipt':
      'For cheque receipt, use General Receipt to record the collection, Cheques On Hand to manage the received cheque, ' +
      'Cheques In Bank after depositing it, and Cheque Enquiry to check the current status.',

    'cheques on hand':
      'Cheques On Hand depends on cheque receipts created from General Receipt. ' +
      'Its next related screen is Cheques In Bank once the cheque is deposited. For searching or status history, use Cheque Enquiry.',

    'cheques in bank':
      'Cheques In Bank depends on cheques moved from Cheques On Hand after deposit. ' +
      'Use it until the bank clears or returns the cheque. Related screens are BRS, Bank Book, and Cheque Enquiry.',

    'payment voucher':
      'Payment Voucher depends on party, ledger, payment mode, and bank or cash details. ' +
      'For cheque payments, related screens are Cheques Issued, Cheque Management, Bank Book, BRS, and Account Ledger.',

    'cheques issued':
      'Cheques Issued depends on cheque payments created from Payment Voucher. ' +
      'Use Cheque Management for cheque book setup, BRS for uncleared issued cheques, and Bank Book or Account Ledger for verification.',

    'bank reconciliation':
      'Bank Reconciliation depends on Bank Book, Cheques Issued, Cheques In Bank, and the actual bank statement. ' +
      'Use BRS Statements to review detailed reconciliation differences.',

    'brs':
      'BRS depends on Bank Book, Cheques Issued, Cheques In Bank, and the bank statement. ' +
      'Use it to reconcile uncleared payments, pending deposits, and bank-side entries.',

    'bank configuration':
      'Bank Configuration is a setup dependency for bank-based receipts, payments, Bank Book, and BRS. ' +
      'Create or update bank ledgers here before using bank transaction screens.',

    'cheque management':
      'Cheque Management is a setup dependency for cheque payments. ' +
      'Configure cheque books and cheque number ranges here before issuing cheques from Payment Voucher.'
  };

  // ── Knowledge base ─────────────────────────────────────────────────────────
  private readonly explanations: Record<string, string> = {

    // ── Screens ───────────────────────────────────────────────────────────────

    'trial balance':
      'Trial Balance is a financial report that lists every ledger account balance at the end of a period. ' +
      'The total of all debit balances must equal the total of all credit balances, confirming the accounting records are mathematically correct. ' +
      'It is prepared before drafting the final financial statements.',

    'account ledger':
      'Account Ledger shows every transaction posted to a specific account in chronological order. ' +
      'For each entry it shows the date, narration, debit amount, credit amount, and running balance. ' +
      'Use it to trace the complete movement of money in or out of any account.',

    'account summary':
      'Account Summary gives a consolidated view of one or more ledger accounts, showing the opening balance, ' +
      'total debits, total credits, and closing balance for the selected period. ' +
      'It is useful when you want a quick snapshot of multiple accounts without seeing each individual transaction.',

    'sos':
      'SOS is the ERP support help system. Use it when you need to report an issue, request help, or share a problem with the support team directly from the application. ' +
      'It captures important details like ticket category, priority, subject, description, contact information, page URL, user details, and optional screenshots or files. ' +
      'After submission, the ticket is saved for tracking and sent to the configured support email so the team can review and respond.',

    'sos support':
      'SOS Support is used to raise help tickets from inside the ERP. ' +
      'It is useful when a screen is not working, data looks wrong, a process is blocked, or the user needs clarification from support. ' +
      'A good SOS ticket should include what the user was doing, what happened, what was expected, the affected screen, priority, and any screenshot or attachment that helps support reproduce the issue.',

    'sos dashboard':
      'SOS Dashboard is where SOS tickets can be created, viewed, filtered, and tracked. ' +
      'It helps supervisors and support users see open, in-progress, and resolved issues in one place instead of relying only on calls or messages.',

    'support ticket':
      'A support ticket is a structured request for help. In SOS, the ticket records the issue category, priority, subject, concern, contact person, page URL, user, company, branch, and attachments. ' +
      'This makes support faster because the team receives the context needed to diagnose the issue.',

    'help desk':
      'Help Desk is the support process behind SOS. It keeps user issues organized, gives each request a ticket number, and helps the support team prioritize urgent business blockers.',

    'ఎస్ ఓ ఎస్':
      'SOS అనేది ERP support help system. Application లో issue report చేయడానికి, support request పంపడానికి, లేదా screen లో problem ఉంటే support team కి details తో ticket create చేయడానికి దీనిని వాడాలి. ' +
      'Ticket లో category, priority, subject, description, contact details, page URL, user details, company, branch, screenshots లేదా files capture అవుతాయి. ' +
      'దీంతో support team issue ను త్వరగా understand చేసి track చేయగలదు.',

    'సపోర్ట్ టికెట్':
      'Support ticket అనేది help request ను structured గా record చేసే పద్ధతి. SOS ticket లో issue category, priority, subject, concern, user details, page URL, and attachments ఉంటాయి. ' +
      'దీని వల్ల calls లేదా messages మీద ఆధారపడకుండా support work organized గా track అవుతుంది.',

    'payment voucher':
      'Payment Voucher records every outgoing payment made by the company, by cheque, cash, NEFT, or UPI. ' +
      'It captures the party name, amount, payment mode, bank account, and narration. ' +
      'Every payment must have a corresponding payment voucher for proper accounting.',

    'general receipt':
      'General Receipt records all incoming payments received from parties. ' +
      'It captures the party name, amount, receipt date, payment mode, and bank details. ' +
      'Every collection of money, whether cash or bank, must be entered here.',

    'receipt cheque':
      'When a receipt is created with payment mode cheque, the cheque is treated as received but not yet deposited. ' +
      'The next step is to go to Cheques On Hand. From there, verify the received cheque details and move or deposit it to the bank. ' +
      'After deposit, it will be tracked under Cheques In Bank until the bank clears or returns it.',

    'receipt by cheque':
      'When a user completes a receipt by cheque, ask them to go to Cheques On Hand next. ' +
      'That screen is used to review received cheques before depositing them. After depositing, the cheque moves to Cheques In Bank for clearance tracking.',

    'cheque receipt flow':
      'For cheque receipt flow: first enter the General Receipt with payment mode cheque, then open Cheques On Hand to manage the received cheque, ' +
      'then deposit it to the bank. Once deposited, follow its clearing or return status from Cheques In Bank.',

    'journal voucher':
      'Journal Voucher records accounting entries that are neither receipts nor payments, ' +
      'such as adjustments, provisions, accruals, or transfers between accounts. ' +
      'Every journal voucher must have equal total debit and total credit amounts to keep the books balanced.',

    'cash book':
      'Cash Book records all cash receipts and cash payments in chronological order. ' +
      'It shows the opening cash balance, all cash transactions for the period, and the closing balance.',

    'bank book':
      'Bank Book records all bank receipts and bank payments for a specific bank account. ' +
      'It helps you track the running bank balance and is used to reconcile your records with the bank statement.',

    'day book':
      'Day Book is a complete chronological list of every financial transaction recorded in the system for a selected period. ' +
      'It includes all receipts, payments, and journal entries across all accounts.',

    'brs':
      'Bank Reconciliation Statement, or BRS, compares your bank book balance with the actual bank statement balance. ' +
      'Differences arise from cheques issued but not yet cleared, deposits not yet credited, or bank charges. ' +
      'BRS is performed monthly to ensure your books match the bank.',

    'bank reconciliation':
      'Bank Reconciliation Statement compares your internal bank book with the actual bank statement to identify and explain any differences. ' +
      'Common differences include uncleared cheques, pending deposits, and bank charges not yet recorded.',

    'brs statements':
      'BRS Statements shows a detailed reconciliation report listing all uncleared cheques and outstanding deposits separately.',

    'cheques on hand':
      'Cheques On Hand shows all cheques received from parties that are physically held by you and have not yet been deposited into the bank. ' +
      'Once you deposit a cheque, it moves to Cheques In Bank status.',

    'cheques in bank':
      'Cheques In Bank shows cheques that have been deposited in the bank but whose funds have not yet been credited. ' +
      'Once the bank clears the cheque, the amount is reflected in the bank account balance.',

    'cheques issued':
      'Cheques Issued shows all cheques given to parties as payment. ' +
      'Each cheque has a status: pending means not yet presented to the bank, cleared means the bank has paid it, ' +
      'returned means it bounced, and cancelled means it was voided.',

    'petty cash':
      'Petty Cash manages small day-to-day cash expenses that are too minor to go through the main payment voucher. ' +
      'A fixed float is given to a custodian, expenses are recorded against it, and it is replenished periodically.',

    'gst report':
      'GST Report generates tax data required for filing Goods and Services Tax returns. ' +
      'It summarises all GST collected on sales and GST paid on purchases during the period, categorised by tax rate.',

    'tds report':
      'TDS Report shows all Tax Deducted at Source transactions for the selected period. ' +
      'It lists the payments on which TDS was deducted, the TDS amount, the party, and the applicable section.',

    'tds journal voucher':
      'TDS Journal Voucher is used to record TDS liability entries in the books. ' +
      'When TDS is deducted, a journal entry is created debiting the expense account and crediting the TDS payable account.',

    'ledger extract':
      'Ledger Extract allows you to pull detailed transaction data for a specific account and period and export it as a file. ' +
      'It is useful for sharing account data with auditors or for detailed offline analysis.',

    'comparison tb':
      'Comparison Trial Balance lets you place account balances from two different periods side by side. ' +
      'It highlights the change in each account balance, making it easy to spot unusual variances or trends.',

    'jv list':
      'JV List shows all journal vouchers created for the selected period. ' +
      'You can review, filter, and verify individual journal entries and their posting details from this screen.',

    'cheque enquiry':
      'Cheque Enquiry lets you search for any cheque by number, date, amount, or party name and view its complete transaction history and current status.',

    'schedule tb':
      'Schedule Trial Balance organises the standard trial balance into financial statement schedules, ' +
      'grouping accounts under assets, liabilities, income, and expenses for easy interpretation.',

    'bank configuration':
      'Bank Configuration is where you register your bank accounts in the system. ' +
      'You define the bank name, account number, branch, IFSC code, and the opening balance of each account.',

    'cheque management':
      'Cheque Management is where you configure cheque book details including the cheque number range and the linked bank account, ' +
      'so the system can automatically assign cheque numbers during payment.',

    'bank entries':
      'Bank Entries report shows all transactions posted to a bank account for a selected period, ' +
      'useful for cross-checking entries before bank reconciliation.',

    'payroll':
      'Payroll is the process of calculating and disbursing employee salaries each month. ' +
      'The system applies earnings, allowances, and deductions like PF, ESI, and TDS to arrive at the net take-home pay.',

    'payslip':
      'Payslip is a document issued to each employee each month showing gross earnings, all deductions, and the net amount paid. ' +
      'Employees use it for loan applications, income tax filing, and as proof of income.',

    'employee attendance':
      'Employee Attendance records the daily presence or absence of employees. ' +
      'It is used as the basis for salary calculation and leave management.',

    'salary statement':
      'Salary Statement is a summary report showing each employee\'s salary components, deductions, and net pay for a selected month.',

    'pf statement':
      'PF Statement shows Provident Fund contributions made by both employee and employer for each month, ' +
      'used for PF returns filing and employee queries about their retirement savings.',

    'esi statement':
      'ESI Statement shows Employee State Insurance contributions deducted from salaries, ' +
      'required for monthly ESI returns and for availing medical benefits.',

    // ── Fields and Concepts ───────────────────────────────────────────────────

    'ledger':
      'A Ledger is an individual account in the accounting system that records all financial transactions of a specific nature. ' +
      'For example, a Bank ledger holds all bank transactions, and a Salary ledger holds all salary payments. ' +
      'Every transaction must be posted to at least two ledgers, one debit and one credit.',

    'ledger field':
      'The Ledger field is used to select which account a transaction should be posted to. ' +
      'Type part of the ledger name to search and select it. ' +
      'In reports, the ledger field filters data to show only transactions for the chosen account.',

    'sub ledger':
      'Sub Ledger is a detailed breakdown within a main ledger. ' +
      'For example, under a Sundry Debtors ledger, each individual customer is a sub ledger entry. ' +
      'It helps track amounts owed by or to specific parties.',

    'party':
      'Party refers to any customer, vendor, employee, or external entity involved in a transaction. ' +
      'The Party field identifies who you received money from or made a payment to.',

    'debit':
      'Debit is one side of every accounting entry. It increases asset and expense accounts and decreases liability, equity, and income accounts. ' +
      'When money comes into your bank account, the bank account is debited.',

    'credit':
      'Credit is the other side of every accounting entry. It increases liability, equity, and income accounts and decreases asset accounts. ' +
      'When you make a payment from your bank, the bank account is credited.',

    'narration':
      'Narration is the description you enter on a transaction to explain its purpose. ' +
      'A clear narration makes it easy to understand a transaction during audit or review months later.',

    'opening balance':
      'Opening Balance is the account balance at the start of the selected reporting period. ' +
      'It represents the cumulative effect of all transactions recorded before the period begins.',

    'closing balance':
      'Closing Balance is the account balance at the end of the selected period. ' +
      'It equals the opening balance adjusted for all debits and credits during the period.',

    'tds':
      'TDS stands for Tax Deducted at Source. It is a tax mechanism where the payer deducts a percentage of the payment as tax ' +
      'and deposits it with the government, before releasing the balance to the recipient.',

    'gst':
      'GST stands for Goods and Services Tax. It is an indirect tax on the supply of goods and services. ' +
      'The net GST payable to the government is the difference between GST collected from customers and GST paid to suppliers.',

    'bank balance':
      'Bank Balance shows the current balance in a bank account as per your books. ' +
      'It may differ from the actual bank statement balance due to uncleared cheques, which is why monthly BRS is important.',

    'payment mode':
      'Payment Mode indicates how a payment was made, by cheque, cash, NEFT, RTGS, or UPI. ' +
      'Selecting the correct mode ensures the transaction is posted to the right bank or cash account.',

    'transaction mode':
      'Transaction Mode is the method used for a payment or receipt, such as cheque, cash, NEFT, RTGS, IMPS, or UPI. ' +
      'It determines which account is debited or credited in the background.',

    'voucher number':
      'Voucher Number is the unique system-generated identifier assigned to each transaction entry. ' +
      'It is used for audit trails, cross-referencing between reports, and locating a specific transaction.',

    'as on date':
      'As On Date mode shows account balances as of one specific date rather than a date range. ' +
      'Use it when you need to know the exact financial position of accounts at a particular point in time.',

    'pf':
      'PF stands for Provident Fund. It is a retirement savings scheme where both employee and employer contribute a fixed percentage of basic salary each month.',

    'esi':
      'ESI stands for Employee State Insurance. It is a social security scheme providing medical and financial benefits to employees. ' +
      'Both employee and employer contribute a small percentage of wages monthly.',

    'salary':
      'Salary is the fixed monthly compensation paid to an employee. ' +
      'It consists of earnings like basic, HRA, and allowances, minus deductions like PF, ESI, and TDS. ' +
      'The net salary is what is actually paid to the employee.',
  };

  constructor(
    private navigationService: NavigationService,
    private router: Router,
    private ngZone: NgZone,
    private elementRef: ElementRef<HTMLElement>
  ) {}

  ngOnInit(): void {
    this.commands = this.buildCommands();
    this.setupRecognition();
  }

  ngOnDestroy(): void {
    this.keepListening = false;
    this.stopListening();
    this.clearRecognitionRestartTimer();
    this.clearSynthWatchdog();
    window.speechSynthesis?.cancel();
  }

  toggle(): void {
    this.open.update(v => !v);
    if (!this.open()) this.stopListeningCompletely();
  }

  close(): void {
    this.speak('Goodbye.');
    setTimeout(() => {
      this.open.set(false);
      this.stopListeningCompletely();
    }, 800);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.open()) return;

    const target = event.target as Node | null;
    if (target && this.elementRef.nativeElement.contains(target)) return;

    this.closeSilently();
  }

  private closeSilently(): void {
    this.open.set(false);
    this.stopListeningCompletely();
    this.reply.set('');
    this.matchedLabel.set('');
    window.speechSynthesis?.cancel();
    this.speaking.set(false);
    this.clearSynthWatchdog();
  }

  startListening(): void {
    if (!this.recognition) {
      this.supported.set(false);
      this.status.set('Voice is unavailable');
      this.open.set(true);
      return;
    }

    this.keepListening = true;
    this.open.set(true);
    this.transcript.set('');
    this.matchedLabel.set('');
    this.reply.set('');
    this.status.set('Listening');
    this.listening.set(true);

    this.startRecognitionSafely();
  }

  stopListening(): void {
    this.clearRecognitionRestartTimer();
    if (this.recognition && this.listening()) this.recognition.stop();
    this.listening.set(false);
  }

  /** Full stop — disables auto-restart too */
  private stopListeningCompletely(): void {
    this.keepListening = false;
    this.stopListening();
  }

  /** Auto-restart recognition (called after TTS ends or after onend with keepListening) */
  private restartListening(): void {
    if (!this.keepListening || !this.recognition || this.speaking()) return;

    this.transcript.set('');
    this.status.set('Listening');
    this.listening.set(true);

    this.startRecognitionSafely();
  }

  private startRecognitionSafely(): void {
    this.clearRecognitionRestartTimer();
    try {
      this.recognition.start();
    } catch {
      this.recognitionRestartTimer = setTimeout(() => this.restartListening(), 350);
    }
  }

  private clearRecognitionRestartTimer(): void {
    if (this.recognitionRestartTimer !== null) {
      clearTimeout(this.recognitionRestartTimer);
      this.recognitionRestartTimer = null;
    }
  }

  // ── Speech Synthesis ────────────────────────────────────────────────────────

  private speak(text: string): void {
    if (!window.speechSynthesis) return;

    // Stop mic while speaking to prevent TTS audio feeding back into recognition
    if (this.recognition && this.listening()) {
      this.recognition.stop();
      this.listening.set(false);
    }

    window.speechSynthesis.cancel();
    this.clearSynthWatchdog();

    const utterance  = new SpeechSynthesisUtterance(text);
    utterance.lang   = 'en-IN';
    utterance.rate   = 1.0;
    utterance.pitch  = 1.0;
    utterance.volume = 1.0;

    this.reply.set(text);
    this.speaking.set(true);

    utterance.onend = () => this.ngZone.run(() => {
      this.speaking.set(false);
      this.clearSynthWatchdog();
      // Restart mic after a short pause so TTS echo doesn't get captured
      setTimeout(() => this.restartListening(), 400);
    });

    utterance.onerror = () => this.ngZone.run(() => {
      this.speaking.set(false);
      this.clearSynthWatchdog();
      setTimeout(() => this.restartListening(), 400);
    });

    // Chrome bug: TTS silently fails without a small delay
    // Also Chrome pauses synthesis when tab is backgrounded — watchdog calls resume() periodically
    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
      this.synthResumeTimer = setInterval(() => {
        if (window.speechSynthesis.paused) window.speechSynthesis.resume();
      }, 5000);
    }, 50);
  }

  private clearSynthWatchdog(): void {
    if (this.synthResumeTimer !== null) {
      clearInterval(this.synthResumeTimer);
      this.synthResumeTimer = null;
    }
  }

  // ── Recognition Setup ───────────────────────────────────────────────────────

  private setupRecognition(): void {
    const win = window as any;
    const SpeechRecognition: SpeechRecognitionCtor | undefined =
      win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      this.supported.set(false);
      this.status.set('Voice is unavailable');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang            = 'en-IN';
    this.recognition.continuous      = true;
    this.recognition.interimResults  = true;
    this.recognition.maxAlternatives = 5;

    // All callbacks fire outside Angular's zone — ngZone.run() required for
    // router.navigate, signals, and change detection to work correctly.
    this.recognition.onresult = (event: any) => {
      this.ngZone.run(() => {
        const result = event.results?.[event.resultIndex] || event.results?.[event.results.length - 1];
        const spoken = Array.from(result || [])
          .map((item: any) => item?.transcript || '')
          .filter(Boolean)[0] || '';

        this.transcript.set(spoken);
        if (result?.isFinal) this.handleCommand(spoken);
      });
    };

    this.recognition.onerror = (event: any) => {
      this.ngZone.run(() => {
        this.listening.set(false);
        if (event?.error === 'not-allowed') {
          this.keepListening = false;
          this.status.set('Microphone blocked');
        } else if (event?.error === 'no-speech') {
          this.status.set('Listening');            // stay in listening state on silence
          setTimeout(() => this.restartListening(), 200);
        } else {
          this.status.set('Not recognized');
          setTimeout(() => this.restartListening(), 300);
        }
      });
    };

    this.recognition.onend = () => {
      this.ngZone.run(() => {
        this.listening.set(false);
        // Auto-restart if keepListening and TTS is not currently speaking
        if (this.keepListening && !this.speaking()) {
          setTimeout(() => this.restartListening(), 200);
        } else if (this.status() === 'Listening') {
          this.status.set('Ready');
        }
      });
    };
  }

  // ── Command Dispatch ────────────────────────────────────────────────────────

  private handleCommand(spoken: string): void {
    const normalizedSpoken = this.normalizeText(spoken);

    if (!normalizedSpoken) {
      this.status.set('Not recognized');
      return;
    }

    const wakeCommand = this.extractWakeCommand(normalizedSpoken);

    if (wakeCommand === null) {
      const directCommand = this.normalizeCommand(normalizedSpoken);
      if (!directCommand) {
        this.status.set('Say a command');
        this.matchedLabel.set('');
        return;
      }

      this.dispatchCommand(directCommand);
      return;
    }

    const command = this.normalizeCommand(wakeCommand);

    if (!command) {
      this.status.set('Command required');
      this.matchedLabel.set('');
      return;
    }

    this.dispatchCommand(command);
  }

  private dispatchCommand(command: string): void {
    // Close
    if (this.matchesAny(command, ['close voice', 'stop voice', 'close assistant', 'goodbye', 'bye', 'stop', 'మూసివేయి', 'మూసేయి', 'ఆపు'])) {
      this.close();
      return;
    }

    const dependencyTopic = this.extractDependencyTopic(command);
    if (dependencyTopic !== null) {
      this.handleDependency(dependencyTopic);
      return;
    }

    // Explanation mode — "what is X", "explain X", "how to use X"
    const explainTopic = this.extractExplanationTopic(command);
    if (explainTopic !== null) {
      this.handleExplanation(explainTopic);
      return;
    }

    // Navigation mode
    const target = this.findBestTarget(command);

    if (!target) {
      this.status.set('No matching screen');
      this.matchedLabel.set('');
      this.speak('Not found.');
      return;
    }

    this.navigateToTarget(target);
  }

  // ── Dependencies ────────────────────────────────────────────────────────────

  private extractDependencyTopic(command: string): string | null {
    if (
      (command.includes('receipt') || command.includes('రసీదు')) &&
      (command.includes('cheque') || command.includes('చెక్')) &&
      (command.includes('dependency') || command.includes('related') || command.includes('screen') || command.includes('flow'))
    ) {
      return 'receipt cheque';
    }

    for (const trigger of this.dependencyTriggers) {
      const norm = this.normalizeText(trigger);
      if (command.startsWith(`${norm} `)) {
        return command.slice(norm.length).trim();
      }
      if (command.includes(` ${norm} `)) {
        return command.replace(norm, '').trim();
      }
    }

    return null;
  }

  private handleDependency(topic: string): void {
    const dependency = this.findDependency(topic);

    if (dependency) {
      this.status.set('Related screens');
      this.matchedLabel.set(topic);
      this.speak(dependency);
    } else {
      this.status.set('No dependency info');
      this.matchedLabel.set('');
      this.speak('Sorry, I do not have dependency screen information about ' + topic + '. Please try another screen name.');
    }
  }

  private findDependency(topic: string): string | null {
    const normalizedTopic = this.normalizeCommand(topic);
    if (!normalizedTopic) return null;
    if (this.screenDependencies[normalizedTopic]) return this.screenDependencies[normalizedTopic];

    let bestKey: string | null = null;
    let bestScore = 0;

    for (const key of Object.keys(this.screenDependencies)) {
      const keyNorm = this.normalizeText(key);
      const teluguAliases = this.teluguAliasesFor(keyNorm);
      const score = Math.max(
        this.scoreAlias(normalizedTopic, keyNorm),
        this.scoreAlias(keyNorm, normalizedTopic),
        ...teluguAliases.map(alias => Math.max(
          this.scoreAlias(normalizedTopic, alias),
          this.scoreAlias(alias, normalizedTopic)
        ))
      );

      if (score > bestScore && score >= 60) {
        bestScore = score;
        bestKey = key;
      }
    }

    return bestKey ? this.screenDependencies[bestKey] : null;
  }

  // ── Explanation ─────────────────────────────────────────────────────────────

  private extractExplanationTopic(command: string): string | null {
    if (
      (command.includes('receipt') || command.includes('రసీదు')) &&
      (command.includes('cheque') || command.includes('చెక్')) &&
      (command.includes('what next') || command.includes('next') || command.includes('after') || command.includes('తర్వాత') || command.includes('తరువాత'))
    ) {
      return 'receipt cheque';
    }

    for (const trigger of this.explanationTriggers) {
      const norm = this.normalizeText(trigger);
      if (command.startsWith(`${norm} `)) {
        return command.slice(norm.length).trim();
      }
      if (command.includes(` ${norm} `)) {
        return command.replace(norm, '').trim();
      }
    }
    return null;
  }

  private handleExplanation(topic: string): void {
    const explanation = this.findExplanation(topic);

    if (explanation) {
      this.status.set('Explaining');
      this.matchedLabel.set(topic);
      this.speak(explanation);
    } else {
      this.status.set('No info found');
      this.matchedLabel.set('');
      this.speak('Sorry, I do not have information about ' + topic + '. Please try rephrasing.');
    }
  }

  private findExplanation(topic: string): string | null {
    if (!topic) return null;
    if (this.explanations[topic]) return this.explanations[topic];

    let bestKey: string | null = null;
    let bestScore = 0;

    for (const key of Object.keys(this.explanations)) {
      const keyNorm = this.normalizeText(key);
      const teluguAliases = this.teluguAliasesFor(keyNorm);
      const score   = Math.max(
        this.scoreAlias(topic, keyNorm),
        this.scoreAlias(keyNorm, topic),
        ...teluguAliases.map(alias => Math.max(
          this.scoreAlias(topic, alias),
          this.scoreAlias(alias, topic)
        ))
      );
      if (score > bestScore && score >= 65) {
        bestScore = score;
        bestKey   = key;
      }
    }

    return bestKey ? this.explanations[bestKey] : null;
  }

  // ── Navigation ──────────────────────────────────────────────────────────────

  private extractWakeCommand(command: string): string | null {
    for (const wakePhrase of this.wakePhrases) {
      const normalized = this.normalizeText(wakePhrase);
      if (command === normalized) return '';
      if (command.startsWith(`${normalized} `)) return command.slice(normalized.length).trim();
    }
    return null;
  }

  private navigateToTarget(target: VoiceCommandTarget): void {
    if (target.module)    this.navigationService.selectModule(target.module);
    if (target.subModule) this.navigationService.selectSubModule(target.subModule);
    if (target.screen)    this.navigationService.selectScreen(target.screen);

    this.matchedLabel.set(target.label);
    this.status.set('Opening');
    this.speak('Opening ' + target.label);

    if (!target.route) { this.status.set('Opened'); return; }

    this.router.navigate([target.route]).then(() => this.status.set('Opened'));
  }

  // ── Command Matching ────────────────────────────────────────────────────────

  private findBestTarget(command: string): VoiceCommandTarget | null {
    let best: { target: VoiceCommandTarget; score: number } | null = null;

    for (const target of this.commands) {
      const score = Math.max(...target.aliases.map(alias => this.scoreAlias(command, alias)));
      if (score > 0 && (!best || score > best.score)) best = { target, score };
    }

    return best && best.score >= 70 ? best.target : null;
  }

  private scoreAlias(command: string, alias: string): number {
    if (!alias) return 0;
    if (command === alias) return 100;
    if (command.includes(alias)) return 96;
    if (alias.includes(command) && command.length >= 4) return 88;

    const commandWords = new Set(command.split(' ').filter(Boolean));
    const aliasWords   = alias.split(' ').filter(Boolean);
    const matched      = aliasWords.filter(w => commandWords.has(w)).length;

    return aliasWords.length ? Math.round((matched / aliasWords.length) * 82) : 0;
  }

  // ── Command Builder ─────────────────────────────────────────────────────────

  private buildCommands(): VoiceCommandTarget[] {
    const commands: VoiceCommandTarget[] = [
      {
        label: 'Contacts',
        route: '/dashboard/contacts',
        aliases: this.aliasesFor('Contacts', 'contact', 'contacts', 'కాంటాక్ట్స్', 'సంప్రదింపులు')
      },
      {
        label: 'SOS Dashboard',
        route: '/dashboard/sos-dashboard',
        aliases: this.aliasesFor(
          'SOS Dashboard',
          'sos',
          'sos help',
          'sos support',
          'sos ticket',
          'support ticket',
          'support dashboard',
          'help desk',
          'open sos',
          'raise sos',
          'create sos',
          'ఎస్ ఓ ఎస్',
          'సపోర్ట్',
          'సపోర్ట్ టికెట్',
          'ఎస్ ఓ ఎస్ తెరువు',
          'సపోర్ట్ తెరువు'
        )
      }
    ];

    for (const module of this.navigationService.getModules()) {
      const firstScreen = this.findFirstScreen(module);

      commands.push({
        label: `${module.name} Module`,
        route: firstScreen?.screen.route,
        module,
        subModule: firstScreen?.subModule,
        screen:    firstScreen?.screen,
        aliases: this.aliasesFor(module.name, `${module.name} module`, `${module.id} module`)
      });

      for (const subModule of module.subModules) {
        const firstSubScreen = subModule.screens[0];

        commands.push({
          label: subModule.name,
          route: firstSubScreen?.route,
          module,
          subModule,
          screen: firstSubScreen,
          aliases: this.aliasesFor(
            subModule.name,
            subModule.id,
            `${module.name} ${subModule.name}`,
            `${subModule.name} module`
          )
        });

        for (const screen of subModule.screens) {
          commands.push({
            label: screen.name.trim(),
            route: screen.route,
            module,
            subModule,
            screen,
            aliases: this.aliasesFor(screen.name, screen.id, `${subModule.name} ${screen.name}`)
          });
        }
      }
    }

    return commands;
  }

  private findFirstScreen(module: Module): { subModule: SubModule; screen: Screen } | null {
    for (const subModule of module.subModules) {
      const screen = subModule.screens[0];
      if (screen) return { subModule, screen };
    }
    return null;
  }

  // ── Text Utilities ──────────────────────────────────────────────────────────

  private aliasesFor(...values: string[]): string[] {
    const prefixes = ['', 'open ', 'go to ', 'show ', 'navigate to ', 'take me to '];
    const teluguPrefixes = ['', 'తెరువు ', 'ఓపెన్ ', 'చూపించు ', 'వెళ్ళు ', 'కి వెళ్ళు '];
    const aliases  = new Set<string>();

    for (const value of values) {
      const normalized = this.normalizeText(value);
      if (!normalized) continue;

      aliases.add(normalized);
      aliases.add(normalized.replace(/\bview\b/g, '').trim());
      aliases.add(normalized.replace(/\bconfiguration\b/g, 'config').trim());

      if (normalized.includes('cheque on hand')) {
        aliases.add('cheque in hand');
        aliases.add('received cheque');
        aliases.add('receipt cheque');
      }

      for (const prefix of prefixes) {
        aliases.add(this.normalizeText(`${prefix}${normalized}`));
      }

      for (const teluguAlias of this.teluguAliasesFor(normalized)) {
        aliases.add(teluguAlias);
        for (const prefix of teluguPrefixes) {
          aliases.add(this.normalizeText(`${prefix}${teluguAlias}`));
        }
      }
    }

    return Array.from(aliases).filter(Boolean);
  }

  private teluguAliasesFor(normalized: string): string[] {
    const aliasMap: Record<string, string[]> = {
      'accounts': ['అకౌంట్స్', 'ఖాతాలు'],
      'config': ['కాన్ఫిగ్', 'సెట్టింగ్స్'],
      'transactions': ['ట్రాన్సాక్షన్స్', 'లావాదేవీలు'],
      'reports': ['రిపోర్ట్స్', 'నివేదికలు'],
      'bank configuration': ['బ్యాంక్ కాన్ఫిగరేషన్', 'బ్యాంక్ సెట్టింగ్'],
      'cheque management': ['చెక్ మేనేజ్‌మెంట్', 'చెక్కుల నిర్వహణ'],
      'general receipt': ['జనరల్ రసీదు', 'సాధారణ రసీదు'],
      'payment voucher': ['పేమెంట్ వౌచర్', 'చెల్లింపు వౌచర్'],
      'journal voucher': ['జర్నల్ వౌచర్'],
      'cheques on hand': ['చెక్కులు చేతిలో', 'చెక్ ఆన్ హ్యాండ్', 'చెక్కులు ఆన్ హ్యాండ్'],
      'cheques in bank': ['బ్యాంకులో చెక్కులు', 'చెక్ ఇన్ బ్యాంక్'],
      'cheques issued': ['ఇష్యూ చేసిన చెక్కులు', 'జారీ చేసిన చెక్కులు'],
      'petty cash': ['పెట్టి క్యాష్', 'చిన్న నగదు'],
      'tds journal voucher': ['టీడీఎస్ జర్నల్ వౌచర్'],
      'account ledger': ['అకౌంట్ లెడ్జర్', 'ఖాతా లెడ్జర్'],
      'cash book': ['క్యాష్ బుక్', 'నగదు పుస్తకం'],
      'bank book': ['బ్యాంక్ బుక్'],
      'day book': ['డే బుక్', 'రోజు పుస్తకం'],
      'jv list': ['జేవీ లిస్ట్', 'జర్నల్ వౌచర్ లిస్ట్'],
      'brs': ['బీఆర్ఎస్', 'బ్యాంక్ రీకన్సిలియేషన్'],
      'schedule tb': ['షెడ్యూల్ టీబీ'],
      'brs statements': ['బీఆర్ఎస్ స్టేట్‌మెంట్స్'],
      'account summary': ['అకౌంట్ సమ్మరీ', 'ఖాతా సారాంశం'],
      'trial balance': ['ట్రయల్ బ్యాలెన్స్'],
      'comparison tb': ['కంపారిజన్ టీబీ', 'పోలిక టీబీ'],
      'cheque cancel': ['చెక్ క్యాన్సల్', 'చెక్ రద్దు'],
      'cheque return': ['చెక్ రిటర్న్', 'చెక్ తిరిగి వచ్చింది'],
      'issued cheque': ['ఇష్యూడ్ చెక్', 'జారీ చెక్'],
      'cheque enquiry': ['చెక్ ఎంక్వైరీ', 'చెక్ విచారణ'],
      'gst report': ['జీఎస్టీ రిపోర్ట్'],
      'tds report': ['టీడీఎస్ రిపోర్ట్'],
      'bank entries': ['బ్యాంక్ ఎంట్రీలు'],
      'ledger extract': ['లెడ్జర్ ఎక్స్‌ట్రాక్ట్'],
      'sos dashboard': ['ఎస్ ఓ ఎస్ డాష్‌బోర్డ్', 'సపోర్ట్ డాష్‌బోర్డ్'],
      'contacts': ['కాంటాక్ట్స్', 'సంప్రదింపులు']
    };

    return aliasMap[normalized] || [];
  }

  private matchesAny(command: string, aliases: string[]): boolean {
    return aliases.some(alias => command.includes(this.normalizeText(alias)));
  }

  private normalizeCommand(value: string): string {
    return this.normalizeText(value)
      .replace(/\b(please|kindly|screen|form|page|menu)\b/g, ' ')
      .replace(/\b(దయచేసి|స్క్రీన్|ఫారం|పేజీ|మెనూ)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private normalizeText(value: string): string {
    return (value || '')
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .replace(/\bconfigurations\b/g, 'configuration')
      .replace(/\breceipts\b/g, 'receipt')
      .replace(/\bvouchers\b/g, 'voucher')
      .replace(/\bcheques\b/g, 'cheque')
      .replace(/\bchecks\b/g, 'cheque')
      .replace(/\bcheck\b/g, 'cheque')
      .replace(/\bchq\b/g, 'cheque')
      .replace(/\bచెక్కులు\b/g, 'చెక్')
      .replace(/\bచెక్కు\b/g, 'చెక్')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
