class EnterpriseCliService {
  getCommandDefinitions() {
    return [
      this.getInstallCommand(),
      this.getUpgradeCommand(),
      this.getMigrateCommand(),
      this.getBackupCommand(),
      this.getRestoreCommand(),
      this.getDiagnosticsCommand(),
      this.getOptimizeCommand(),
      this.getVerifyCommand(),
      this.getLicenseCommand(),
      this.getTenantCommand(),
    ];
  }

  getCommand(name) {
    const commands = this.getCommandDefinitions();
    return commands.find(c => c.name === name || c.alias === name) || null;
  }

  generateCommandDocs() {
    const commands = this.getCommandDefinitions();
    let docs = '# CLI Command Reference\n\n';
    for (const cmd of commands) {
      docs += `## ${cmd.name}\n\n`;
      docs += `${cmd.description}\n\n`;
      docs += `**Usage:** \`${cmd.usage}\`\n\n`;
      docs += `**Category:** ${cmd.category}\n\n`;
      if (cmd.alias) docs += `**Alias:** \`${cmd.alias}\`\n\n`;
      if (cmd.args.length > 0) {
        docs += '### Arguments\n\n| Name | Type | Required | Description |\n|------|------|----------|-------------|\n';
        for (const arg of cmd.args) {
          docs += `| ${arg.name} | ${arg.type} | ${arg.required ? 'Yes' : 'No'} | ${arg.description} |\n`;
        }
        docs += '\n';
      }
      if (cmd.flags.length > 0) {
        docs += '### Flags\n\n| Name | Type | Default | Description |\n|------|------|---------|-------------|\n';
        for (const flag of cmd.flags) {
          docs += `| ${flag.name} | ${flag.type} | ${flag.default || '-'} | ${flag.description} |\n`;
        }
        docs += '\n';
      }
      if (cmd.examples.length > 0) {
        docs += '### Examples\n\n';
        for (const ex of cmd.examples) {
          docs += `- **${ex.description}:** \`${ex.command}\`\n`;
        }
        docs += '\n';
      }
    }
    return docs;
  }

  getInstallCommand() {
    return {
      name: 'install',
      description: 'Install an extension from the marketplace',
      usage: 'mve install <extension-code> [--version <ver>] [--tenant <id>] [--no-deps]',
      args: [{ name: 'extension-code', type: 'string', required: true, description: 'Unique code of the extension to install' }],
      flags: [
        { name: 'version', type: 'string', description: 'Specific version to install (defaults to latest)', default: 'latest' },
        { name: 'tenant', type: 'string', description: 'Target tenant ID', default: undefined },
        { name: 'no-deps', type: 'boolean', description: 'Skip dependency installation', default: false },
        { name: 'dry-run', type: 'boolean', description: 'Simulate installation without changes', default: false },
      ],
      examples: [
        { description: 'Install extension', command: 'mve install data-analyzer' },
        { description: 'Install specific version', command: 'mve install data-analyzer --version 2.1.0' },
        { description: 'Dry run installation', command: 'mve install data-analyzer --dry-run' },
      ],
      category: 'marketplace',
      alias: 'i',
    };
  }

  getUpgradeCommand() {
    return {
      name: 'upgrade',
      description: 'Upgrade an installed extension to a newer version',
      usage: 'mve upgrade <extension-code> [--version <ver>] [--force] [--backup]',
      args: [{ name: 'extension-code', type: 'string', required: true, description: 'Code of the extension to upgrade' }],
      flags: [
        { name: 'version', type: 'string', description: 'Target version to upgrade to', default: 'latest' },
        { name: 'force', type: 'boolean', description: 'Force upgrade even if incompatible', default: false },
        { name: 'backup', type: 'boolean', description: 'Create backup before upgrading', default: true },
        { name: 'dry-run', type: 'boolean', description: 'Simulate upgrade without changes', default: false },
      ],
      examples: [
        { description: 'Upgrade to latest', command: 'mve upgrade data-analyzer' },
        { description: 'Upgrade to specific version', command: 'mve upgrade data-analyzer --version 3.0.0' },
      ],
      category: 'marketplace',
      alias: 'up',
    };
  }

