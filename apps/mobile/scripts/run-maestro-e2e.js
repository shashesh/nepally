const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

function getMaestroCommand() {
  const localMaestro = path.join(process.env.USERPROFILE || '', '.maestro', 'bin', 'maestro.bat');

  const pathCheck = spawnSync('maestro', ['--version'], {
    stdio: 'ignore',
    shell: true,
  });

  if (pathCheck.status === 0) {
    return 'maestro';
  }

  if (fs.existsSync(localMaestro)) {
    const localCheck = spawnSync(localMaestro, ['--version'], {
      stdio: 'ignore',
      shell: true,
    });
    if (localCheck.status === 0) {
      return localMaestro;
    }
  }

  return null;
}

const maestroCommand = getMaestroCommand();

if (!maestroCommand) {
  console.warn('Maestro CLI is not installed. Skipping mobile e2e tests.');
  process.exit(0);
}

const result = spawnSync(maestroCommand, ['test', '.maestro/flows/'], {
  stdio: 'inherit',
  shell: true,
});

process.exit(result.status ?? 1);