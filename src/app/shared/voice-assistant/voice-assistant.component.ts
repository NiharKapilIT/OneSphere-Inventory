import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
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
  readonly open = signal(false);
  readonly listening = signal(false);
  readonly transcript = signal('');
  readonly status = signal('Ready');
  readonly matchedLabel = signal('');
  readonly supported = signal(true);

  private recognition: any;
  private commands: VoiceCommandTarget[] = [];
  private readonly wakePhrases = ['hey kapil'];

  constructor(
    private navigationService: NavigationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.commands = this.buildCommands();
    this.setupRecognition();
  }

  ngOnDestroy(): void {
    this.stopListening();
  }

  toggle(): void {
    this.open.update(value => !value);

    if (!this.open()) {
      this.stopListening();
    }
  }

  close(): void {
    this.open.set(false);
    this.stopListening();
  }

  startListening(): void {
    if (!this.recognition) {
      this.supported.set(false);
      this.status.set('Voice is unavailable');
      this.open.set(true);
      return;
    }

    this.open.set(true);
    this.transcript.set('');
    this.matchedLabel.set('');
    this.status.set('Listening');
    this.listening.set(true);

    try {
      this.recognition.start();
    } catch {
      this.status.set('Listening');
    }
  }

  stopListening(): void {
    if (this.recognition && this.listening()) {
      this.recognition.stop();
    }

    this.listening.set(false);
  }

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
    this.recognition.lang = 'en-IN';
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.maxAlternatives = 3;

    this.recognition.onresult = (event: any) => {
      const spoken = Array.from(event.results?.[0] || [])
        .map((item: any) => item?.transcript || '')
        .filter(Boolean)[0] || '';

      this.transcript.set(spoken);
      this.handleCommand(spoken);
    };

    this.recognition.onerror = (event: any) => {
      this.listening.set(false);
      this.status.set(event?.error === 'not-allowed' ? 'Microphone blocked' : 'Not recognized');
    };

    this.recognition.onend = () => {
      this.listening.set(false);
      if (this.status() === 'Listening') {
        this.status.set('Ready');
      }
    };
  }

  private handleCommand(spoken: string): void {
    const normalizedSpoken = this.normalizeText(spoken);

    if (!normalizedSpoken) {
      this.status.set('Not recognized');
      return;
    }

    const wakeCommand = this.extractWakeCommand(normalizedSpoken);

    if (wakeCommand === null) {
      this.status.set('Say "Hey Kapil" first');
      this.matchedLabel.set('');
      return;
    }

    const command = this.normalizeCommand(wakeCommand);

    if (!command) {
      this.status.set('Command required');
      this.matchedLabel.set('');
      return;
    }

    if (this.matchesAny(command, ['close voice', 'stop voice', 'close assistant'])) {
      this.close();
      return;
    }

    const target = this.findBestTarget(command);

    if (!target) {
      this.status.set('No matching form');
      this.matchedLabel.set('');
      return;
    }

    this.navigateToTarget(target);
  }

  private extractWakeCommand(command: string): string | null {
    for (const wakePhrase of this.wakePhrases) {
      if (command === wakePhrase) {
        return '';
      }

      if (command.startsWith(`${wakePhrase} `)) {
        return command.slice(wakePhrase.length).trim();
      }
    }

    return null;
  }

  private navigateToTarget(target: VoiceCommandTarget): void {
    if (target.module) {
      this.navigationService.selectModule(target.module);
    }

    if (target.subModule) {
      this.navigationService.selectSubModule(target.subModule);
    }

    if (target.screen) {
      this.navigationService.selectScreen(target.screen);
    }

    this.matchedLabel.set(target.label);
    this.status.set('Opening');

    if (!target.route) {
      this.status.set('Opened');
      return;
    }

    this.router.navigate([target.route]).then(() => this.status.set('Opened'));
  }

  private findBestTarget(command: string): VoiceCommandTarget | null {
    let best: { target: VoiceCommandTarget; score: number } | null = null;

    for (const target of this.commands) {
      const score = Math.max(...target.aliases.map(alias => this.scoreAlias(command, alias)));

      if (score > 0 && (!best || score > best.score)) {
        best = { target, score };
      }
    }

    return best && best.score >= 70 ? best.target : null;
  }

  private scoreAlias(command: string, alias: string): number {
    if (!alias) return 0;
    if (command === alias) return 100;
    if (command.includes(alias)) return 96;
    if (alias.includes(command) && command.length >= 4) return 88;

    const commandWords = new Set(command.split(' ').filter(Boolean));
    const aliasWords = alias.split(' ').filter(Boolean);
    const matchedWords = aliasWords.filter(word => commandWords.has(word)).length;

    return aliasWords.length ? Math.round((matchedWords / aliasWords.length) * 82) : 0;
  }

  private buildCommands(): VoiceCommandTarget[] {
    const commands: VoiceCommandTarget[] = [
      {
        label: 'Contacts',
        route: '/dashboard/contacts',
        aliases: this.aliasesFor('Contacts', 'contact', 'contacts')
      },
      {
        label: 'SOS Dashboard',
        route: '/dashboard/sos-dashboard',
        aliases: this.aliasesFor('SOS Dashboard', 'sos', 'support dashboard', 'help desk')
      }
    ];

    for (const module of this.navigationService.getModules()) {
      const firstModuleScreen = this.findFirstScreen(module);

      commands.push({
        label: `${module.name} Module`,
        route: firstModuleScreen?.screen.route,
        module,
        subModule: firstModuleScreen?.subModule,
        screen: firstModuleScreen?.screen,
        aliases: this.aliasesFor(module.name, `${module.name} module`, `${module.id} module`)
      });

      for (const subModule of module.subModules) {
        const firstSubModuleScreen = subModule.screens[0];

        commands.push({
          label: subModule.name,
          route: firstSubModuleScreen?.route,
          module,
          subModule,
          screen: firstSubModuleScreen,
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
      if (screen) {
        return { subModule, screen };
      }
    }

    return null;
  }

  private aliasesFor(...values: string[]): string[] {
    const prefixes = ['', 'open ', 'go to ', 'show ', 'navigate to ', 'take me to '];
    const aliases = new Set<string>();

    for (const value of values) {
      const normalized = this.normalizeText(value);
      if (!normalized) continue;

      aliases.add(normalized);
      aliases.add(normalized.replace(/\bview\b/g, '').trim());
      aliases.add(normalized.replace(/\bconfiguration\b/g, 'config').trim());

      for (const prefix of prefixes) {
        aliases.add(this.normalizeText(`${prefix}${normalized}`));
      }
    }

    return Array.from(aliases).filter(Boolean);
  }

  private matchesAny(command: string, aliases: string[]): boolean {
    return aliases.some(alias => command.includes(this.normalizeText(alias)));
  }

  private normalizeCommand(value: string): string {
    return this.normalizeText(value)
      .replace(/\b(please|kindly|screen|form|page|menu)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private normalizeText(value: string): string {
    return (value || '')
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\bconfigurations\b/g, 'configuration')
      .replace(/\breceipts\b/g, 'receipt')
      .replace(/\bvouchers\b/g, 'voucher')
      .replace(/\scheques\s/g, ' cheque ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