  getMigrateCommand() {
    return {
      name: 'migrate',
      description: 'Migrate the system or extensions to a new version',
      usage: 'mve migrate [--from <ver>] [--to <ver>] [--dry-run] [--force]',
      args: [],
      flags: [
        { name: 'from', type: 'string', description: 'Source version', default: undefined },
        { name: 'to', type: 'string', description: 'Target version', default: 'latest' },
        { name: 'dry-run', type: 'boolean', description: 'Simulate migration without changes', default: false },
        { name: 'force', type: 'boolean', description: 'Skip compatibility checks', default: false },
        { name: 'extension', type: 'string', description: 'Migrate specific extension only', default: undefined },
      ],
      examples: [
        { description: 'Migrate to latest version', command: 'mve migrate --from 3.0.0 --to 4.0.0' },
        { description: 'Dry run migration', command: 'mve migrate --from 3.0.0 --to 4.0.0 --dry-run' },
      ],
      category: 'marketplace',
      alias: 'mg',
    };
  }

  getBackupCommand() {
    return {
      name: 'backup',
      description: 'Create a system or extension backup',
      usage: 'mve backup [--type full|config|data|extensions] [--output <path>] [--include-logs]',
      args: [],
      flags: [
        { name: 'type', type: 'string', description: 'Backup type (full/config/data/extensions)', default: 'full' },
        { name: 'output', type: 'string', description: 'Output path for backup file', default: './backups' },
        { name: 'include-logs', type: 'boolean', description: 'Include system logs in backup', default: false },
        { name: 'compress', type: 'boolean', description: 'Compress backup archive', default: true },
      ],
      examples: [
        { description: 'Create full backup', command: 'mve backup' },
        { description: 'Backup only extension data', command: 'mve backup --type extensions' },
      ],
      category: 'marketplace',
      alias: 'b',
    };
  }

  getRestoreCommand() {
    return {
      name: 'restore',
      description: 'Restore from a previously created backup',
      usage: 'mve restore <backup-path> [--verify] [--partial] [--skip-extensions]',
      args: [{ name: 'backup-path', type: 'string', required: true, description: 'Path to the backup file' }],
      flags: [
        { name: 'verify', type: 'boolean', description: 'Verify backup integrity before restoring', default: true },
        { name: 'partial', type: 'boolean', description: 'Restore specific components only', default: false },
        { name: 'skip-extensions', type: 'boolean', description: 'Skip restoring extensions', default: false },
        { name: 'dry-run', type: 'boolean', description: 'Simulate restore without changes', default: false },
      ],
      examples: [
        { description: 'Restore from backup', command: 'mve restore ./backups/mve-backup-2024-01-01.tar.gz' },
        { description: 'Verify and restore', command: 'mve restore ./backups/latest.tar.gz --verify' },
      ],
      category: 'marketplace',
      alias: 'r',
    };
  }

  getDiagnosticsCommand() {
    return {
      name: 'diagnostics',
      description: 'Run diagnostics and collect system information',
      usage: 'mve diagnostics [--type system|performance|security|all] [--output <format>] [--save]',
      args: [],
      flags: [
        { name: 'type', type: 'string', description: 'Diagnostic type', default: 'all' },
        { name: 'output', type: 'string', description: 'Output format (json/yaml/text)', default: 'text' },
        { name: 'save', type: 'boolean', description: 'Save diagnostic results to file', default: false },
        { name: 'verbose', type: 'boolean', description: 'Show detailed diagnostic information', default: false },
      ],
      examples: [
        { description: 'Run full diagnostics', command: 'mve diagnostics' },
        { description: 'Save diagnostics as JSON', command: 'mve diagnostics --output json --save' },
      ],
      category: 'marketplace',
      alias: 'diag',
    };
  }

  getOptimizeCommand() {
    return {
      name: 'optimize',
      description: 'Optimize system performance and configuration',
      usage: 'mve optimize [--target database|cache|storage|all] [--aggressive] [--analyze-only]',
      args: [],
      flags: [
        { name: 'target', type: 'string', description: 'Optimization target', default: 'all' },
        { name: 'aggressive', type: 'boolean', description: 'Apply aggressive optimizations', default: false },
        { name: 'analyze-only', type: 'boolean', description: 'Only analyze, do not apply changes', default: false },
        { name: 'schedule', type: 'string', description: 'Schedule recurring optimization', default: undefined },
      ],
      examples: [
        { description: 'Run all optimizations', command: 'mve optimize' },
        { description: 'Analyze only', command: 'mve optimize --analyze-only' },
      ],
      category: 'marketplace',
      alias: 'opt',
    };
  }

