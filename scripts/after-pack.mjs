import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

/**
 * Ad-hoc sign the .app bundle on macOS so Gatekeeper doesn't show "damaged" error.
 * Users will still need to right-click → Open or xattr -cr to bypass the
 * "unidentified developer" warning, but the app will actually launch.
 */
export default async function (context) {
  if (context.electronPlatformName !== 'darwin') return;

  const appDir = join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  if (!existsSync(appDir)) {
    console.log(`after-pack: app not found at ${appDir}, skipping sign`);
    return;
  }

  console.log(`after-pack: ad-hoc signing ${appDir}`);
  execSync(`codesign --sign - --force --deep "${appDir}"`, {
    stdio: 'inherit',
  });
  console.log('after-pack: ad-hoc signing complete');
}
