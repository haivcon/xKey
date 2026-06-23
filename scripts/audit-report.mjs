import { exec } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

exec('npm audit --omit=dev --json', { windowsHide: true, maxBuffer: 20 * 1024 * 1024 }, async (error, stdout, stderr) => {
  const code = typeof error?.code === 'number' ? error.code : 0;
  const fallbackReport = {
    auditReportVersion: 2,
    reportOnly: true,
    generatedAt: new Date().toISOString(),
    npmAuditExitCode: code,
    error: stderr.trim() || null,
  };

  const report = stdout.trim() || `${JSON.stringify(fallbackReport, null, 2)}\n`;
  await writeFile('audit-report.json', report.endsWith('\n') ? report : `${report}\n`);

  if (code && code !== 0) {
    console.log(`npm audit reported issues with exit code ${code}. Report saved to audit-report.json.`);
  } else {
    console.log('npm audit report saved to audit-report.json.');
  }

  process.exit(0);
});