  getVerifyCommand() {
    return {
      name: 'verify',
      description: 'Verify system integrity and extension compatibility',
      usage: 'mve verify [--checksum] [--integrity] [--extensions] [--all]',
      args: [],
      flags: [
        { name: 'checksum', type: 'boolean', description: 'Verify file checksums', default: false },
        { name: 'integrity', type: 'boolean', description: 'Verify database integrity', default: false },
        { name: 'extensions', type: 'boolean', description: 'Verify extension compatibility', default: false },
        { name: 'all', type: 'boolean', description: 'Run all verification checks', default: true },
      ],
      examples: [
        { description: 'Full system verification', command: 'mve verify --all' },
        { description: 'Verify extensions only', command: 'mve verify --extensions' },
      ],
      category: 'marketplace',
      alias: 'v',
    };
  }

  getLicenseCommand() {
    return {
      name: 'license',
      description: 'Manage enterprise licenses and activations',
      usage: 'mve license <action> [--key <key>] [--tenant <id>] [--edition <ed>] [--list]',
      args: [{ name: 'action', type: 'string', required: true, description: 'Action: activate, deactivate, validate, info, list' }],
      flags: [
        { name: 'key', type: 'string', description: 'License key', default: undefined },
        { name: 'tenant', type: 'string', description: 'Tenant ID', default: undefined },
        { name: 'edition', type: 'string', description: 'Product edition', default: undefined },
        { name: 'list', type: 'boolean', description: 'List all licenses', default: false },
      ],
      examples: [
        { description: 'Activate license', command: 'mve license activate --key XXXX-XXXX-XXXX' },
        { description: 'Validate license', command: 'mve license validate --key XXXX-XXXX-XXXX' },
        { description: 'List all licenses', command: 'mve license list' },
      ],
      category: 'marketplace',
      alias: 'lic',
    };
  }

  getTenantCommand() {
    return {
      name: 'tenant',
      description: 'Manage multi-tenant configurations',
      usage: 'mve tenant <action> [--id <id>] [--name <name>] [--domain <domain>] [--config <json>]',
      args: [{ name: 'action', type: 'string', required: true, description: 'Action: create, update, delete, list, info, switch' }],
      flags: [
        { name: 'id', type: 'string', description: 'Tenant ID', default: undefined },
        { name: 'name', type: 'string', description: 'Tenant name', default: undefined },
        { name: 'domain', type: 'string', description: 'Custom domain', default: undefined },
        { name: 'config', type: 'string', description: 'JSON configuration string', default: undefined },
        { name: 'edition', type: 'string', description: 'Tenant edition', default: undefined },
      ],
      examples: [
        { description: 'List tenants', command: 'mve tenant list' },
        { description: 'Create tenant', command: 'mve tenant create --name "Acme Corp" --domain acme.example.com' },
        { description: 'Switch active tenant', command: 'mve tenant switch --id tnt_abc123' },
      ],
      category: 'marketplace',
      alias: 't',
    };
  }

  validateCommand(command, args = {}) {
    const cmd = typeof command === 'string' ? this.getCommand(command) : command;
    if (!cmd) return { valid: false, errors: ['Command not found'] };
    const errors = [];
    for (const argDef of cmd.args || []) {
      if (argDef.required && (args[argDef.name] === undefined || args[argDef.name] === null || args[argDef.name] === '')) {
        errors.push(`Missing required argument: ${argDef.name}`);
      }
    }
    return { valid: errors.length === 0, errors, command: cmd.name };
  }

  getHelpText(command) {
    const cmd = typeof command === 'string' ? this.getCommand(command) : command;
    if (!cmd) return 'Command not found';
    let help = `\n  ${cmd.name}`;
    if (cmd.alias) help += ` (${cmd.alias})`;
    help += `\n  ${cmd.description}\n\n`;
    help += `  Usage: ${cmd.usage}\n\n`;
    if (cmd.args.length > 0) {
      help += '  Arguments:\n';
      for (const arg of cmd.args) {
        help += `    ${arg.name} (${arg.type})${arg.required ? ' [required]' : ''} - ${arg.description}\n`;
      }
      help += '\n';
    }
    if (cmd.flags.length > 0) {
      help += '  Flags:\n';
      for (const flag of cmd.flags) {
        help += `    --${flag.name} (${flag.type})${flag.default !== undefined ? ` [default: ${flag.default}]` : ''} - ${flag.description}\n`;
      }
      help += '\n';
    }
    if (cmd.examples.length > 0) {
      help += '  Examples:\n';
      for (const ex of cmd.examples) {
        help += `    # ${ex.description}\n    ${ex.command}\n`;
      }
    }
    return help;
  }
}

export const enterpriseCliService = new EnterpriseCliService();
